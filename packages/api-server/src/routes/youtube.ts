import { Router } from "express";
import { execFile, execFileSync } from "child_process";
import path from "path";
import fs from "fs";
import https from "https";

const router = Router();

/* ── Cookie setup ──────────────────────────────────────────────
 *  Nếu env YOUTUBE_COOKIES được set (nội dung Netscape cookies.txt),
 *  server ghi ra /tmp/yt-cookies.txt và yt-dlp sẽ dùng file này.
 * ──────────────────────────────────────────────────────────── */
const COOKIES_PATH = "/tmp/yt-cookies.txt";

function setupCookies() {
  const raw = process.env["YOUTUBE_COOKIES"];
  if (!raw) return false;
  try {
    const decoded = raw.startsWith("# Netscape") ? raw
      : Buffer.from(raw, "base64").toString("utf8");
    fs.writeFileSync(COOKIES_PATH, decoded, { mode: 0o600 });
    return true;
  } catch { return false; }
}

const hasCookies = setupCookies();

/* ── Generic file downloader (follow redirects) ─────────────── */
function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tmp = dest + ".tmp";
    const file = fs.createWriteStream(tmp);
    const get = (u: string) => https.get(u, { timeout: 60_000 }, res => {
      if ((res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308)
          && res.headers.location) {
        res.resume();
        return get(res.headers.location);
      }
      if (res.statusCode !== 200) {
        res.resume(); file.destroy();
        try { fs.unlinkSync(tmp); } catch {}
        return reject(new Error(`HTTP ${res.statusCode} for ${u}`));
      }
      res.pipe(file);
      file.on("finish", () => {
        try { fs.renameSync(tmp, dest); resolve(); }
        catch(e) { reject(e); }
      });
      file.on("error", (e) => { try { fs.unlinkSync(tmp); } catch {} reject(e); });
    }).on("error", (e) => { file.destroy(); try { fs.unlinkSync(tmp); } catch {} reject(e); });
    get(url);
  });
}

/* ── yt-dlp binary ───────────────────────────────────────────── */
const LATEST_BIN = "/tmp/yt-dlp-latest";
const GH_YT_DLP  = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp";

/* Kiểm tra binary có chạy được không (đúng arch, có permission) */
function isBinUsable(p: string): boolean {
  if (!fs.existsSync(p)) return false;
  try {
    fs.chmodSync(p, "755");
    execFileSync(p, ["--version"], { timeout: 5_000, stdio: "pipe" });
    return true;
  } catch { return false; }
}

function findNodeModulesBin(): string | null {
  const candidates: string[] = [];

  /* pnpm monorepo */
  try {
    const base = path.join(process.cwd(), "node_modules/.pnpm");
    const dirs = fs.readdirSync(base).filter(d => d.startsWith("yt-dlp-exec"));
    for (const d of dirs) {
      candidates.push(path.join(base, d, "node_modules/yt-dlp-exec/bin/yt-dlp"));
    }
  } catch {}

  /* npm / standalone */
  candidates.push(
    path.join(process.cwd(), "node_modules/yt-dlp-exec/bin/yt-dlp"),
    path.join(process.cwd(), "node_modules/.bin/yt-dlp"),
    "/tmp/yt-dlp",
  );

  for (const p of candidates) {
    if (isBinUsable(p)) return p;
  }
  return null;
}

let _ytdlpReady: string | null = null;
let _ytdlpPromise: Promise<string> | null = null;

/* Nếu /tmp/yt-dlp-latest đã có từ lần trước → dùng luôn */
if (isBinUsable(LATEST_BIN)) {
  _ytdlpReady = LATEST_BIN;
}

function kickYtDlpDownload() {
  if (_ytdlpReady || _ytdlpPromise) return;
  _ytdlpPromise = downloadFile(GH_YT_DLP, LATEST_BIN)
    .then(() => {
      if (isBinUsable(LATEST_BIN)) {
        console.log("[yt-dlp] downloaded & ready:", LATEST_BIN);
        _ytdlpReady = LATEST_BIN; _ytdlpPromise = null;
        return LATEST_BIN;
      }
      throw new Error("Downloaded binary not usable");
    })
    .catch(e => {
      console.warn("[yt-dlp] download failed:", e.message);
      _ytdlpPromise = null; return "";
    });
}

async function getYtDlpBin(): Promise<string> {
  if (_ytdlpReady && isBinUsable(_ytdlpReady)) return _ytdlpReady;
  _ytdlpReady = null; /* reset nếu binary hỏng */

  const nmBin = findNodeModulesBin();
  if (nmBin) { _ytdlpReady = nmBin; return nmBin; }

  /* Chờ download nếu đang chạy */
  if (_ytdlpPromise) {
    const result = await _ytdlpPromise;
    if (result && isBinUsable(result)) return result;
  }

  /* Kick và chờ */
  kickYtDlpDownload();
  if (_ytdlpPromise) {
    const result = await _ytdlpPromise;
    if (result) return result;
  }

  throw new Error("yt-dlp binary không tìm thấy. Thử lại sau vài giây.");
}

