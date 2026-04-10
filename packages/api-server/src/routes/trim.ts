import { Router, type Request, type Response } from "express";
import multer from "multer";
import { execFile, execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import https from "https";
import http from "http";

const router = Router();

/* ══════════════════════════════════════════════════════════════════
 *  FFMPEG — tự lo hoàn toàn, không phụ thuộc module khác
 *  Ưu tiên: 1) system native  2) /tmp/yt-ffmpeg (nếu youtube.ts đã dl)
 *            3) tự download về /tmp/trim-ffmpeg
 * ══════════════════════════════════════════════════════════════════ */
const TRIM_BIN     = "/tmp/trim-ffmpeg";
const TRIM_TAR     = "/tmp/trim-ffmpeg.tar.xz";
const FFMPEG_URL   = "https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz";
const YT_BIN       = "/tmp/yt-ffmpeg";   // fallback: youtube.ts đã dl

let _ffmpegBin: string | null = null;
let _downloading  = false;

function tryBin(p: string): boolean {
  if (!p || !fs.existsSync(p)) return false;
  try { execFileSync(p, ["-version"], { timeout: 3_000, stdio: "pipe" }); return true; }
  catch { return false; }
}

function findNative(): string | null {
  const candidates: string[] = [
    process.env["FFMPEG_PATH"] ?? "",
    "/usr/bin/ffmpeg",
    "/usr/local/bin/ffmpeg",
  ];
  try {
    const w = execFileSync("which", ["ffmpeg"], { timeout: 3_000, stdio: "pipe" }).toString().trim();
    if (w) candidates.unshift(w);
  } catch {}
  for (const p of candidates) {
    if (p && tryBin(p)) return p;
  }
  return null;
}

function dlFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const get = (u: string, redirects = 5) => {
      (u.startsWith("https") ? https : http).get(u, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          if (redirects <= 0) return reject(new Error("Too many redirects"));
          return get(res.headers.location, redirects - 1);
        }
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        res.pipe(file);
        file.on("finish", () => { file.close(); resolve(); });
      }).on("error", reject);
    };
    get(url);
  });
}

function hasTar(): boolean {
  try { execFileSync("tar", ["--version"], { timeout: 3_000, stdio: "pipe" }); return true; }
  catch { return false; }
}

function kickDownload() {
  if (_ffmpegBin || _downloading || !hasTar()) return;
  _downloading = true;
  console.log("[trim-ffmpeg] downloading static binary…");

  dlFile(FFMPEG_URL, TRIM_TAR)
    .then(() => new Promise<void>((resolve, reject) => {
      execFile("tar", ["-xJf", TRIM_TAR, "-C", "/tmp",
        "--wildcards", "--no-anchored", "*/ffmpeg", "--strip-components=2"],
        { timeout: 120_000 }, (err) => err ? reject(err) : resolve());
    }))
    .then(() => {
      try { fs.unlinkSync(TRIM_TAR); } catch {}
      const extracted = "/tmp/ffmpeg";
      if (fs.existsSync(extracted)) {
        fs.renameSync(extracted, TRIM_BIN);
        fs.chmodSync(TRIM_BIN, "755");
        _ffmpegBin = TRIM_BIN;
        _downloading = false;
        console.log("[trim-ffmpeg] ready:", TRIM_BIN);
      } else {
        throw new Error("binary not found after extract");
      }
    })
    .catch(e => {
      _downloading = false;
      try { fs.unlinkSync(TRIM_TAR); } catch {}
      console.warn("[trim-ffmpeg] download failed:", e.message);
    });
}

/* ── Khởi động ngay khi module load ── */
(function initTrimFfmpeg() {
  const native = findNative();
  if (native) { _ffmpegBin = native; console.log("[trim-ffmpeg] native:", native); return; }
  if (tryBin(YT_BIN))  { _ffmpegBin = YT_BIN;  console.log("[trim-ffmpeg] reuse yt-ffmpeg:", YT_BIN); return; }
  if (tryBin(TRIM_BIN)) { _ffmpegBin = TRIM_BIN; console.log("[trim-ffmpeg] cached:", TRIM_BIN); return; }
  kickDownload();
})();

/* Chờ ffmpeg sẵn sàng — poll, tối đa timeoutMs */
function waitForFfmpeg(timeoutMs = 120_000): Promise<string | null> {
  /* Nếu yt-ffmpeg vừa xong (youtube.ts download xong sau khi trim init) */
  if (!_ffmpegBin && tryBin(YT_BIN)) { _ffmpegBin = YT_BIN; }
  if (_ffmpegBin) return Promise.resolve(_ffmpegBin);

  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const tick = () => {
      if (!_ffmpegBin && tryBin(YT_BIN)) _ffmpegBin = YT_BIN;
      if (_ffmpegBin) return resolve(_ffmpegBin);
      if (Date.now() >= deadline) return resolve(null);
      setTimeout(tick, 2_000);
    };
    setTimeout(tick, 2_000);
  });
}

/* ── Multer ─────────────────────────────────────────────────────── */
const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (file.mimetype.startsWith("video/")) cb(null, true);
    else cb(new Error("File phải là video"));
  },
});

/* ── POST /api/trim ─────────────────────────────────────────────── */
router.post("/trim", upload.single("video"), async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) { res.status(400).json({ error: "Không có file video" }); return; }

  const startSec  = parseFloat(req.body["start"] ?? "0");
  const endSec    = parseFloat(req.body["end"]   ?? "0");

  if (isNaN(startSec) || isNaN(endSec) || endSec <= startSec) {
    fs.unlink(file.path, () => {});
    res.status(400).json({ error: "Mốc thời gian không hợp lệ" });
    return;
  }

  const ffmpeg = await waitForFfmpeg(120_000);
  if (!ffmpeg) {
    fs.unlink(file.path, () => {});
    res.status(503).json({ error: "Server đang tải ffmpeg, vui lòng thử lại sau 1-2 phút" });
    return;
  }

  const ext = path.extname(file.originalname || "video.mp4") || ".mp4";
  const safeExt = [".mp4", ".mov", ".avi", ".mkv", ".webm"].includes(ext) ? ext : ".mp4";
  const outPath  = file.path + "_trimmed" + safeExt;
  const duration = endSec - startSec;

  const args = [
    "-y",
    "-i", file.path,
    "-ss", String(startSec),
    "-t",  String(duration),
    "-c", "copy",
    "-avoid_negative_ts", "1",
    outPath,
  ];

  execFile(ffmpeg, args, { timeout: 5 * 60 * 1000 }, (err) => {
    fs.unlink(file.path, () => {});
    if (err) {
      fs.unlink(outPath, () => {});
      res.status(500).json({ error: "Cắt video thất bại: " + (err.message ?? "lỗi không xác định") });
      return;
    }

    const baseName = (file.originalname ?? "video")
      .replace(/\.[^.]+$/, "").replace(/[^\w\s\-]/g, "").trim().slice(0, 60) || "trimmed";
    const dlName = `${baseName}_trimmed${safeExt}`;

    res.setHeader("Content-Disposition", `attachment; filename="${dlName}"`);
    res.setHeader("Content-Type", "video/mp4");

    const stream = fs.createReadStream(outPath);
    stream.pipe(res);
    stream.on("end",   () => fs.unlink(outPath, () => {}));
    stream.on("error", () => { fs.unlink(outPath, () => {}); if (!res.headersSent) res.status(500).end(); });
  });
});

export default router;
