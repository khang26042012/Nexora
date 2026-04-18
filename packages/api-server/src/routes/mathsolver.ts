import { Router, type Request, type Response } from "express";
import { insertToolLog } from "../lib/admin-db.js";

const router = Router();

const ZUKI_API_KEY = process.env.ZUKI_API_KEY ?? "";
const ZUKI_MODEL   = "claude-3.7-sonnet";
const ZUKI_URL     = "https://api.zukijourney.com/v1/chat/completions";

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

  type UserContent = { type: string; text?: string; image_url?: { url: string } }[];
  const userContent: UserContent = [];

  if (image) {
    userContent.push({ type: "image_url", image_url: { url: image } });
  }
  userContent.push({ type: "text", text: text.trim() ? `Đề bài: ${text}` : "Giải bài toán trong ảnh." });

  try {
    const upstream = await fetch(ZUKI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ZUKI_API_KEY}` },
      body: JSON.stringify({
        model: ZUKI_MODEL,
        stream: true,
        temperature: 0.3,
        max_tokens: 4096,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userContent },
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