/* ── ffmpeg detection ────────────────────────────────────────────
 *  Ưu tiên: 1) native system ffmpeg (Replit/Linux)
 *            2) /tmp/yt-ffmpeg đã download trước đó
 *            3) Download static binary từ GitHub (Render)
 * ────────────────────────────────────────────────────────────── */
const FFMPEG_BIN  = "/tmp/yt-ffmpeg";
const FFMPEG_TAR  = "/tmp/yt-ffmpeg.tar.xz";
const FFMPEG_URL  = "https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz";

let _ffmpegReady: string | null = null;
let _ffmpegDownloading = false;

function findNativeFfmpeg(): string | null {
  /* Thử các path phổ biến + which */
  const candidates = [
    process.env["FFMPEG_PATH"] ?? "",
    "/usr/bin/ffmpeg",
    "/usr/local/bin/ffmpeg",
  ];
  /* Replit đặt ffmpeg trong nix store, có sẵn qua PATH */
  try {
    const found = execFileSync("which", ["ffmpeg"], { timeout: 3_000, stdio: "pipe" }).toString().trim();
    if (found) candidates.unshift(found);
  } catch {}

  for (const p of candidates) {
    if (!p) continue;
    try {
      execFileSync(p, ["-version"], { timeout: 3_000, stdio: "pipe" });
      return p;
    } catch {}
  }
  return null;
}

function initFfmpeg() {
  /* 1. Native system ffmpeg */
  const native = findNativeFfmpeg();
  if (native) {
    _ffmpegReady = native;
    console.log("[ffmpeg] native found:", native);
    return;
  }
  /* 2. Cached binary từ lần trước */
  if (fs.existsSync(FFMPEG_BIN)) {
    try {
      execFileSync(FFMPEG_BIN, ["-version"], { timeout: 3_000, stdio: "pipe" });
      fs.chmodSync(FFMPEG_BIN, "755");
      _ffmpegReady = FFMPEG_BIN;
      console.log("[ffmpeg] cached binary ready:", FFMPEG_BIN);
      return;
    } catch {}
  }
  /* 3. Download background (Render) */
  kickFfmpegDownload();
}

function kickFfmpegDownload() {
  if (_ffmpegReady || _ffmpegDownloading) return;
  _ffmpegDownloading = true;
  console.log("[ffmpeg] no native ffmpeg found — downloading static binary (~40MB)…");

  downloadFile(FFMPEG_URL, FFMPEG_TAR)
    .then(() => new Promise<void>((resolve, reject) => {
      execFile("tar", [
        "-xJf", FFMPEG_TAR, "-C", "/tmp",
        "--wildcards", "--no-anchored", "*/ffmpeg",
        "--strip-components=2",
      ], { timeout: 120_000 }, (err) => err ? reject(err) : resolve());
    }))
    .then(() => {
      try { fs.unlinkSync(FFMPEG_TAR); } catch {}
      const extracted = "/tmp/ffmpeg";
      if (fs.existsSync(extracted)) {
        fs.renameSync(extracted, FFMPEG_BIN);
        fs.chmodSync(FFMPEG_BIN, "755");
        _ffmpegReady = FFMPEG_BIN;
        _ffmpegDownloading = false;
        console.log("[ffmpeg] static binary ready:", FFMPEG_BIN);
      } else {
        throw new Error("ffmpeg binary not found after extract");
      }
    })
    .catch(e => {
      console.warn("[ffmpeg] download/extract failed:", e.message);
      _ffmpegDownloading = false;
      try { fs.unlinkSync(FFMPEG_TAR); } catch {}
    });
}

/* Khởi tạo khi module load */
if (!_ytdlpReady) kickYtDlpDownload();
initFfmpeg();
console.log(`[yt-router] v10 loaded — cookies:${hasCookies} ffmpeg:${_ffmpegReady ?? "loading..."}`);

/* ── Platform detection ──────────────────────────────────────── */
function isYouTube(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be");
  } catch { return false; }
}

/* ── Format selector theo quality & ffmpeg availability ─────────
 *  Nếu có ffmpeg: bestvideo+bestaudio — chất lượng cao nhất
 *  Nếu chưa có:  combined formats 22/18 — không cần ffmpeg
 * ──────────────────────────────────────────────────────────────── */
