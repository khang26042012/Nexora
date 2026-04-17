import { Router, type Request, type Response } from "express";
import { insertToolLog } from "../lib/admin-db.js";

const router = Router();

const GEMINI_API_KEY    = process.env.GEMINI_API_KEY ?? "";
const MODEL             = "gemma-4-26b-a4b-it";
const THINKING_BUDGET   = 8192;

const COMPLEX_KEYWORDS = [
  "thinking", "think step",
  "viết code", "lập trình", "thuật toán", "algorithm", "debug",
  "giải thích chi tiết", "phân tích sâu", "chứng minh", "tính toán",
  "giải phương trình", "implement", "so sánh chi tiết", "ưu nhược điểm",
  "tại sao lại", "cách hoạt động",
];

function needsThinking(msg: string): boolean {
  if (!msg) return false;
  const lower = msg.toLowerCase();
  if (COMPLEX_KEYWORDS.some(k => lower.includes(k))) return true;
  if (msg.length > 300) return true;
  return false;
}

router.post("/chat", async (req: Request, res: Response) => {
  const { system_instruction, contents, generationConfig } = req.body as {
    system_instruction?: { parts: { text: string }[] };
    contents: { role: string; parts: { text?: string }[] }[];
    generationConfig?: { temperature?: number; maxOutputTokens?: number };
  };

  const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? req.ip ?? "unknown";
  const lastUserMsg = Array.isArray(contents)
    ? contents.filter(c => c.role === "user").at(-1)?.parts?.map(p => p.text ?? "").join("") ?? ""
    : "";
  insertToolLog({ ip, tool: "chat", action: "message", detail: lastUserMsg.slice(0, 500) });

  const thinkingMode  = needsThinking(lastUserMsg);
  const GEMINI_URL    = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  if (thinkingMode) {
    res.write(`data: ${JSON.stringify({ type: "thinking", active: true })}\n\n`);
  }

  try {
    const upstream = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction,
        contents,
        generationConfig: {
          temperature: generationConfig?.temperature ?? 0.7,
          maxOutputTokens: generationConfig?.maxOutputTokens ?? 8192,
          thinking_config: { thinking_budget: thinkingMode ? THINKING_BUDGET : 0 },
        },
      }),
    });

    if (!upstream.ok) {
      const errData = await upstream.json().catch(() => ({})) as { error?: { message?: string } };
      res.write(`data: ${JSON.stringify({ error: errData?.error?.message ?? `HTTP ${upstream.status}` })}\n\n`);
      res.end();
      return;
    }

    const reader = upstream.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let thinkingDone = false;

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
          const parsed = JSON.parse(raw);
          const parts: { thought?: boolean; text?: string }[] =
            parsed?.candidates?.[0]?.content?.parts ?? [];

          const hasThought = parts.some(p => p.thought === true);
          const textParts  = parts.filter(p => !p.thought && p.text);
          const hasText    = textParts.length > 0;

          // Pure thinking chunk — skip entirely
          if (hasThought && !hasText) continue;

          // First real text chunk after thinking → notify frontend
          if (thinkingMode && !thinkingDone && hasText) {
            thinkingDone = true;
            res.write(`data: ${JSON.stringify({ type: "thinking", active: false })}\n\n`);
          }

          if (hasText) {
            // Forward only text parts (strip thought parts)
            const cleaned = {
              ...parsed,
              candidates: [{
                ...parsed.candidates[0],
                content: { ...parsed.candidates[0].content, parts: textParts },
              }],
            };
            res.write(`data: ${JSON.stringify(cleaned)}\n\n`);
          } else {
            res.write(`data: ${raw}\n\n`);
          }
        } catch {
          res.write(`data: ${raw}\n\n`);
        }
      }
    }

    res.end();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
    res.end();
  }
});

export default router;
