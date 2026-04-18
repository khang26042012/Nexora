import { getSystemState } from "./db.js";

const ZUKI_MODEL   = "gemini-2.5-flash";
const ZUKI_URL     = "https://api.zukijourney.com/v1/chat/completions";
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_BASE  = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_PROMPT = `Bạn là NexoraAI, trợ lý thông minh của hệ thống nông nghiệp NexoraGarden.
Người dùng của bạn là Khang (Phan Trọng Khang), học sinh THCS Vĩnh Hoà, người tạo ra hệ thống này.
Xưng "mình", gọi người dùng là "Khang".
Chỉ trả lời về nông nghiệp, cây trồng, và hệ thống NexoraGarden.
Trả lời ngắn gọn, thân thiện, thực tế.

QUAN TRỌNG VỀ ĐỊNH DẠNG:
- TUYỆT ĐỐI KHÔNG dùng Markdown: không dùng **bold**, *italic*, # heading, __, --, v.v.
- Nếu muốn in đậm, dùng HTML tag: <b>text</b>
- Nếu muốn in nghiêng, dùng: <i>text</i>
- Dùng emoji thay cho bullet points nếu cần liệt kê.
- Câu trả lời phải hiển thị đẹp trên Telegram (HTML mode).`;

export async function askGemini(userMessage: string): Promise<string> {
  const ZUKI_API_KEY  = process.env.ZUKI_API_KEY  ?? "";
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";

  const state = getSystemState();
  const stateContext = `[Trạng thái hiện tại]
Độ ẩm đất: ${state.soil}% | Mức nước: ${state.water}% | Nhiệt độ: ${state.temp}°C | Độ ẩm KK: ${state.hum}% | Máy bơm: ${state.pump} | Lửa: ${state.fire} | Mưa: ${state.rain}`;

  const fullMessage = `${stateContext}\n\n${userMessage}`;

  if (ZUKI_API_KEY) {
    try {
      const res = await fetch(ZUKI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ZUKI_API_KEY}`,
        },
        body: JSON.stringify({
          model: ZUKI_MODEL,
          temperature: 0.7,
          max_tokens: 1024,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: fullMessage },
          ],
        }),
      });
      if (res.ok) {
        const data = await res.json() as { choices?: { message?: { content?: string } }[] };
        const text = data?.choices?.[0]?.message?.content;
        if (text) return text;
      }
    } catch {
      // fallthrough to Gemini
    }
  }

  if (!GEMINI_API_KEY) {
    return "❌ Không có API key khả dụng.";
  }

  try {
    const res = await fetch(`${GEMINI_BASE}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: fullMessage }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
      return `❌ Lỗi AI: ${err?.error?.message ?? `HTTP ${res.status}`}`;
    }
    const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "❌ Không có phản hồi từ AI.";
  } catch (err: any) {
    return `❌ Lỗi AI: ${err?.message ?? "Không rõ"}`;
  }
}
