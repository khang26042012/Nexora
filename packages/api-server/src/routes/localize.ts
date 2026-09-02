import { Router, type Request, type Response } from "express";

const router = Router();

const SYSTEM_PROMPT = `Nhiệm vụ: Việt hóa file cấu hình plugin Minecraft (messages.yml / lang.yml / config.yml) sang tiếng Việt.

QUY TẮC BẮT BUỘC - VI PHẠM SẼ LÀM PLUGIN LỖI:

1. CHỈ dịch phần VALUE (bên phải dấu ":"), TUYỆT ĐỐI KHÔNG đổi KEY (bên trái dấu ":").
   Ví dụ:
   - Đúng: no-permission: "Bạn không có quyền làm điều này!"
   - SAI:  khong-co-quyen: "Bạn không có quyền làm điều này!"

2. GIỮ NGUYÊN 100% mọi placeholder/biến, không dịch, không đổi vị trí, không thêm/bớt ký tự bên trong: %player%, {amount}, <player>, {0}, {1}, %target%, v.v. Chỉ dịch phần chữ tiếng Anh XUNG QUANH placeholder.
   Ví dụ:
   - Gốc:  "Teleported to %player%"
   - Đúng: "Đã dịch chuyển đến %player%"
   - SAI:  "Đã dịch chuyển đến %nguoichoi%"

3. GIỮ NGUYÊN 100% mã màu và mã định dạng: &a, &c, &l, &n, §4, §6, <red>, <bold>, v.v. Không xoá, không di chuyển sang vị trí khác trong câu.

4. GIỮ NGUYÊN cấu trúc YAML: thụt đầu dòng (indent), dấu ngoặc kép/đơn, dấu hai chấm, thứ tự các dòng. Không thêm dòng mới, không xoá dòng nào kể cả dòng comment (bắt đầu bằng #).

5. Với dòng comment (#) giải thích cho admin đọc (không phải text hiển thị cho người chơi): CÓ THỂ dịch nếu muốn, vì không ảnh hưởng tới việc plugin đọc file.

6. Nếu gặp file có sẵn thư mục lang/ với nhiều file theo mã ngôn ngữ (en.yml, de.yml...) và có khả năng tạo file mới: tạo file vi.yml hoặc vi_VN.yml riêng (copy cấu trúc từ en.yml), KHÔNG ghi đè trực tiếp lên file gốc.

7. Dịch tự nhiên, đúng ngữ cảnh Minecraft (ví dụ "cooldown" → "thời gian hồi", "teleport" → "dịch chuyển", không dịch cứng nhắc từng từ).

8. Sau khi dịch xong, kiểm tra lại: đếm số lượng placeholder trong bản gốc và bản dịch phải KHỚP NHAU CHÍNH XÁC cho từng dòng - nếu thiếu hoặc thừa placeholder, dòng đó sẽ gây lỗi hoặc hiển thị sai khi plugin chạy.

Sau khi hoàn thành, liệt kê lại RÕ RÀNG:
- Tên file đã dịch
- Tổng số dòng đã dịch
- Danh sách bất kỳ dòng nào bạn KHÔNG CHẮC CHẮN về placeholder hoặc cấu trúc (để người dùng tự kiểm tra lại thủ công trước khi áp dụng vào server).

CHỈ trả về NỘI DUNG FILE ĐÃ DỊCH, KHÔNG thêm giải thích hay markdown code block xung quanh.`;

router.post("/translate", async (req: Request, res: Response) => {
  try {
    const parsed: any = req.body || {};
    const content = parsed.content;
    const chunkIndex = typeof parsed.chunkIndex === "number" ? parsed.chunkIndex : 0;
    const totalChunks = typeof parsed.totalChunks === "number" ? parsed.totalChunks : 1;
    const fileName = parsed.fileName || "plugin.yml";

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return res.status(400).json({ error: "Không có văn bản" });
    }

    const apiKey = process.env["NINE_ROUTER_API_KEY"] || process.env["OPENROUTER_API_KEY"] || process.env["AI_API_KEY"] || "";

    if (!apiKey) {
      return res.status(500).json({ error: "AI API key not configured" });
    }

    const baseUrl = process.env["NINE_ROUTER_URL"] || "https://openrouter.ai/api/v1";
    const model = process.env["NINE_ROUTER_MODEL"] || "Xkiro/minimax/minimax-m3:free";

    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Đây là chunk ${chunkIndex + 1}/${totalChunks} của file ${fileName}.\n\n${content}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 8192,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[localize] AI API error:", errText.slice(0, 500));
      return res.status(502).json({ error: "AI API error", detail: errText.slice(0, 500) });
    }

    // Đọc raw text để xử lý cả JSON lẫn SSE streaming
    const rawText = await response.text();
    let data: any = {};
    let translated = "";

    try {
      data = JSON.parse(rawText);
      translated = data.choices?.[0]?.message?.content || "";
    } catch {
      // SSE streaming: "data: {...}\n\ndata: {...}\n\ndata: [DONE]"
      const lines = rawText.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;
        const payload = trimmed.slice(6);
        if (payload === "[DONE]") break;
        try {
          const j = JSON.parse(payload);
          const delta = j.choices?.[0]?.delta?.content || j.choices?.[0]?.message?.content;
          if (delta) translated += delta;
        } catch { /* skip */ }
      }
    }

    // Strip markdown code block fences nếu AI trả về
    translated = translated
      .replace(/^\s*```(?:ya?ml|text)?\s*\n/i, "")
      .replace(/\n\s*```\s*$/i, "")
      .trim();

    res.json({
      chunkIndex,
      totalChunks,
      fileName,
      translated,
      tokensUsed: data.usage?.total_tokens || 0,
    });
  } catch (err: any) {
    console.error("Translate error:", err);
    res.status(500).json({ error: err.message || "Internal error" });
  }
});

export default router;