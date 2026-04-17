import { Router, type Request, type Response } from "express";
import { insertToolLog } from "../lib/admin-db.js";

const router = Router();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
const GEMINI_MODEL   = "gemini-2.0-flash";
const GEMINI_URL     = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;

const SYSTEM = `Bạn là gia sư toán học chuyên nghiệp. Giải bài toán người dùng cung cấp theo từng bước rõ ràng.

CẤU TRÚC OUTPUT:
1. **Phân tích đề** — xác định loại bài toán, dữ kiện, yêu cầu
2. **Lời giải từng bước** — đánh số từng bước (Bước 1, Bước 2...), giải thích tại sao làm bước đó
3. **Kết quả** — ghi rõ đáp án cuối cùng, đóng khung bằng "---"
4. **Kiểm tra** — kiểm chứng lại kết quả (nếu có thể)
5. **Lưu ý** — công thức liên quan hoặc mẹo ghi nhớ (ngắn gọn)

QUY TẮC:
- Viết bằng Tiếng Việt
- Dùng ký hiệu toán học rõ ràng (ví dụ: x² thay vì x^2 nếu đơn giản)
- **Bold** đáp số cuối
- Giải thích từng bước như dạy học sinh cấp 3
- Nếu bài có nhiều cách giải, ghi cách phổ biến nhất trước
- Bắt đầu ngay với Phân tích đề, không preamble`;

router.post("/math-solve", async (req: Request, res: Response) => {
  const { text = "", image = "" } = req.body as Record<string, string>;
  if (!text.trim() && !image) { res.status(400).json({ error: "Không có đề bài" }); return; }

  const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? req.ip ?? "unknown";
  insertToolLog({ ip, tool: "math-solver", action: image ? "image" : "text", detail: text.slice(0, 300) });

  if (!GEMINI_API_KEY) { res.status(500).json({ error: "GEMINI_API_KEY chưa được set" }); return; }

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const parts: object[] = [];
  if (text.trim()) parts.push({ text: `Đề bài: ${text}` });
  if (image) {
    const [meta, data] = image.split(",");
    const mimeType = meta.match(/:(.*?);/)?.[1] ?? "image/jpeg";
    parts.push({ inlineData: { mimeType, data } });
    if (!text.trim()) parts.push({ text: "Giải bài toán trong ảnh." });
  }

  const payload = {
    system_instruction: { parts: [{ text: SYSTEM }] },
    contents: [{ role: "user", parts }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
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
        const t: string = JSON.parse(raw)?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        if (t) res.write(`data: ${JSON.stringify({ text: t })}\n\n`);
      } catch { /* skip */ }
    }
  }
  res.write("data: [DONE]\n\n"); res.end();
});

export default router;
