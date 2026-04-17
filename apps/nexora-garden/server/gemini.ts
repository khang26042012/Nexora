import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSystemState } from "./db.js";

let genAI: GoogleGenerativeAI | null = null;

function getGenAI() {
  if (!genAI) {
    const key = process.env["GEMINI_API_KEY"];
    if (key) genAI = new GoogleGenerativeAI(key);
  }
  return genAI;
}

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
  const ai = getGenAI();
  if (!ai) {
    return "❌ Gemini API chưa được cấu hình.";
  }

  try {
    const state = getSystemState();
    const stateContext = `[Trạng thái hiện tại]
Độ ẩm đất: ${state.soil}% | Mức nước: ${state.water}% | Nhiệt độ: ${state.temp}°C | Độ ẩm KK: ${state.hum}% | Máy bơm: ${state.pump} | Lửa: ${state.fire} | Mưa: ${state.rain}`;

    const model = ai.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: SYSTEM_PROMPT,
    });

    const result = await model.generateContent(
      `${stateContext}\n\n${userMessage}`
    );
    return result.response.text();
  } catch (err: any) {
    return `❌ Lỗi AI: ${err?.message ?? "Không rõ"}`;
  }
}
