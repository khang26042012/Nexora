import { Router, type Request, type Response } from "express";
import { insertToolLog } from "../lib/admin-db.js";

const router = Router();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
const GEMINI_MODEL   = "gemini-2.5-flash";
const GEMINI_URL     = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;

const SYSTEM = `Bạn là senior software engineer với 10 năm kinh nghiệm. Nhiệm vụ: review code và đưa ra nhận xét chuyên sâu.

CẤU TRÚC OUTPUT (bắt buộc, theo thứ tự):

**📋 Tổng quan**
1-2 câu mô tả code làm gì và đánh giá chung.

---

**🐛 Bug & Lỗi tiềm ẩn**
Liệt kê các bug thực sự hoặc có thể xảy ra. Nếu không có: "Không phát hiện bug rõ ràng."
Format mỗi bug: \`tên_vấn_đề\` — mô tả ngắn + cách fix

---

**⚡ Hiệu năng**
Các điểm có thể tối ưu tốc độ/bộ nhớ. Nếu ổn: "Hiệu năng chấp nhận được."

---

**🔒 Bảo mật**
Các lỗ hổng bảo mật nếu có (injection, XSS, unvalidated input...). Nếu không liên quan: "Không phát hiện vấn đề bảo mật."

---

**✨ Gợi ý refactor**
2-4 cải tiến code quality, readability, maintainability cụ thể. Dùng ví dụ code ngắn nếu cần.

---

**🎯 Điểm tốt**
1-3 điểm code làm đúng/tốt. Luôn có phần này.

QUY TẮC:
- Tiếng Việt, thuật ngữ kỹ thuật giữ tiếng Anh
- Dùng \`code\` inline cho tên hàm/biến/method
- Dùng **bold** cho điểm quan trọng
- Cụ thể, có ví dụ thực tế — không nói chung chung
- Bắt đầu ngay, không preamble`;

router.post("/code-review", async (req: Request, res: Response) => {
  const { code = "", lang = "auto", focus = "all" } = req.body as Record<string, string>;
  if (!code.trim()) { res.status(400).json({ error: "Không có code" }); return; }

  const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? req.ip ?? "unknown";
  insertToolLog({ ip, tool: "code-review", action: `${lang}|${focus}`, detail: code.slice(0, 300) });

  if (!GEMINI_API_KEY) { res.status(500).json({ error: "GEMINI_API_KEY chưa được set" }); return; }

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const langNote = lang !== "auto" ? `Ngôn ngữ: ${lang}\n` : "";
  const focusNote = focus !== "all" ? `Tập trung review: ${focus}\n` : "";
  const payload = {
    system_instruction: { parts: [{ text: SYSTEM }] },
    contents: [{ role: "user", parts: [{ text: `${langNote}${focusNote}\nCode cần review:\n\`\`\`\n${code}\n\`\`\`` }] }],
    generationConfig: { temperature: 0.35, maxOutputTokens: 8192 },
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
