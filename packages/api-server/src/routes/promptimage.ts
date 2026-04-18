import { Router, type Request, type Response } from "express";
import { insertToolLog } from "../lib/admin-db.js";
import { streamAI } from "../lib/ai-client.js";

const router = Router();

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

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  const styleNote = style !== "general"
    ? `\nNgười dùng muốn tái tạo theo phong cách: **${style}**. Hãy điều chỉnh style keywords trong prompt cho phù hợp.`
    : "";

  res.write(`data: ${JSON.stringify({ type: "thinking", active: true })}\n\n`);
  let thinkingDone = false;

  try {
    for await (const chunk of streamAI([
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${content}` } },
          { type: "text", text: `Phân tích ảnh này và tạo prompt chi tiết nhất có thể để tái tạo ảnh với độ giống 98-100%.${styleNote}` },
        ] as never,
      },
    ], { temperature: 0.2, maxTokens: 8192 })) {
      if (!thinkingDone) {
        thinkingDone = true;
        res.write(`data: ${JSON.stringify({ type: "thinking", active: false })}\n\n`);
      }
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    }
  } catch (err: unknown) {
    if (!thinkingDone) res.write(`data: ${JSON.stringify({ type: "thinking", active: false })}\n\n`);
    res.write(`data: ${JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" })}\n\n`);
  }

  if (!thinkingDone) res.write(`data: ${JSON.stringify({ type: "thinking", active: false })}\n\n`);
  res.write("data: [DONE]\n\n");
  res.end();
});

export default router;
