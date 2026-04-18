import { Router, type Request, type Response } from "express";
import { insertToolLog } from "../lib/admin-db.js";

const router = Router();

const ZUKI_API_KEY = process.env.ZUKI_API_KEY ?? "";
const ZUKI_MODEL   = "claude-3.7-sonnet";
const ZUKI_URL     = "https://api.zukijourney.com/v1/chat/completions";

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

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const langNote = lang !== "auto" ? `Ngôn ngữ: ${lang}\n` : "";
  const focusNote = focus !== "all" ? `Tập trung review: ${focus}\n` : "";

  try {
    const upstream = await fetch(ZUKI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ZUKI_API_KEY}` },
      body: JSON.stringify({
        model: ZUKI_MODEL,
        stream: true,
        temperature: 0.35,
        max_tokens: 8192,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `${langNote}${focusNote}\nCode cần review:\n\`\`\`\n${code}\n\`\`\`` },
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
