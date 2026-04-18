import { Router, type Request, type Response } from "express";
import { insertToolLog } from "../lib/admin-db.js";

const router = Router();

const ZUKI_API_KEY = process.env.ZUKI_API_KEY ?? "";
const ZUKI_MODEL   = "claude-3.7-sonnet";
const ZUKI_URL     = "https://api.zukijourney.com/v1/chat/completions";

function buildPrompt(length: string, lang: string): string {
  const langOut = lang === "en" ? "English" : "Tiếng Việt";
  const lengthGuide = length === "short"
    ? "3-5 câu ngắn gọn, chỉ ý chính"
    : length === "long"
    ? "chi tiết đầy đủ, các điểm chính, điểm phụ, kết luận"
    : "1-2 đoạn ngắn, đủ ý chính";

  return `Bạn là chuyên gia tóm tắt văn bản. Nhiệm vụ: đọc văn bản người dùng cung cấp và tóm tắt.

QUY TẮC:
- Tóm tắt ${lengthGuide}
- Viết bằng ${langOut}
- Giữ đúng ý nghĩa gốc, không thêm thông tin không có trong văn bản
- Dùng **bold** cho các điểm quan trọng
- Bắt đầu ngay với nội dung tóm tắt, không preamble
- Cuối cùng thêm dòng "---" rồi ghi "Từ khoá: [3-5 từ khoá chính]"`;
}

router.post("/summarize", async (req: Request, res: Response) => {
  const { text = "", length = "medium", lang = "vi" } = req.body as Record<string, string>;
  if (!text.trim()) { res.status(400).json({ error: "Không có văn bản" }); return; }

  const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? req.ip ?? "unknown";
  insertToolLog({ ip, tool: "summarizer", action: length, detail: text.slice(0, 300) });

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const upstream = await fetch(ZUKI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ZUKI_API_KEY}` },
      body: JSON.stringify({
        model: ZUKI_MODEL,
        stream: true,
        temperature: 0.5,
        max_tokens: 2048,
        messages: [
          { role: "system", content: buildPrompt(length, lang) },
          { role: "user", content: text },
        ],
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const err = await upstream.json().catch(() => ({})) as { error?: { message?: string } };
      res.write(`data: ${JSON.stringify({ error: err?.error?.message ?? `HTTP ${upstream.status}` })}\n\n`);
      res.end(); return;
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
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
          const chunk = (JSON.parse(raw) as { choices?: { delta?: { content?: string } }[] })?.choices?.[0]?.delta?.content ?? "";
          if (chunk) res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
        } catch { /* skip */ }
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
  }

  res.write("data: [DONE]\n\n");
  res.end();
});

export default router;