function getFormatSelector(quality: string): string {
  if (_ffmpegReady) {
    const fmts: Record<string, string> = {
      best:  "bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best",
      "720p":"bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=720]+bestaudio/22/best[height<=720]/best",
      "480p":"bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=480]+bestaudio/18/best[height<=480]/best",
      "360p":"bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=360]+bestaudio/18/best[height<=360]/best",
    };
    return fmts[quality] ?? fmts["best"]!;
  } else {
    /* ffmpeg chưa sẵn → dùng combined formats (360p/720p max) */
    const fmts: Record<string, string> = {
      best:  "22/18/best[acodec!=none][vcodec!=none]/best",
      "720p":"22/best[height<=720][acodec!=none][vcodec!=none]/18/best[height<=720]/best",
      "480p":"best[height<=480][acodec!=none][vcodec!=none]/18/best[height<=480]/best",
      "360p":"18/best[height<=360][acodec!=none][vcodec!=none]/best[height<=360]/best",
    };
    return fmts[quality] ?? fmts["best"]!;
  }
}

/* ── Base yt-dlp args ────────────────────────────────────────── */
function baseArgs(opts?: { extraArgs?: string[]; download?: boolean }): string[] {
  return [
    "--no-warnings",
    "--no-check-certificate",
    "--socket-timeout", "20",
    "--no-playlist",
    ...(opts?.download ? [] : ["--ignore-no-formats-error"]),
    ...(opts?.download && _ffmpegReady ? ["--ffmpeg-location", _ffmpegReady, "--merge-output-format", "mp4"] : []),
    ...(hasCookies ? ["--cookies", COOKIES_PATH] : []),
    ...(opts?.extraArgs ?? []),
  ];
}

/* ── YouTube player_client strategies ───────────────────────── */
const YT_CLIENT_STRATEGIES = [
  [],
  ["--extractor-args", "youtube:player_client=android"],
  ["--extractor-args", "youtube:player_client=tv_embedded"],
  ["--extractor-args", "youtube:player_client=ios"],
  ["--extractor-args", "youtube:player_client=mweb"],
];

/* ── Non-YouTube: single attempt, no player_client tricks ────── */
const NON_YT_STRATEGIES = [
  [],
];

/* ── Helper: chạy yt-dlp ─────────────────────────────────────── */
function runYtDlp(bin: string, args: string[], timeout = 40_000): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(bin, args, { maxBuffer: 16 * 1024 * 1024, timeout },
      (err, stdout, stderr) => {
        if (err) {
          const raw = (stderr || err.message || "").trim();
          return reject(new Error(raw.split("\n").filter(Boolean).slice(-4).join(" | ")));
        }
        resolve(stdout.trim());
      }
    );
  });
}

/* ── Helper: lỗi có nên retry không ─────────────────────────── */
function isRetryableErr(msg: string): boolean {
  return msg.includes("format") || msg.includes("No video")
    || msg.includes("player_client") || msg.includes("Requested")
    || msg.includes("Failed to extract") || msg.includes("unavailable")
    || msg.includes("Unavailable") || msg.includes("This video")
    || msg.includes("Sign in") || msg.includes("bot check");
}

/* ── GET /api/yt/info?url=... ────────────────────────────────── */
router.get("/info", async (req, res) => {
  const url = String(req.query["url"] ?? "").trim();
  if (!url) return res.status(400).json({ error: "Thiếu tham số url" });

  const strategies = isYouTube(url) ? YT_CLIENT_STRATEGIES : NON_YT_STRATEGIES;

  try {
    const bin = await getYtDlpBin();
    let lastErr = "";

    for (const extraArgs of strategies) {
      try {
        const args = [url, "--dump-single-json", "--skip-download", ...baseArgs({ extraArgs })];
        const stdout = await runYtDlp(bin, args, 30_000);
        let data: any;
        try { data = JSON.parse(stdout); }
        catch { throw new Error("Không parse được JSON từ yt-dlp"); }

        const formats: any[] = data.formats ?? [];
        const hasDownloadable = formats.some(f => f.url && !f.url.startsWith("manifest"));
        if (!hasDownloadable) {
          lastErr = "Video unavailable hoặc không có format tải được từ server này";
          continue;
        }

        return res.json({
          title:     data.title         ?? "Unknown",
          thumbnail: data.thumbnail      ?? "",
          duration:  data.duration       ?? 0,
          channel:   data.channel        ?? data.uploader ?? "Unknown",
          platform:  data.extractor_key  ?? "Unknown",
          ffmpegAvailable: !!_ffmpegReady,
        });
      } catch (e: any) {
        lastErr = e.message ?? "Lỗi không xác định";
        if (!isRetryableErr(lastErr)) break;
      }
    }

    const isUnavailable = lastErr.includes("unavailable") || lastErr.includes("Unavailable")
      || lastErr.includes("Video unavailable") || lastErr.includes("blocked");
    const isBotCheck = lastErr.includes("Sign in") || lastErr.includes("bot")
      || lastErr.includes("cookies") || lastErr.includes("confirm");

    if (isUnavailable) {
      return res.status(500).json({ error: "Video không tải được từ server (có thể bị geo-block, IP block, hoặc cần đăng nhập)" });
    }
    const hint = isBotCheck ? " | Cần set YOUTUBE_COOKIES để bypass bot-check." : "";
    return res.status(500).json({ error: `yt-dlp: ${lastErr}${hint}` });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lỗi không xác định";
    return res.status(500).json({ error: `Lỗi server: ${msg}` });
  }
});

