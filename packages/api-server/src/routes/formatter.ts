import { Router, type Request, type Response } from "express";

const router = Router();
const GEMINI_API_KEY = process.env["GEMINI_API_KEY"] ?? "";
const GEMINI_MODEL = "gemini-2.5-flash";

const FORMAT_SYSTEM_PROMPT = `Bạn là chuyên gia định dạng văn bản chuyên nghiệp. Nhận văn bản thô và trả về phiên bản đã được định dạng chuẩn.

QUY TẮC ĐỊNH DẠNG BẮT BUỘC:
1. TIÊU ĐỀ CHÍNH: viết hoa toàn bộ, đặt ký tự ═ hai bên căn giữa. VD: ══════════ TIÊU ĐỀ CHÍNH ══════════
2. ĐỀ MỤC LỚN: in đậm **I. Tên đề mục** (dùng số La Mã)
3. ĐỀ MỤC NHỎ: **1. Tên đề mục nhỏ** (số thường)
4. DANH SÁCH CẤP 1: bắt đầu bằng  - (gạch ngang + khoảng trắng)
5. DANH SÁCH CẤP 2: bắt đầu bằng    + (4 khoảng trắng + dấu + )
6. ĐOẠN VĂN: thụt đầu dòng 4 khoảng trắng, dòng trống giữa các đoạn
7. CÂU HỎI TRẮC NGHIỆM: format chuẩn:
   Câu X: [câu hỏi]
   A. [đáp án A]
   B. [đáp án B]
   C. [đáp án C]
   D. [đáp án D]
   ✔ Đáp án: [chữ cái]
8. BẢNG SỐ LIỆU: căn cột bằng khoảng trắng, dùng | để phân cột
9. TỪ QUAN TRỌNG: in đậm **từ** nếu là từ khóa/thuật ngữ chính
10. XÓA dấu cách thừa, sửa lỗi format, thống nhất kiểu viết

QUAN TRỌNG: CHỈ trả về văn bản đã được định dạng. KHÔNG giải thích. KHÔNG thêm ghi chú. KHÔNG thay đổi nội dung.`;

const GENERATE_SYSTEM_PROMPT = `Bạn là chuyên gia tạo nội dung và định dạng văn bản chuyên nghiệp người Việt.
Nhiệm vụ: TẠO nội dung theo yêu cầu, sau đó ĐỊNH DẠNG chuẩn ngay lập tức.

QUY TẮC ĐỊNH DẠNG (áp dụng cho nội dung bạn tạo):
1. TIÊU ĐỀ CHÍNH: viết hoa, ký tự ═ hai bên căn giữa
2. ĐỀ MỤC LỚN: **I. Tên đề mục** (số La Mã, in đậm)
3. ĐỀ MỤC NHỎ: **1. Tên** (số thường, in đậm)  
4. DANH SÁCH CẤP 1: dùng  - ; CẤP 2: dùng    +
5. ĐOẠN VĂN: thụt đầu dòng 4 khoảng trắng
6. CÂU HỎI TRẮC NGHIỆM: format A/B/C/D chuẩn + đáp án ✔
7. Nội dung đầy đủ, chi tiết, chính xác, tiếng Việt chuẩn

Chỉ trả về nội dung hoàn chỉnh đã format. KHÔNG thêm lời giải thích hay ghi chú.`;

router.post("/format", async (req: Request, res: Response) => {
  if (!GEMINI_API_KEY) {
    res.status(500).json({ error: "GEMINI_API_KEY not configured" });
    return;
  }

  const { mode, content, mimeType, prompt } = req.body as {
    mode: "text" | "file" | "generate";
    content?: string;
    mimeType?: string;
    prompt?: string;
  };

  if (mode === "generate" && !prompt?.trim()) {
    res.status(400).json({ error: "Thiếu nội dung yêu cầu" });
    return;
  }
  if (mode !== "generate" && !content?.trim()) {
    res.status(400).json({ error: "Thiếu nội dung cần định dạng" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  try {
    let userParts: unknown[];
    let systemPrompt: string;

    if (mode === "generate") {
      systemPrompt = GENERATE_SYSTEM_PROMPT;
      userParts = [{ text: `Yêu cầu tạo nội dung: ${prompt}` }];
    } else if (mode === "file" && mimeType && content) {
      systemPrompt = FORMAT_SYSTEM_PROMPT;
      userParts = [
        { inlineData: { mimeType, data: content } },
        { text: "Định dạng toàn bộ nội dung file này theo đúng quy tắc." },
      ];
    } else {
      systemPrompt = FORMAT_SYSTEM_PROMPT;
      userParts = [{ text: `Định dạng văn bản sau:\n\n${content}` }];
    }

    const body = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: userParts }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 8192 },
    };

    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?key=${GEMINI_API_KEY}&alt=sse`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    if (!upstream.ok) {
      const errData = await upstream.json().catch(() => ({})) as { error?: { message?: string } };
      res.write(`data: ${JSON.stringify({ error: errData?.error?.message ?? `HTTP ${upstream.status}` })}\n\n`);
      res.end();
      return;
    }

    const reader = upstream.body!.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }
    res.end();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
    res.end();
  }
});

export default router;
