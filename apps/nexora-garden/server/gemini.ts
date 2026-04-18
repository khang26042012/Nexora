import { getSystemState } from "./db.js";

const ZUKI_API_KEY = process.env.ZUKI_API_KEY ?? "";
const ZUKI_MODEL   = "claude-3.7-sonnet";
const ZUKI_URL     = "https://api.zukijourney.com/v1/chat/completions";

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
  try {
    const state = getSystemState();
    const stateContext = `[Trạng thái hiện tại]
Độ ẩm đất: ${state.soil}% | Mức nước: ${state.water}% | Nhiệt độ: ${state.temp}°C | Độ ẩm KK: ${state.hum}% | Máy bơm: ${state.pump} | Lửa: ${state.fire} | Mưa: ${state.rain}`;

    const response = await fetch(ZUKI_URL, {
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
          { role: "user", content: `${stateContext}\n\n${userMessage}` },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as { error?: { message?: string } };
      return `❌ Lỗi AI: ${err?.error?.message ?? `HTTP ${response.status}`}`;
    }

    const data = await response.json() as {
      choices?: { message?: { content?: string } }[];
    };
    return data?.choices?.[0]?.message?.content ?? "❌ Không có phản hồi từ AI.";
  } catch (err: any) {
    return `❌ Lỗi AI: ${err?.message ?? "Không rõ"}`;
  }
}