/* ── GET /api/yt/download?url=...&quality=best|720p|480p|360p ── */
router.get("/download", async (req, res) => {
  const url     = String(req.query["url"]     ?? "").trim();
  const quality = String(req.query["quality"] ?? "best").trim();
  const title   = String(req.query["title"]   ?? "video").trim();

  if (!url) return res.status(400).json({ error: "Thiếu tham số url" });

  const strategies = isYouTube(url) ? YT_CLIENT_STRATEGIES : NON_YT_STRATEGIES;
  const fmt = getFormatSelector(quality);

  const tmpFile = `/tmp/yt_${Date.now()}_${Math.random().toString(36).slice(2)}.%(ext)s`;

  const cleanup = () => {
    const base = tmpFile.replace(".%(ext)s", "");
    try {
      for (const e of ["mp4","webm","mkv","m4a","mp3","part","tmp"]) {
        const p = `${base}.${e}`;
        if (fs.existsSync(p)) fs.unlinkSync(p);
      }
    } catch {}
  };

  try {
    const bin = await getYtDlpBin();
    let lastErr = "";

    for (const extraArgs of strategies) {
      try {
        const args = [
          url,
          "-o", tmpFile,
          "-f", fmt,
          ...baseArgs({ extraArgs, download: true }),
        ];

        const clientLabel = extraArgs.length > 0 ? (extraArgs[1] ?? "custom") : "default";
        console.log(`[yt-download] platform=${isYouTube(url)?"yt":"other"} client=${clientLabel} fmt=${fmt.slice(0,40)} ffmpeg=${!!_ffmpegReady}`);

        await new Promise<void>((resolve, reject) => {
          execFile(bin, args, { timeout: 300_000 }, (err, _stdout, stderr) => {
            if (err) {
              return reject(new Error((stderr || err.message).trim().split("\n").filter(Boolean).slice(-3).join(" | ")));
            }
            resolve();
          });
        });

        /* Tìm file đã tải */
        const base = tmpFile.replace(".%(ext)s", "");
        const actualFile = ["mp4","webm","mkv","m4a","mp3"]
          .map(e => `${base}.${e}`)
          .find(p => fs.existsSync(p));

        if (!actualFile) {
          lastErr = "No video formats found";
          continue;
        }

        const stat = fs.statSync(actualFile);
        if (stat.size === 0) {
          fs.unlinkSync(actualFile);
          lastErr = "File tải về rỗng";
          continue;
        }

        const ext  = actualFile.split(".").pop() ?? "mp4";
        const safeTitle = title.replace(/[^\w\s\-\(\)\[\]]/g, "").trim().slice(0, 80) || "video";
        const filename  = `${safeTitle}_${quality}.${ext}`;
        const mime = ext === "webm" ? "video/webm" : ext === "mkv" ? "video/x-matroska" : "video/mp4";

        res.setHeader("Content-Type", mime);
        res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
        res.setHeader("Content-Length", stat.size);

        const stream = fs.createReadStream(actualFile);
        stream.pipe(res);
        stream.on("end",   () => cleanup());
        stream.on("error", () => cleanup());
        req.on("close",    () => cleanup());
        return;

      } catch (e: any) {
        lastErr = e.message ?? "Lỗi không xác định";
        console.warn(`[yt-download] failed:`, lastErr.slice(0, 150));
        if (!isRetryableErr(lastErr)) break;
      }
    }

    cleanup();
    const isUnavail = lastErr.includes("unavailable") || lastErr.includes("Unavailable")
      || lastErr.includes("blocked");
    const isBotCheck = lastErr.includes("Sign in") || lastErr.includes("bot")
      || lastErr.includes("cookies") || lastErr.includes("confirm");

    let msg = isUnavail
      ? "Video không tải được từ server (geo-block, IP block, hoặc cần đăng nhập)"
      : `yt-dlp: ${lastErr}`;
    if (isBotCheck) msg += " | Cần set YOUTUBE_COOKIES để bypass.";

    if (!res.headersSent) res.status(500).json({ error: msg });

  } catch (err: unknown) {
    cleanup();
    const msg = err instanceof Error ? err.message : "Lỗi không xác định";
    if (!res.headersSent) res.status(500).json({ error: `Lỗi server: ${msg}` });
  }
});

export default router;
