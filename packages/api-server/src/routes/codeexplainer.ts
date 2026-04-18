import { Router, type Request, type Response } from "express";
import { insertToolLog } from "../lib/admin-db.js";

const router = Router();

const ZUKI_API_KEY = process.env.ZUKI_API_KEY ?? "";
const ZUKI_MODEL   = "claude-3.7-sonnet";
const ZUKI_URL     = "https://api.zukijourney.com/v1/chat/completions";

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
    const upstream = await fetch(ZUKI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ZUKI_API_KEY}` },
      body: JSON.stringify({
        model: ZUKI_MODEL,
        stream: true,
        temperature: 0.4,
        max_tokens: 4096,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `${langNote}Code:\n\`\`\`\n${code}\n\`\`\`` },
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
