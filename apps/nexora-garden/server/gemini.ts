import { getSystemState } from "./db.js";

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_BASE  = "https://generativelanguage.googleapis.com/v1beta";

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

// Lấy tất cả Gemini keys có thể dùng (GEMINI_KEY_1..4 + GEMINI_API_KEY fallback)
function getGeminiKeys(): string[] {
  const keys = [
    process.env.GEMINI_KEY_1 ?? "",
    process.env.GEMINI_KEY_2 ?? "",
    process.env.GEMINI_KEY_3 ?? "",
    process.env.GEMINI_KEY_4 ?? "",
    process.env.GEMINI_API_KEY ?? "",
  ].filter(k => k.length > 0);
  return keys;
}

export async function askGemini(userMessage: string): Promise<string> {
  const keys = getGeminiKeys();

  if (keys.length === 0) {
    return "❌ Không có API key khả dụng.";
  }

  const state = getSystemState();
  const stateContext = `[Trạng thái hiện tại]
Độ ẩm đất: ${state.soil}% | Mức nước: ${state.water}% | Nhiệt độ: ${state.temp}°C | Độ ẩm KK: ${state.hum}% | Máy bơm: ${state.pump} | Lửa: ${state.fire} | Mưa: ${state.rain}`;

  const fullMessage = `${stateContext}\n\n${userMessage}`;

  const payload = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: [{ text: fullMessage }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
  };

  // Thử từng key cho đến khi thành công
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    try {
      const res = await fetch(
        `${GEMINI_BASE}/models/${GEMINI_MODEL}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(25_000),
        }
      );

      if (res.status === 429 || res.status === 403) {
        console.warn(`[gemini] key${i + 1} bị rate-limit/auth (${res.status}), thử key tiếp...`);
        continue;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
        console.warn(`[gemini] key${i + 1} HTTP ${res.status}: ${err?.error?.message ?? ""}`);
        continue;
      }

      const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        console.info(`[gemini] key${i + 1} OK`);
        return text;
      }
    } catch (e: any) {
      console.warn(`[gemini] key${i + 1} exception: ${e?.message}`);
      continue;
    }
  }

  return "❌ Tất cả API key đều thất bại, vui lòng thử lại sau.";
}
