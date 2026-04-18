import { Router, type Request, type Response } from "express";
import { insertToolLog } from "../lib/admin-db.js";
import { streamAI } from "../lib/ai-client.js";

const router = Router();

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
    for await (const chunk of streamAI([
      { role: "system", content: buildPrompt(length, lang) },
      { role: "user", content: text },
    ], { temperature: 0.5, maxTokens: 2048 })) {
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    }
  } catch (err: unknown) {
    res.write(`data: ${JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" })}\n\n`);
  }
  res.write("data: [DONE]\n\n");
  res.end();
});

export default router;
