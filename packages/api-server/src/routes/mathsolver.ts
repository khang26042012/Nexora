import { Router, type Request, type Response } from "express";
import { insertToolLog } from "../lib/admin-db.js";
import { streamAI } from "../lib/ai-client.js";

const router = Router();

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

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  type Part = { type: string; text?: string; image_url?: { url: string } };
  const userContent: Part[] = [];
  if (image) userContent.push({ type: "image_url", image_url: { url: image } });
  userContent.push({ type: "text", text: text.trim() ? `Đề bài: ${text}` : "Giải bài toán trong ảnh." });

  try {
    for await (const chunk of streamAI([
      { role: "system", content: SYSTEM },
      { role: "user", content: userContent as never },
    ], { temperature: 0.3, maxTokens: 4096 })) {
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    }
  } catch (err: unknown) {
    res.write(`data: ${JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" })}\n\n`);
  }
  res.write("data: [DONE]\n\n");
  res.end();
});

export default router;
