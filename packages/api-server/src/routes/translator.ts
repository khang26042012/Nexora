import { Router, type Request, type Response } from "express";
import { insertToolLog } from "../lib/admin-db.js";

const router = Router();

const ZUKI_API_KEY = process.env.ZUKI_API_KEY ?? "";
const ZUKI_MODEL   = "claude-3.7-sonnet";
const ZUKI_URL     = "https://api.zukijourney.com/v1/chat/completions";

const LANG_NAMES: Record<string, string> = {
  vi: "Tiếng Việt", en: "English", zh: "Chinese (Simplified)",
  ja: "Japanese", ko: "Korean", fr: "French", de: "German",
  es: "Spanish", th: "Thai", ru: "Russian",
};

function buildPrompt(from: string, to: string, mode: string): string {
  const fromName = LANG_NAMES[from] ?? from;
  const toName   = LANG_NAMES[to]   ?? to;
  const modeDesc = mode === "formal"
    ? "văn phong trang trọng, lịch sự"
    : mode === "natural"
    ? "tự nhiên như người bản ngữ, colloquial"
    : "chuẩn mực, trung tính";

  return `Bạn là chuyên gia dịch thuật. Dịch văn bản từ ${fromName} sang ${toName}.

QUY TẮC:
- Phong cách: ${modeDesc}
- Giữ đúng nghĩa, không thêm/bớt nội dung
- Nếu có thuật ngữ chuyên ngành, giữ nguyên và chú thích trong ngoặc đơn nếu cần
- Sau bản dịch, thêm "---" và 1-2 câu **Ghi chú dịch thuật** nếu có điểm cần lưu ý (thành ngữ, ngữ cảnh văn hóa...)
- Nếu không có ghi chú đặc biệt, bỏ qua phần ghi chú
- Bắt đầu ngay với bản dịch, không preamble`;
}

router.post("/translate", async (req: Request, res: Response) => {
  const { text = "", from = "auto", to = "vi", mode = "normal" } = req.body as Record<string, string>;
  if (!text.trim()) { res.status(400).json({ error: "Không có văn bản" }); return; }

  const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? req.ip ?? "unknown";
  insertToolLog({ ip, tool: "translator", action: `${from}→${to}`, detail: text.slice(0, 300) });

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const fromNote = from === "auto" ? "Tự động nhận diện ngôn ngữ nguồn." : "";
  const userMsg = `${fromNote}\n\nVăn bản cần dịch:\n${text}`;

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
          { role: "system", content: buildPrompt(from, to, mode) },
          { role: "user", content: userMsg },
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
