import { Router, type Request, type Response } from "express";
import mammoth from "mammoth";
import { insertToolLog } from "../lib/admin-db.js";
import { streamAI, type AIMessage } from "../lib/ai-client.js";

const router = Router();

const FORMAT_SYSTEM_PROMPT = `Bạn là chuyên gia định dạng văn bản chuyên nghiệp tiếng Việt.
Nhận văn bản thô và trả về phiên bản đã được định dạng chuẩn.

QUY TẮC ĐỊNH DẠNG (BẮT BUỘC tuân thủ chính xác):

1. TIÊU ĐỀ CHÍNH (tên báo cáo, tên đề tài, tên tài liệu):
   Dùng marker: [C]TIÊU ĐỀ Ở ĐÂY[/C]
   Ví dụ: [C]BÁO CÁO TỔNG KẾT NĂM 2025[/C]

2. ĐỀ MỤC LỚN: **I. Tên đề mục** (số La Mã + chấm + khoảng trắng + tên, in đậm)
   Ví dụ: **I. Giới thiệu**

3. ĐỀ MỤC NHỎ: **1. Tên đề mục nhỏ** (số thường + chấm, in đậm)

4. DANH SÁCH CẤP 1: - Nội dung (gạch ngang đầu dòng)

5. DANH SÁCH CẤP 2: thụt vào 4 khoảng trắng + + Nội dung

6. ĐOẠN VĂN THƯỜNG: thụt đầu dòng 4 khoảng trắng

7. CÂU HỎI TRẮC NGHIỆM (format chính xác):
   **Câu X:** Nội dung câu hỏi
   A. Đáp án A
   B. Đáp án B
   C. Đáp án C
   D. Đáp án D
   ✔ Đáp án: X

8. TỪ KHÓA QUAN TRỌNG: in đậm **từ khóa**

9. DÒNG KẺ phân cách section: ---

QUAN TRỌNG:
- CHỈ dùng [C]...[/C] cho tiêu đề chính, KHÔNG dùng ký tự ═ hay ==
- CHỈ trả về văn bản đã format, KHÔNG giải thích, KHÔNG thêm ghi chú
- Giữ nguyên ngôn ngữ và nội dung gốc`;

const NEXORA_CONTEXT = `
=== THÔNG TIN VỀ NEXORA VÀ PHAN TRỌNG KHANG ===
(Dùng khi người dùng hỏi/yêu cầu tạo nội dung liên quan đến Nexora, Khang, NexoraGarden, NexoraAI, NexoraTool)

Họ tên: Phan Trọng Khang | Năm sinh: 2012 | Quê quán: Vĩnh Hòa, Việt Nam
Biệt danh/Thương hiệu: Nexora (KHÔNG phải thuốc, KHÔNG phải công ty dược, KHÔNG phải thiết bị y tế)
Chức danh: AI Architect · IoT Engineer · Fullstack Developer
Mô tả: Lập trình viên trẻ, bắt đầu học lập trình từ 2021, hơn 3 năm kinh nghiệm fullstack/IoT/AI.

Liên hệ: GitHub: khang26042012 | Email: trongkhabgphan@gmail.com | Telegram: t.me/+84352234521 | SĐT: 0352234521

Kỹ năng: React, TypeScript, Node.js, Express, SQLite, WebSocket, ESP32/C++, Google Gemini API, Telegram Bot API, Docker, Railway, yt-dlp, ffmpeg, Python

Các dự án chính:
1. NexoraGarden (2026, LIVE) — Hệ thống IoT vườn thông minh: ESP32 đọc cảm biến (nhiệt độ, độ ẩm đất, ánh sáng) + điều khiển bơm tự động, API Server Node.js+WebSocket, React Dashboard, Telegram Bot, AI Gemini phân tích. GitHub: khang26042012/Nexora
2. NexoraAI (2025) — AI Assistant tích hợp Telegram, Gemini 2.5 Flash, streaming, multi-turn
3. NexoraTool (2024–2026, LIVE) — Nền tảng tải video (YouTube/1000+ trang), cắt video, Text Formatter AI. URL: nexorax.cloud/tool
4. Portfolio cá nhân (2026) — nexorax.cloud, React+Vite+Tailwind, dark theme, video background

Website: nexorax.cloud | Deploy: Railway (backend Docker) + Render (backup)
=== KẾT THÚC THÔNG TIN NEXORA ===
`;

