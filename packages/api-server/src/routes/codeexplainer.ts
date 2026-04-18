import { Router, type Request, type Response } from "express";
import { insertToolLog } from "../lib/admin-db.js";
import { streamAI } from "../lib/ai-client.js";

const router = Router();

const SYSTEM = `Bạn là chuyên gia lập trình. Nhiệm vụ: phân tích và giải thích code mà người dùng cung cấp.

CẤU TRÚC OUTPUT (bắt buộc):
1. **Tổng quan** — 1-2 câu mô tả code làm gì
2. **Giải thích chi tiết** — giải thích từng phần/function/block quan trọng. Dùng format: \`tên_hàm\` → giải thích
3. **Luồng thực thi** — mô tả thứ tự chạy (nếu có)
4. **Bug & cảnh báo** — nếu phát hiện lỗi tiềm ẩn, ghi rõ. Nếu không có: bỏ qua phần này
5. **Gợi ý cải thiện** — 2-3 điểm cải thiện code quality/performance nếu có

QUY TẮC:
- Giải thích bằng Tiếng Việt, thuật ngữ kỹ thuật giữ tiếng Anh
- Dùng \`code\` inline cho tên hàm/biến
- Dùng **bold** cho điểm quan trọng
- Ngắn gọn, đúng trọng tâm
- Bắt đầu ngay với Tổng quan, không preamble`;

router.post("/code-explain", async (req: Request, res: Response) => {
  const { code = "", lang = "auto" } = req.body as Record<string, string>;
  if (!code.trim()) { res.status(400).json({ error: "Không có code" }); return; }

  const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? req.ip ?? "unknown";
  insertToolLog({ ip, tool: "code-explainer", action: lang, detail: code.slice(0, 300) });

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const langNote = lang !== "auto" ? `Ngôn ngữ: ${lang}\n\n` : "";
  try {
    for await (const chunk of streamAI([
      { role: "system", content: SYSTEM },
      { role: "user", content: `${langNote}Code:\n\`\`\`\n${code}\n\`\`\`` },
    ], { temperature: 0.4, maxTokens: 4096 })) {
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    }
  } catch (err: unknown) {
    res.write(`data: ${JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" })}\n\n`);
  }
  res.write("data: [DONE]\n\n");
  res.end();
});

export default router;
