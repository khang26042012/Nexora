import { Router, type Request, type Response } from "express";
import { insertToolLog } from "../lib/admin-db.js";

const router = Router();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
const GEMINI_MODEL   = "gemini-2.5-flash";
const GEMINI_URL     = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;

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

  if (!GEMINI_API_KEY) { res.status(500).json({ error: "GEMINI_API_KEY chưa được set" }); return; }

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const payload = {
    system_instruction: { parts: [{ text: buildPrompt(length, lang) }] },
    contents: [{ role: "user", parts: [{ text }] }],
    generationConfig: { temperature: 0.5, maxOutputTokens: 2048 },
  };

  const gemRes = await fetch(GEMINI_URL, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  });

  if (!gemRes.ok || !gemRes.body) {
    res.write(`data: ${JSON.stringify({ error: `Gemini ${gemRes.status}` })}\n\n`); res.end(); return;
  }

  const reader = gemRes.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split("\n")) {
      if (!line.startsWith("data:")) continue;
      const raw = line.slice(5).trim();
      if (raw === "[DONE]") continue;
      try {
        const json = JSON.parse(raw);
        const t: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        if (t) res.write(`data: ${JSON.stringify({ text: t })}\n\n`);
      } catch { /* skip */ }
    }
  }
  res.write("data: [DONE]\n\n"); res.end();
});

export default router;
