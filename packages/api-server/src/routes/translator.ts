import { Router, type Request, type Response } from "express";
import { insertToolLog } from "../lib/admin-db.js";

const router = Router();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
const GEMINI_MODEL   = "gemini-2.5-flash";
const GEMINI_URL     = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;

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

  if (!GEMINI_API_KEY) { res.status(500).json({ error: "GEMINI_API_KEY chưa được set" }); return; }

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const fromNote = from === "auto" ? "Tự động nhận diện ngôn ngữ nguồn." : "";
  const userMsg = `${fromNote}\n\nVăn bản cần dịch:\n${text}`;

  const payload = {
    system_instruction: { parts: [{ text: buildPrompt(from, to, mode) }] },
    contents: [{ role: "user", parts: [{ text: userMsg }] }],
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
        const json = JSON.parse(raw);
        const t: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        if (t) res.write(`data: ${JSON.stringify({ text: t })}\n\n`);
      } catch { /* skip */ }
    }
  }
  res.write("data: [DONE]\n\n"); res.end();
});

export default router;
