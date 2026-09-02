import { Router, type Request, type Response } from "express";
import multer from "multer";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const SYSTEM_PROMPT = `Nhiệm vụ: Việt hóa file cấu hình plugin Minecraft (messages.yml / lang.yml / config.yml) sang tiếng Việt.

QUY TẮC BẮT BUỘC - VI PHẠM SẼ LÀM PLUGIN LỖI:

1. CHỈ dịch phần VALUE (bên phải dấu ":"), TUYỆT ĐỐI KHÔNG đổi KEY (bên trái dấu ":").
2. GIỮ NGUYÊN 100% mọi placeholder/biến: %player%, {amount}, <player>, {0}, {1}, %target%, v.v.
3. GIỮ NGUYÊN 100% mã màu và mã định dạng: &a, &c, &l, &n, §4, §6, <red>, <bold>, v.v.
4. GIỮ NGUYÊN cấu trúc YAML: thụt đầu dòng, dấu ngoặc kép/đơn, dấu hai chấm, thứ tự các dòng.
5. Với dòng comment (#): CÓ THỂ dịch nếu muốn.
6. Nếu gặp file có sẵn thư mục lang/ với nhiều file theo mã ngôn ngữ: tạo file vi.yml riêng.
7. Dịch tự nhiên, đúng ngữ cảnh Minecraft.
8. Sau khi dịch xong, kiểm tra lại số lượng placeholder phải KHỚP NHAU CHÍNH XÁC.

Sau khi hoàn thành, liệt kê lại:
- Tên file đã dịch
- Tổng số dòng đã dịch
- Danh sách bất kỳ dòng nào bạn KHÔNG CHẮC CHẮN về placeholder hoặc cấu trúc`;

router.post("/translate", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    const chunkIndex = parseInt(req.body["chunkIndex"] || "0");
    const totalChunks = parseInt(req.body["totalChunks"] || "1");
    
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const content = file.buffer.toString("utf-8");
    
    // Call Qwen 3.7 Plus via OpenRouter or compatible API
    const apiKey = process.env["NINE_ROUTER_API_KEY"] || process.env["OPENROUTER_API_KEY"] || process.env["AI_API_KEY"] || "";
    
    if (!apiKey) {
      return res.status(500).json({ error: "AI API key not configured" });
    }

    const baseUrl = process.env["NINE_ROUTER_URL"] || "https://openrouter.ai/api/v1";
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen/qwen3-235b-a22b:free",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { 
            role: "user", 
            content: `Đây là chunk ${chunkIndex + 1}/${totalChunks} của file ${file.originalname}.\n\n${content}` 
          }
        ],
        temperature: 0.3,
        max_tokens: 8192,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(502).json({ error: "AI API error", detail: errText.slice(0, 500) });
    }

    const data = await response.json() as any;
    const translated = data.choices?.[0]?.message?.content || "";

    res.json({
      chunkIndex,
      totalChunks,
      fileName: file.originalname,
      translated,
      tokensUsed: data.usage?.total_tokens || 0,
    });
  } catch (err: any) {
    console.error("Translate error:", err);
    res.status(500).json({ error: err.message || "Internal error" });
  }
});

export default router;
