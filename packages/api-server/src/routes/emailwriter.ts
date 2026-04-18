import { Router, type Request, type Response } from "express";
import { insertToolLog } from "../lib/admin-db.js";

const router = Router();

const ZUKI_API_KEY = process.env.ZUKI_API_KEY ?? "";
const ZUKI_MODEL   = "claude-3.7-sonnet";
const ZUKI_URL     = "https://api.zukijourney.com/v1/chat/completions";

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
    const upstream = await fetch(ZUKI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ZUKI_API_KEY}` },
      body: JSON.stringify({
        model: ZUKI_MODEL,
        stream: true,
        temperature: 0.7,
        max_tokens: 2048,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
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
