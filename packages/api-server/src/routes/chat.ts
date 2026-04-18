import { Router, type Request, type Response } from "express";
import { insertToolLog } from "../lib/admin-db.js";
import { streamAI, type AIMessage } from "../lib/ai-client.js";

const router = Router();

function isComplexQuestion(messages: AIMessage[]): boolean {
  const lastUser = [...messages].reverse().find(m => m.role === "user");
  if (!lastUser) return false;
  const text = typeof lastUser.content === "string"
    ? lastUser.content
    : (lastUser.content as { text?: string }[]).map(p => p.text ?? "").join(" ");
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

function trimMessages(msgs: AIMessage[], maxChars = 14000): AIMessage[] {
  let total = 0;
  const result: AIMessage[] = [];
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i];
    const len = typeof m.content === "string"
      ? m.content.length
      : (m.content as { text?: string }[]).map(p => p.text ?? "").join("").length;
    if (total + len > maxChars && result.length > 0) break;
    result.unshift(m);
    total += len;
  }
  return result;
}

router.post("/chat", async (req: Request, res: Response) => {
  const { messages, system } = req.body as { messages: AIMessage[]; system?: string };

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages array required" });
    return;
  }

  const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? req.ip ?? "unknown";
  const lastUser = [...messages].reverse().find(m => m.role === "user");
  const lastUserText = typeof lastUser?.content === "string"
    ? lastUser.content
    : (lastUser?.content as { text?: string }[] ?? []).map(p => p.text ?? "").join("");
  insertToolLog({ ip, tool: "chat", action: "message", detail: lastUserText.slice(0, 500) });

  const thinking = isComplexQuestion(messages);
  const sysContent = system ? (thinking ? system + THINKING_SUFFIX : system) : undefined;

  const allMessages: AIMessage[] = [
    ...(sysContent ? [{ role: "system" as const, content: sysContent }] : []),
    ...trimMessages(messages),
  ];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  if (thinking) res.write(`data: ${JSON.stringify({ type: "thinking", active: true })}\n\n`);

  try {
    let inThinkTag = false;
    let thinkingEmitted = thinking;

    for await (const chunk of streamAI(allMessages, { temperature: 0.7, maxTokens: 4000 })) {
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
        if (after) res.write(`data: ${JSON.stringify({ text: after })}\n\n`);
        continue;
      }
      if (!inThinkTag) {
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      }
    }

    if (thinking || thinkingEmitted) {
      res.write(`data: ${JSON.stringify({ type: "thinking", active: false })}\n\n`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
  }

  res.end();
});

export default router;
