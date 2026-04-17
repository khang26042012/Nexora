import { Router, type Request, type Response } from "express";
import { insertToolLog } from "../lib/admin-db.js";

const router = Router();

// GitHub Models — GPT-5 (free via GitHub token)
// Endpoint: https://models.inference.ai.azure.com
// Rate limit (GitHub Free): 1 RPM, 8 req/day, 4000 in/4000 out tokens
const GITHUB_TOKEN   = process.env.GITHUB_TOKEN ?? "";
const GITHUB_MODEL   = "gpt-5";
const GITHUB_URL     = "https://models.inference.ai.azure.com/chat/completions";

type OpenAIMessage = {
  role: "system" | "user" | "assistant";
  content: string | { type: string; text?: string; image_url?: { url: string } }[];
};

function isComplexQuestion(messages: OpenAIMessage[]): boolean {
  const lastUser = [...messages].reverse().find(m => m.role === "user");
  if (!lastUser) return false;
  const text = typeof lastUser.content === "string"
    ? lastUser.content
    : lastUser.content.map(p => ("text" in p ? p.text ?? "" : "")).join(" ");
  const lower = text.toLowerCase();

  if (lower.includes("thinking")) return true;
  if (text.length > 300) return true;

  const complexKw = [
    "giải thích chi tiết", "phân tích", "so sánh", "tại sao lại", "chứng minh",
    "lập trình", "code", "thuật toán", "toán học", "đạo hàm", "tích phân",
    "explain", "analyze", "compare", "algorithm", "implement", "debug", "prove",
    "why does", "how does", "step by step", "từng bước",
  ];
  return complexKw.some(k => lower.includes(k));
}

const THINKING_SUFFIX = `

KHI CÂU HỎI PHỨC TẠP hoặc người dùng gõ từ "thinking":
Bắt đầu câu trả lời bằng thẻ <think>...</think> để trình bày quá trình suy nghĩ, rồi mới đưa ra câu trả lời chính thức bên ngoài thẻ đó.
Format: <think>\n[lý luận nội tâm]\n</think>\n[câu trả lời]`;

router.post("/chat", async (req: Request, res: Response) => {
  const { messages, system } = req.body as {
    messages: OpenAIMessage[];
    system?: string;
  };

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages array required" });
    return;
  }

  if (!GITHUB_TOKEN) {
    res.status(500).json({ error: "GITHUB_TOKEN chưa được cấu hình" });
    return;
  }

  const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? req.ip ?? "unknown";
  const lastUser = [...messages].reverse().find(m => m.role === "user");
  const lastUserText = typeof lastUser?.content === "string"
    ? lastUser.content
    : (lastUser?.content ?? []).map((p: { text?: string }) => p.text ?? "").join("");
  insertToolLog({ ip, tool: "chat", action: "message", detail: lastUserText.slice(0, 500) });

  const thinking = isComplexQuestion(messages);

  const sysContent = system
    ? (thinking ? system + THINKING_SUFFIX : system)
    : undefined;

  // GitHub Models GPT-5: 4000 input tokens max (~16000 chars)
  function trimMessages(msgs: OpenAIMessage[], maxChars = 14000): OpenAIMessage[] {
    let total = 0;
    const result: OpenAIMessage[] = [];
    for (let i = msgs.length - 1; i >= 0; i--) {
      const m = msgs[i];
      const len = typeof m.content === "string"
        ? m.content.length
        : m.content.map(p => ("text" in p ? p.text ?? "" : "")).join("").length;
      if (total + len > maxChars && result.length > 0) break;
      result.unshift(m);
      total += len;
    }
    return result;
  }

  const trimmed = trimMessages(messages);

  const allMessages: OpenAIMessage[] = [
    ...(sysContent ? [{ role: "system" as const, content: sysContent }] : []),
    ...trimmed,
  ];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  if (thinking) {
    res.write(`data: ${JSON.stringify({ type: "thinking", active: true })}\n\n`);
  }

  try {
    const upstream = await fetch(GITHUB_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GITHUB_TOKEN}`,
      },
      body: JSON.stringify({
        model: GITHUB_MODEL,
        stream: true,
        temperature: 0.7,
        max_tokens: 4000,
        messages: allMessages,
      }),
    });

    if (!upstream.ok) {
      const errData = await upstream.json().catch(() => ({})) as { message?: string; error?: { message?: string } };
      const errMsg = errData?.message ?? errData?.error?.message ?? `HTTP ${upstream.status}`;
      res.write(`data: ${JSON.stringify({ error: errMsg })}\n\n`);
      res.end();
      return;
    }

    const reader = upstream.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let inThinkTag = false;
    let thinkingEmitted = thinking;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (!raw || raw === "[DONE]") continue;

        try {
          const parsed = JSON.parse(raw) as {
            choices?: { delta?: { content?: string }; finish_reason?: string }[];
          };
          const chunk = parsed?.choices?.[0]?.delta?.content ?? "";
          if (!chunk) continue;

          if (chunk.includes("<think>")) {
            inThinkTag = true;
            if (!thinkingEmitted) {
              res.write(`data: ${JSON.stringify({ type: "thinking", active: true })}\n\n`);
              thinkingEmitted = true;
            }
          }
          if (chunk.includes("</think>")) {
            inThinkTag = false;
            res.write(`data: ${JSON.stringify({ type: "thinking", active: false })}\n\n`);
            const after = chunk.split("</think>").slice(1).join("</think>");
            if (after) {
              res.write(`data: ${JSON.stringify({ text: after })}\n\n`);
            }
            continue;
          }

          if (!inThinkTag) {
            res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
          }
        } catch {
          // skip malformed chunks
        }
      }
    }

    if (thinking || thinkingEmitted) {
      res.write(`data: ${JSON.stringify({ type: "thinking", active: false })}\n\n`);
    }
    res.end();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
    res.end();
  }
});

export default router;
