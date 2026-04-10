import { Router, type Request, type Response } from "express";
import multer from "multer";
import { execFile } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { getFfmpegBin, ensureFfmpeg } from "./youtube.js";

const router = Router();

/* ── Multer config ─────────────────────────────────────────────────────── */
const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (file.mimetype.startsWith("video/")) cb(null, true);
    else cb(new Error("File phải là video"));
  },
});

/* ── Chờ ffmpeg sẵn sàng (polling tối đa 90s) ─────────────────────────── */
function waitForFfmpeg(timeoutMs = 90_000): Promise<string | null> {
  ensureFfmpeg(); // kick download nếu chưa bắt đầu
  const start = Date.now();
  return new Promise((resolve) => {
    const check = () => {
      const bin = getFfmpegBin();
      if (bin) return resolve(bin);
      if (Date.now() - start >= timeoutMs) return resolve(null);
      setTimeout(check, 2_000);
    };
    check();
  });
}

/* ── POST /api/trim ─────────────────────────────────────────────────────── */
router.post("/trim", upload.single("video"), async (req: Request, res: Response) => {
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

  /* Chờ ffmpeg — dùng chung state từ youtube router (đã download sẵn) */
  const ffmpeg = await waitForFfmpeg(90_000);
  if (!ffmpeg) {
    fs.unlink(file.path, () => {});
    res.status(503).json({
      error: "ffmpeg đang được tải về server, vui lòng thử lại sau 1-2 phút",
    });
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
});

export default router;
