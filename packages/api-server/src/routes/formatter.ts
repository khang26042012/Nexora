import { Router, type Request, type Response } from "express";
import mammoth from "mammoth";

const router = Router();
const GEMINI_API_KEY = process.env["GEMINI_API_KEY"] ?? "";
const GEMINI_MODEL = "gemini-2.5-flash";

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

const GENERATE_SYSTEM_PROMPT = `Bạn là chuyên gia tạo nội dung và định dạng văn bản chuyên nghiệp tiếng Việt.
Tạo nội dung theo yêu cầu và định dạng chuẩn ngay lập tức.

QUY TẮC ĐỊNH DẠNG:
1. Tiêu đề chính: [C]TIÊU ĐỀ[/C] (marker căn giữa)
2. Đề mục lớn: **I. Tên** (số La Mã, in đậm)
3. Đề mục nhỏ: **1. Tên** (số thường, in đậm)
4. Danh sách cấp 1: - Nội dung
5. Danh sách cấp 2: thụt 4 khoảng trắng + + Nội dung
6. Đoạn văn: thụt đầu dòng 4 khoảng trắng
7. Câu hỏi trắc nghiệm: **Câu X:** ... rồi A. B. C. D. rồi ✔ Đáp án: X
8. Dòng kẻ phân cách: ---
9. Từ khóa quan trọng: **từ khóa**

Nội dung đầy đủ, chi tiết, chính xác. Chỉ trả về nội dung đã format.`;

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
      const isDocx =
        mimeType.includes("wordprocessingml") ||
        mimeType.includes("msword") ||
        mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

      if (isDocx) {
        // Extract text from docx with mammoth
        const buf = Buffer.from(content, "base64");
        const extracted = await mammoth.extractRawText({ buffer: buf });
        const text = extracted.value;
        systemPrompt = FORMAT_SYSTEM_PROMPT;
        userParts = [{ text: `Định dạng văn bản sau:\n\n${text}` }];
      } else {
        // Text-based file: content is already plain text
        systemPrompt = FORMAT_SYSTEM_PROMPT;
        userParts = [{ text: `Định dạng văn bản sau:\n\n${content}` }];
      }

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
