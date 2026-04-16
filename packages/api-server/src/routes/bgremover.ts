import { Router, type Request, type Response } from "express";
import multer from "multer";
import { insertToolLog } from "../lib/admin-db.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

router.post("/bg-remove", upload.single("image"), async (req: Request, res: Response) => {
  if (!req.file) { res.status(400).json({ error: "Không có file ảnh" }); return; }

  const apiKey = process.env.REMOVE_BG_API_KEY;
  if (!apiKey) { res.status(503).json({ error: "Chưa cấu hình REMOVE_BG_API_KEY" }); return; }

  const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? req.ip ?? "unknown";
  insertToolLog({ ip, tool: "bg-remover", action: "remove", detail: `size=${req.file.size}` });

  try {
    const form = new FormData();
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
    form.append("image_file", blob, req.file.originalname ?? "image.jpg");
    form.append("size", "auto");
    form.append("format", "png");
    form.append("type", "auto");

    const response = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: { "X-Api-Key": apiKey },
      body: form,
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      let msg = `remove.bg lỗi ${response.status}`;
      try {
        const j = JSON.parse(errText);
        msg = j?.errors?.[0]?.title ?? msg;
      } catch { /* ignore */ }
      res.status(response.status).json({ error: msg });
      return;
    }

    const resultBuf = Buffer.from(await response.arrayBuffer());
    const credits = response.headers.get("X-Credits-Charged") ?? "?";

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", 'attachment; filename="no_bg.png"');
    res.setHeader("X-Credits-Charged", credits);
    res.setHeader("Content-Length", resultBuf.length);
    res.send(resultBuf);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Lỗi server" });
  }
});

export default router;
