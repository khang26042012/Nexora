import { Router, type Request, type Response } from "express";
import { insertToolLog } from "../lib/admin-db.js";
import { streamAI } from "../lib/ai-client.js";

const router = Router();

const SYSTEM = `Bạn là chuyên gia viết email chuyên nghiệp. Nhiệm vụ: viết email hoàn chỉnh từ ý tưởng/ghi chú ngắn của người dùng.

QUY TẮC QUAN TRỌNG:
- Chỉ xuất ra nội dung email (Subject + Body) — không giải thích, không preamble
- Subject line phải ngắn gọn, rõ ràng, hấp dẫn
- Body email phải tự nhiên, phù hợp tone và mục đích
- Kết thúc bằng lời chào phù hợp
- Nếu người dùng yêu cầu tiếng Việt → viết tiếng Việt; tiếng Anh → viết tiếng Anh

FORMAT OUTPUT (bắt buộc):
**Subject:** [dòng tiêu đề]

[nội dung email — có xuống dòng, đoạn văn rõ ràng]

[Lời chào kết + tên/chữ ký placeholder]

TONE GUIDELINES:
- formal (trang trọng): kính ngữ, câu dài, lịch sự cao
- professional (chuyên nghiệp): rõ ràng, súc tích, tự tin  
- friendly (thân thiện): ấm áp, gần gũi, có thể dùng emoji nhẹ
- casual (thường ngày): tự nhiên như nói chuyện
- urgent (khẩn cấp): ngắn gọn, nhấn mạnh deadline/tầm quan trọng`;

const TYPE_HINTS: Record<string, string> = {
  request: "Email yêu cầu/đề xuất",
  complaint: "Email phản ánh/khiếu nại (lịch sự nhưng rõ vấn đề)",
  thankyou: "Email cảm ơn (chân thành, cụ thể)",
  followup: "Email nhắc nhở/follow-up (không áp lực)",
  introduction: "Email giới thiệu bản thân/sản phẩm/dịch vụ",
  apology: "Email xin lỗi (thành thật, có giải pháp)",
  invitation: "Email mời (rõ thông tin, hấp dẫn)",
  other: "Email chung",
};

router.post("/email-write", async (req: Request, res: Response) => {
  const { idea = "", tone = "professional", lang = "vi", type = "other", recipient = "" } = req.body as Record<string, string>;
  if (!idea.trim()) { res.status(400).json({ error: "Vui lòng nhập nội dung cần viết" }); return; }

  const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? req.ip ?? "unknown";
  insertToolLog({ ip, tool: "email-writer", action: `${tone}|${type}|${lang}`, detail: idea.slice(0, 200) });

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const typeHint = TYPE_HINTS[type] ?? "Email";
  const recipientNote = recipient.trim() ? `Người nhận: ${recipient}\n` : "";
  const langNote = lang === "vi" ? "Viết bằng tiếng Việt.\n" : "Write in English.\n";
  const userPrompt = `${langNote}Loại email: ${typeHint}\nTone: ${tone}\n${recipientNote}\nNội dung/ý tưởng:\n${idea}`;

  try {
    for await (const chunk of streamAI([
      { role: "system", content: SYSTEM },
      { role: "user", content: userPrompt },
    ], { temperature: 0.7, maxTokens: 2048 })) {
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    }
  } catch (err: unknown) {
    res.write(`data: ${JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" })}\n\n`);
  }
  res.write("data: [DONE]\n\n");
  res.end();
});

export default router;
