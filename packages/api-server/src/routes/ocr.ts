import { Router, type Request, type Response } from "express";

const router = Router();

const GLM_BASE_URL = "https://api.llm7.io/v1/chat/completions";
const GLM_MODEL    = "GLM-4.6V-Flash";
const GLM_API_KEY  = "T49q5w7eZI+2c3Giqf2G00twjoVevINN4TOY4AkPQqpr8koua+PdGHSBP/tX+m72Ehf/N6xN+Tq+oOtq8uxRzI3/fMq2dlt2W7TKqD9PHCVn4JY6M6VxOyRSqrBhH9hQtOTP";

const OCR_SYSTEM_PROMPT = `Bạn là công cụ OCR chuyên nghiệp. Nhiệm vụ: đọc và trích xuất TOÀN BỘ văn bản trong ảnh.

QUY TẮC OUTPUT:
- Đọc tất cả chữ trong ảnh, kể cả chữ nhỏ, mờ hoặc viết tay
- Giữ nguyên cấu trúc tài liệu: tiêu đề, đoạn văn, danh sách, bảng
- Dùng marker định dạng sau:
  + Tiêu đề chính (tên tài liệu, tên đề): [C]NỘI DUNG TIÊU ĐỀ[/C]
  + Đề mục lớn: **I. Tên đề mục** (số La Mã, in đậm)
  + Đề mục nhỏ: **1. Tên** (số thường, in đậm)
  + Danh sách: - Nội dung
  + Từ khóa / đáp án: **từ khóa**
  + Dòng kẻ phân cách section: ---
- Nếu không đọc được một từ: ghi [?]
- Nếu ảnh không có chữ: trả về "Không tìm thấy văn bản trong ảnh."
- CHỈ trả về văn bản trích xuất, KHÔNG thêm nhận xét, KHÔNG giải thích`;

router.post("/ocr", async (req: Request, res: Response) => {
  const { content, mimeType } = req.body as {
    content?: string;
    mimeType?: string;
  };

  if (!content || !mimeType) {
    res.status(400).json({ error: "Thiếu ảnh hoặc mimeType" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  try {
    const upstream = await fetch(GLM_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: GLM_MODEL,
        messages: [
          { role: "system", content: OCR_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${content}` } },
              { type: "text", text: "Đọc và trích xuất toàn bộ văn bản trong ảnh này. Giữ nguyên cấu trúc và áp dụng đúng quy tắc định dạng." },
            ],
          },
        ],
        stream: true,
        temperature: 0.1,
        max_tokens: 8192,
      }),
    });

    if (!upstream.ok) {
      const errData = await upstream.json().catch(() => ({})) as { error?: { message?: string } };
      res.write(`data: ${JSON.stringify({ error: errData?.error?.message ?? `HTTP ${upstream.status}` })}\n\n`);
      res.end();
      return;
    }

    const reader = upstream.body!.getReader();
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
        if (raw === "[DONE]") continue;
        try {
          const parsed = JSON.parse(raw) as {
            choices?: { delta?: { content?: string } }[];
            error?: { message?: string };
          };
          if (parsed.error) {
            res.write(`data: ${JSON.stringify({ error: parsed.error.message })}\n\n`);
            continue;
          }
          const text = parsed.choices?.[0]?.delta?.content;
          if (text) {
            res.write(`data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] })}\n\n`);
          }
        } catch {
          // ignore
        }
      }
    }

    res.end();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
    res.end();
  }
});

export default router;
