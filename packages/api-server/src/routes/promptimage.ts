import { Router, type Request, type Response } from "express";
import { insertToolLog } from "../lib/admin-db.js";

const router = Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
const GEMINI_MODEL   = "gemini-2.5-flash";
const GEMINI_URL     = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;

const SYSTEM = `Bạn là chuyên gia phân tích ảnh và viết prompt cho các AI tạo ảnh (Midjourney, DALL-E 3, Stable Diffusion, Flux).

NHIỆM VỤ: Phân tích ảnh được cung cấp và tạo ra một prompt chi tiết nhất có thể để tạo lại ảnh đó với độ tương đồng 98-100%.

CẤU TRÚC OUTPUT (bắt buộc theo thứ tự này):

**🎯 MAIN PROMPT** (dùng ngay cho AI tạo ảnh)
Viết một đoạn prompt tiếng Anh duy nhất, chi tiết, không xuống dòng. Bao gồm:
- Subject chính (người/vật/cảnh) — mô tả cực kỳ chi tiết: đặc điểm ngoại hình, trang phục, biểu cảm, tư thế
- Environment / Background: địa điểm, thời gian, ánh sáng, màu sắc không khí
- Composition: góc chụp, khoảng cách, perspective (eye-level, bird-eye, low-angle...)
- Lighting: nguồn sáng, hướng sáng, chất lượng ánh sáng (soft, harsh, rim light, golden hour...)
- Style: phong cách nghệ thuật (photorealistic, anime, oil painting, cinematic...)
- Technical: camera type, lens, aperture, ISO, resolution keywords
- Quality tags: ultra detailed, 8k, masterpiece, perfect anatomy...

---

**📐 PHÂN TÍCH CHI TIẾT**
Mô tả từng yếu tố đã phân tích:
- **Subject:** [mô tả chi tiết nhân vật/vật thể chính]
- **Background:** [môi trường, bối cảnh]
- **Lighting:** [loại ánh sáng, màu sắc, hướng]
- **Color palette:** [bảng màu chủ đạo — liệt kê màu cụ thể]
- **Style:** [phong cách nghệ thuật, camera technique]
- **Mood:** [cảm xúc, không khí tổng thể]

---

**🔧 NEGATIVE PROMPT** (những gì cần loại trừ)
Liệt kê các từ khóa negative prompt phù hợp để tránh lỗi phổ biến khi tái tạo ảnh này.

---

**💡 GỢI Ý PLATFORM**
Cho biết ảnh này phù hợp nhất với AI tạo ảnh nào và lý do ngắn gọn.

QUY TẮC:
- Main prompt PHẢI bằng tiếng Anh, cực kỳ chi tiết
- Phân tích bằng tiếng Việt
- Ưu tiên độ chính xác tuyệt đối — quan sát từng pixel, màu sắc, texture
- Không bỏ sót bất kỳ chi tiết nào trong ảnh`;

router.post("/prompt-image", async (req: Request, res: Response) => {
  const { content, mimeType, style = "general" } = req.body as {
    content?: string;
    mimeType?: string;
    style?: string;
  };

  if (!content || !mimeType) {
    res.status(400).json({ error: "Thiếu ảnh hoặc mimeType" });
    return;
  }

  const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? req.ip ?? "unknown";
  insertToolLog({ ip, tool: "prompt-image", action: style, detail: mimeType });

  if (!GEMINI_API_KEY) {
    res.status(500).json({ error: "GEMINI_API_KEY chưa được set" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  const styleNote = style !== "general"
    ? `\nNgười dùng muốn tái tạo theo phong cách: **${style}**. Hãy điều chỉnh style keywords trong prompt cho phù hợp.`
    : "";

  const payload = {
    system_instruction: { parts: [{ text: SYSTEM }] },
    contents: [{
      role: "user",
      parts: [
        { inlineData: { mimeType, data: content } },
        { text: `Phân tích ảnh này và tạo prompt chi tiết nhất có thể để tái tạo ảnh với độ giống 98-100%.${styleNote}` },
      ],
    }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 8192,
      thinkingConfig: { thinkingBudget: 8192 },
    },
  };

  try {
    const upstream = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!upstream.ok) {
      const errData = await upstream.json().catch(() => ({})) as { error?: { message?: string } };
      res.write(`data: ${JSON.stringify({ error: errData?.error?.message ?? `Gemini ${upstream.status}` })}\n\n`);
      res.end();
      return;
    }

    // Signal thinking started
    res.write(`data: ${JSON.stringify({ type: "thinking", active: true })}\n\n`);

    const reader = upstream.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let thinkingDone = false;

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
            candidates?: {
              content?: {
                parts?: { text?: string; thought?: boolean }[];
              };
            }[];
            error?: { message?: string };
          };

          if (parsed.error) {
            res.write(`data: ${JSON.stringify({ error: parsed.error.message })}\n\n`);
            continue;
          }

          const parts = parsed.candidates?.[0]?.content?.parts ?? [];
          for (const part of parts) {
            if (part.thought === true) {
              // Thinking token — skip content, keep thinking signal active
              continue;
            }
            if (part.text) {
              // First real text chunk — signal thinking done
              if (!thinkingDone) {
                thinkingDone = true;
                res.write(`data: ${JSON.stringify({ type: "thinking", active: false })}\n\n`);
              }
              res.write(`data: ${JSON.stringify({ text: part.text })}\n\n`);
            }
          }
        } catch { /* skip */ }
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
    res.end();
  }
});

export default router;
