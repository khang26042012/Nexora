import { Router, type Request, type Response } from "express";
import multer from "multer";
import { execFileSync, execFile } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const router = Router();

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (file.mimetype.startsWith("video/")) cb(null, true);
    else cb(new Error("File phải là video"));
  },
});

function getFfmpegPath(): string {
  try {
    const found = execFileSync("which", ["ffmpeg"], {
      timeout: 3_000,
      stdio: "pipe",
    })
      .toString()
      .trim();
    if (found) return found;
  } catch {}
  const candidates = [
    process.env["FFMPEG_PATH"] ?? "",
    "/usr/bin/ffmpeg",
    "/usr/local/bin/ffmpeg",
    "/nix/store/s41bqqrym7dlk8m3nk74fx26kgrx0kv8-replit-runtime-path/bin/ffmpeg",
  ];
  for (const c of candidates) {
    if (c && fs.existsSync(c)) return c;
  }
  throw new Error("ffmpeg not found");
}

router.post(
  "/trim",
  upload.single("video"),
  (req: Request, res: Response) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "Không có file video" });
      return;
    }

    const startSec = parseFloat(req.body["start"] ?? "0");
    const endSec = parseFloat(req.body["end"] ?? "0");

    if (isNaN(startSec) || isNaN(endSec) || endSec <= startSec) {
      fs.unlink(file.path, () => {});
      res.status(400).json({ error: "Mốc thời gian không hợp lệ" });
      return;
    }

    let ffmpeg: string;
    try {
      ffmpeg = getFfmpegPath();
    } catch {
      fs.unlink(file.path, () => {});
      res.status(500).json({ error: "ffmpeg không khả dụng trên server" });
      return;
    }

    const ext = path.extname(file.originalname || "video.mp4") || ".mp4";
    const safeExt = [".mp4", ".mov", ".avi", ".mkv", ".webm"].includes(ext)
      ? ext
      : ".mp4";
    const outPath = file.path + "_trimmed" + safeExt;
    const duration = endSec - startSec;

    const args = [
      "-y",
      "-i", file.path,
      "-ss", String(startSec),
      "-t", String(duration),
      "-c", "copy",
      "-avoid_negative_ts", "1",
      outPath,
    ];

    execFile(ffmpeg, args, { timeout: 5 * 60 * 1000 }, (err) => {
      fs.unlink(file.path, () => {});

      if (err) {
        fs.unlink(outPath, () => {});
        res.status(500).json({
          error: "Cắt video thất bại: " + (err.message ?? "lỗi không xác định"),
        });
        return;
      }

      const baseName = (file.originalname ?? "video")
        .replace(/\.[^.]+$/, "")
        .replace(/[^\w\s\-]/g, "")
        .trim()
        .slice(0, 60) || "trimmed";
      const downloadName = `${baseName}_trimmed${safeExt}`;

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${downloadName}"`,
      );
      res.setHeader("Content-Type", "video/mp4");

      const stream = fs.createReadStream(outPath);
      stream.pipe(res);
      stream.on("end", () => fs.unlink(outPath, () => {}));
      stream.on("error", () => {
        fs.unlink(outPath, () => {});
        if (!res.headersSent) {
          res.status(500).json({ error: "Lỗi khi gửi file" });
        }
      });
    });
  },
);

export default router;
