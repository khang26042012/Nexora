import { Router, type Request, type Response } from "express";
import multer from "multer";
import sharp from "sharp";
import { insertToolLog } from "../lib/admin-db.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

router.post("/compress", upload.single("image"), async (req: Request, res: Response) => {
  if (!req.file) { res.status(400).json({ error: "Không có file ảnh" }); return; }

  const quality  = Math.min(100, Math.max(1, parseInt(req.body.quality ?? "80", 10)));
  const format   = (req.body.format ?? "webp") as "webp" | "jpeg" | "png";
  const origSize = req.file.size;

  const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? req.ip ?? "unknown";
  insertToolLog({ ip, tool: "compress", action: format, detail: `q=${quality} orig=${origSize}` });

  try {
    let pipeline = sharp(req.file.buffer);
    const meta = await pipeline.metadata();

    if (format === "webp")       pipeline = pipeline.webp({ quality });
    else if (format === "jpeg")  pipeline = pipeline.jpeg({ quality, mozjpeg: true });
    else                         pipeline = pipeline.png({ compressionLevel: Math.round((100 - quality) / 11.1) });

    const output = await pipeline.toBuffer();

    res.setHeader("Content-Type", `image/${format}`);
    res.setHeader("Content-Length", output.length);
    res.setHeader("X-Original-Size", origSize.toString());
    res.setHeader("X-Compressed-Size", output.length.toString());
    res.setHeader("X-Width", (meta.width ?? 0).toString());
    res.setHeader("X-Height", (meta.height ?? 0).toString());
    res.setHeader("Content-Disposition", `attachment; filename="compressed.${format}"`);
    res.end(output);
  } catch (e) {
    res.status(500).json({ error: "Không thể xử lý ảnh — định dạng không hỗ trợ" });
  }
});

export default router;
