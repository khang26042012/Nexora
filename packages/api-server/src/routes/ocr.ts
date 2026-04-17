import { Router, type Request, type Response } from "express";
import { insertToolLog } from "../lib/admin-db.js";

const router = Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
const GEMINI_MODEL   = "gemini-2.0-flash";
const GEMINI_URL     = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;

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

  const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? req.ip ?? "unknown";
  insertToolLog({ ip, tool: "ocr", action: "scan", detail: mimeType });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  try {
    const upstream = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: OCR_SYSTEM_PROMPT }] },
        contents: [{
          role: "user",
          parts: [
            { inlineData: { mimeType, data: content } },
            { text: "Đọc và trích xuất toàn bộ văn bản trong ảnh này. Giữ nguyên cấu trúc và áp dụng đúng quy tắc định dạng." },
          ],
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
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
        if (!raw || raw === "[DONE]") continue;
        try {
          const parsed = JSON.parse(raw) as {
            candidates?: { content?: { parts?: { text?: string }[] } }[];
            error?: { message?: string };
          };
          if (parsed.error) {
            res.write(`data: ${JSON.stringify({ error: parsed.error.message })}\n\n`);
            continue;
          }
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
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
