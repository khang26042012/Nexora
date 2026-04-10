import { Router, type Request, type Response } from "express";
import multer from "multer";
import { execFileSync, execFile } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const router = Router();

/* ── ffmpeg detection (chạy 1 lần khi module load, cache lại) ──────────────
 *  Thứ tự ưu tiên:
 *  1. Env var FFMPEG_PATH
 *  2. which ffmpeg (Replit nix store, Linux native)
 *  3. /usr/bin/ffmpeg, /usr/local/bin/ffmpeg
 *  4. /tmp/yt-ffmpeg — binary đã download bởi youtube.ts (Render)
 * ────────────────────────────────────────────────────────────────────────── */
function detectFfmpeg(): string | null {
  const candidates: string[] = [];

  if (process.env["FFMPEG_PATH"]) candidates.push(process.env["FFMPEG_PATH"]);

  try {
    const found = execFileSync("which", ["ffmpeg"], {
      timeout: 3_000,
      stdio: "pipe",
    })
      .toString()
      .trim();
    if (found) candidates.push(found);
  } catch {}

  candidates.push("/usr/bin/ffmpeg", "/usr/local/bin/ffmpeg", "/tmp/yt-ffmpeg");

  for (const p of candidates) {
    if (!p) continue;
    try {
      execFileSync(p, ["-version"], { timeout: 3_000, stdio: "pipe" });
      return p;
    } catch {}
  }
  return null;
}

const FFMPEG_PATH = detectFfmpeg();
console.log("[trim] ffmpeg:", FFMPEG_PATH ?? "NOT FOUND");

/* ── Multer config ─────────────────────────────────────────────────────── */
const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (file.mimetype.startsWith("video/")) cb(null, true);
    else cb(new Error("File phải là video"));
  },
});

/* ── POST /api/trim ─────────────────────────────────────────────────────── */
router.post("/trim", upload.single("video"), (req: Request, res: Response) => {
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

  /* ffmpeg có sẵn không? Nếu chưa có lúc khởi động, thử lại một lần */
  const ffmpeg = FFMPEG_PATH ?? detectFfmpeg();
  if (!ffmpeg) {
    fs.unlink(file.path, () => {});
    res
      .status(503)
      .json({ error: "ffmpeg chưa sẵn sàng, thử lại sau vài giây" });
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
    "-i",
    file.path,
    "-ss",
    String(startSec),
    "-t",
    String(duration),
    "-c",
    "copy",
    "-avoid_negative_ts",
    "1",
    outPath,
  ];

  execFile(ffmpeg, args, { timeout: 5 * 60 * 1000 }, (err) => {
    fs.unlink(file.path, () => {});

    if (err) {
      fs.unlink(outPath, () => {});
      res.status(500).json({
        error:
          "Cắt video thất bại: " +
          (err.message ?? "lỗi không xác định"),
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