const GENERATE_SYSTEM_PROMPT = `Bạn là chuyên gia tạo nội dung văn bản chuyên nghiệp tiếng Việt.
Nhiệm vụ: tạo nội dung THỰC TẾ, ĐẦY ĐỦ theo đúng yêu cầu của người dùng.

${NEXORA_CONTEXT}

QUY TẮC OUTPUT (áp dụng khi xuất kết quả):
- Tiêu đề chính dùng marker: [C]NỘI DUNG TIÊU ĐỀ THỰC TẾ[/C]
- Đề mục lớn: số La Mã + tên thực tế, in đậm
- Đề mục nhỏ: số thường + tên thực tế, in đậm
- Danh sách: bắt đầu bằng dấu "- "
- Câu hỏi trắc nghiệm:
  **Câu 1:** [nội dung câu hỏi]
  A. [đáp án A]  B. [đáp án B]  C. [đáp án C]  D. [đáp án D]
  ✔ Đáp án: A
- Dòng kẻ phân cách section: ---
- Từ khóa quan trọng: in đậm **từ khóa**

NGHIÊM CẤM:
- KHÔNG viết ra quy tắc định dạng, hướng dẫn, hay placeholder vào kết quả
- KHÔNG lặp lại thông tin context ở cuối output
- CHỈ trả về nội dung hoàn chỉnh theo yêu cầu, không giải thích gì thêm`;

async function callAIStream(res: Response, messages: AIMessage[], temperature = 0.2) {
  for await (const chunk of streamAI(messages, { temperature, maxTokens: 8192 })) {
    res.write(`data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: chunk }] } }] })}\n\n`);
  }
}

router.post("/format", async (req: Request, res: Response) => {
  const { mode, content, mimeType, prompt } = req.body as {
    mode: "text" | "file" | "generate";
    content?: string;
    mimeType?: string;
    prompt?: string;
  };

  const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? req.ip ?? "unknown";
  insertToolLog({
    ip, tool: "formatter", action: mode ?? "text",
    detail: mode === "generate" ? (prompt ?? "").slice(0, 300) : `[${mimeType ?? "text"}]`,
  });

  if (mode === "generate" && !prompt?.trim()) {
    res.status(400).json({ error: "Thiếu nội dung yêu cầu" }); return;
  }
  if (mode !== "generate" && !content?.trim()) {
    res.status(400).json({ error: "Thiếu nội dung cần định dạng" }); return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  try {
    if (mode === "generate") {
      await callAIStream(res, [
        { role: "system", content: GENERATE_SYSTEM_PROMPT },
        { role: "user", content: `Yêu cầu tạo nội dung: ${prompt}` },
      ], 0.7);

    } else if (mode === "file" && mimeType && content) {
      const isDocx = mimeType.includes("wordprocessingml") || mimeType.includes("msword");
      const isImage = mimeType.startsWith("image/");

      if (isDocx) {
        const buf = Buffer.from(content, "base64");
        const extracted = await mammoth.extractRawText({ buffer: buf });
        await callAIStream(res, [
          { role: "system", content: FORMAT_SYSTEM_PROMPT },
          { role: "user", content: `Định dạng văn bản sau:\n\n${extracted.value}` },
        ]);
      } else if (isImage) {
        await callAIStream(res, [
          { role: "system", content: FORMAT_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${content}` } },
              { type: "text", text: "Đọc toàn bộ văn bản trong ảnh này, sau đó định dạng lại theo đúng quy tắc định dạng." },
            ] as never,
          },
        ]);
      } else {
        await callAIStream(res, [
          { role: "system", content: FORMAT_SYSTEM_PROMPT },
          { role: "user", content: `Định dạng văn bản sau:\n\n${content}` },
        ]);
      }
    } else {
      await callAIStream(res, [
        { role: "system", content: FORMAT_SYSTEM_PROMPT },
        { role: "user", content: `Định dạng văn bản sau:\n\n${content}` },
      ]);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.write(`data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: `❌ Lỗi: ${msg}` }] } }] })}\n\n`);
  }
  res.end();
});

export default router;
