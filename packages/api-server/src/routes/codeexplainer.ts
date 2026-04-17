import { Router, type Request, type Response } from "express";
import { insertToolLog } from "../lib/admin-db.js";

const router = Router();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
const GEMINI_MODEL   = "gemini-2.0-flash";
const GEMINI_URL     = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;

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

  if (!GEMINI_API_KEY) { res.status(500).json({ error: "GEMINI_API_KEY chưa được set" }); return; }

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const langNote = lang !== "auto" ? `Ngôn ngữ: ${lang}\n\n` : "";
  const payload = {
    system_instruction: { parts: [{ text: SYSTEM }] },
    contents: [{ role: "user", parts: [{ text: `${langNote}Code:\n\`\`\`\n${code}\n\`\`\`` }] }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 4096 },
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
