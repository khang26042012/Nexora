import { Router } from "express";
import { execFile } from "child_process";
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
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        res.resume();
        return get(res.headers.location);
      }
      if (res.statusCode !== 200) {
        res.resume(); file.destroy();
        return reject(new Error(`HTTP ${res.statusCode} for ${u}`));
      }
      res.pipe(file);
      file.on("finish", () => {
        try { fs.renameSync(tmp, dest); resolve(); }
        catch(e) { reject(e); }
      });
    }).on("error", (e) => { file.destroy(); reject(e); });
    get(url);
  });
}

/* ── yt-dlp binary ───────────────────────────────────────────── */
const LATEST_BIN = "/tmp/yt-dlp-latest";
const GH_YT_DLP  = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp";

function findNodeModulesBin(): string | null {
  const candidates = [
    ...(() => {
      try {
        const base = path.join(process.cwd(), "node_modules/.pnpm");
        return fs.readdirSync(base)
          .filter(d => d.startsWith("yt-dlp-exec"))
          .map(d => path.join(base, d, "node_modules/yt-dlp-exec/bin/yt-dlp"));
      } catch { return []; }
    })(),
    path.join(process.cwd(), "node_modules/yt-dlp-exec/bin/yt-dlp"),
    "/tmp/yt-dlp",
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) { fs.chmodSync(p, "755"); return p; }
  }
  return null;
}

let _ytdlpReady: string | null = null;
let _ytdlpPromise: Promise<string> | null = null;

function kickYtDlpDownload() {
  if (_ytdlpReady || _ytdlpPromise) return;
  _ytdlpPromise = downloadFile(GH_YT_DLP, LATEST_BIN)
    .then(() => {
      fs.chmodSync(LATEST_BIN, "755");
      console.log("[yt-dlp] ready:", LATEST_BIN);
      _ytdlpReady = LATEST_BIN; _ytdlpPromise = null;
      return LATEST_BIN;
    })
    .catch(e => {
      console.warn("[yt-dlp] download failed:", e.message);
      _ytdlpPromise = null; return "";
    });
}

async function getYtDlpBin(): Promise<string> {
  if (_ytdlpReady && fs.existsSync(_ytdlpReady)) return _ytdlpReady;
  const nmBin = findNodeModulesBin();
  kickYtDlpDownload();
  if (nmBin) return nmBin;
  if (_ytdlpPromise) return _ytdlpPromise;
  return downloadFile(GH_YT_DLP, LATEST_BIN).then(() => {
    fs.chmodSync(LATEST_BIN, "755");
    _ytdlpReady = LATEST_BIN;
    return LATEST_BIN;
  });
}

/* ── ffmpeg static binary ────────────────────────────────────────
 *  Render không có ffmpeg → tự download static binary từ GitHub
 *  Download chạy background; trong thời gian chờ dùng format không cần ffmpeg
 * ──────────────────────────────────────────────────────────────── */
const FFMPEG_BIN = "/tmp/yt-ffmpeg";
const FFMPEG_TAR = "/tmp/yt-ffmpeg.tar.xz";
/* yt-dlp FFmpeg Builds — static linux64 ~40MB */
const FFMPEG_URL = "https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz";

let _ffmpegReady: string | null = null;
let _ffmpegDownloading = false;

function kickFfmpegDownload() {
  if (_ffmpegReady || _ffmpegDownloading) return;

  /* Nếu đã có binary từ lần chạy trước (ephemeral fs) */
  if (fs.existsSync(FFMPEG_BIN)) {
    try { fs.chmodSync(FFMPEG_BIN, "755"); _ffmpegReady = FFMPEG_BIN; console.log("[ffmpeg] cached:", FFMPEG_BIN); return; } catch {}
  }

  _ffmpegDownloading = true;
  console.log("[ffmpeg] downloading static binary (~40MB)…");

  downloadFile(FFMPEG_URL, FFMPEG_TAR)
    .then(() => new Promise<void>((resolve, reject) => {
      /* Extract ffmpeg binary from tarball */
      execFile("tar", [
        "-xJf", FFMPEG_TAR,
        "-C", "/tmp",
        "--wildcards", "--no-anchored", "*/ffmpeg",
        "--strip-components=2",   /* ffmpeg-master-…/bin/ffmpeg → /tmp/ffmpeg */
      ], { timeout: 120_000 }, (err) => err ? reject(err) : resolve());
    }))
    .then(() => {
      try { fs.unlinkSync(FFMPEG_TAR); } catch {}
      /* binary đặt tại /tmp/ffmpeg sau khi extract */
      const extracted = "/tmp/ffmpeg";
      if (fs.existsSync(extracted)) {
        fs.renameSync(extracted, FFMPEG_BIN);
        fs.chmodSync(FFMPEG_BIN, "755");
        _ffmpegReady = FFMPEG_BIN;
        _ffmpegDownloading = false;
        console.log("[ffmpeg] ready:", FFMPEG_BIN);
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

/* Kick ngay khi module load */
kickYtDlpDownload();
kickFfmpegDownload();
console.log(`[yt-router] v9 loaded — cookies:${hasCookies} ffmpeg_cached:${fs.existsSync(FFMPEG_BIN)}`);

/* ── Format selector theo quality & ffmpeg availability ─────────
 *  Nếu có ffmpeg: bestvideo+bestaudio/best — chất lượng cao nhất
 *  Nếu chưa có:  22/18/best (combined không cần ffmpeg) — fallback
 * ──────────────────────────────────────────────────────────────── */
function getFormatSelector(quality: string): string {
  if (_ffmpegReady) {
    /* ffmpeg có sẵn → dùng adaptive streams, tự merge */
    const fmts: Record<string, string> = {
      best:  "bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best",
      "720p":"bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=720]+bestaudio/22/best[height<=720]/best",
      "480p":"bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=480]+bestaudio/18/best[height<=480]/best",
      "360p":"bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=360]+bestaudio/18/best[height<=360]/best",
    };
    return fmts[quality] ?? fmts["best"]!;
  } else {
    /* ffmpeg chưa sẵn → dùng combined formats không cần merge */
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
    "--socket-timeout", "15",
    "--no-playlist",
    ...(opts?.download ? [] : ["--ignore-no-formats-error"]),
    ...(opts?.download && _ffmpegReady ? ["--ffmpeg-location", _ffmpegReady, "--merge-output-format", "mp4"] : []),
    ...(hasCookies ? ["--cookies", COOKIES_PATH] : []),
    ...(opts?.extraArgs ?? []),
  ];
}

/* ── Thử nhiều player_client ────────────────────────────────── */
const YT_CLIENT_STRATEGIES = [
  [],                                                               // default web — có itag 22/18 nếu có cookies
  ["--extractor-args", "youtube:player_client=android"],           // bypass datacenter IP
  ["--extractor-args", "youtube:player_client=tv_embedded"],
  ["--extractor-args", "youtube:player_client=mweb"],
];

/* ── Helper: chạy yt-dlp ─────────────────────────────────────── */
function runYtDlp(bin: string, args: string[], timeout = 35_000): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(bin, args, { maxBuffer: 8 * 1024 * 1024, timeout },
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
    || msg.includes("Unavailable") || msg.includes("This video");
}

/* ── GET /api/yt/info?url=... ──────────────────────────────── */
router.get("/info", async (req, res) => {
  const url = String(req.query["url"] ?? "").trim();
  if (!url) return res.status(400).json({ error: "Thiếu tham số url" });

  try {
    const bin = await getYtDlpBin();
    let lastErr = "";

    for (const extraArgs of YT_CLIENT_STRATEGIES) {
      try {
        const args = [url, "--dump-single-json", "--skip-download", ...baseArgs({ extraArgs })];
        const stdout = await runYtDlp(bin, args, 22_000);
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
        });
      } catch (e: any) {
        lastErr = e.message ?? "Lỗi không xác định";
        if (!isRetryableErr(lastErr)) break;
      }
    }

    const isUnavailable = lastErr.includes("unavailable") || lastErr.includes("Unavailable")
      || lastErr.includes("Video unavailable");
    const isBotCheck = lastErr.includes("Sign in") || lastErr.includes("bot")
      || lastErr.includes("cookies") || lastErr.includes("confirm");

    if (isUnavailable) {
      return res.status(500).json({ error: "Video không tải được từ server (có thể bị geo-block hoặc cần đăng nhập YouTube)" });
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

  const fmt = getFormatSelector(quality);

  const tmpFile = `/tmp/yt_${Date.now()}_${Math.random().toString(36).slice(2)}.%(ext)s`;

  const cleanup = () => {
    const base = tmpFile.replace(".%(ext)s", "");
    try {
      for (const e of ["mp4","webm","mkv","m4a","mp3","part"]) {
        const p = `${base}.${e}`;
        if (fs.existsSync(p)) fs.unlinkSync(p);
      }
    } catch {}
  };

  try {
    const bin = await getYtDlpBin();
    let lastErr = "";

    for (const extraArgs of YT_CLIENT_STRATEGIES) {
      try {
        const args = [
          url,
          "-o", tmpFile,
          "-f", fmt,
          ...baseArgs({ extraArgs, download: true }),
        ];

        console.log(`[yt-download] client=${extraArgs[1] ?? "web"} fmt=${fmt.slice(0,40)} ffmpeg=${!!_ffmpegReady}`);

        await new Promise<void>((resolve, reject) => {
          execFile(bin, args, { timeout: 180_000 }, (err, _stdout, stderr) => {
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
        const ext  = actualFile.split(".").pop() ?? "mp4";
        const safeTitle = title.replace(/[^\w\s\-\(\)\[\]]/g, "").trim().slice(0, 80) || "video";
        const filename  = `${safeTitle}_${quality}.${ext}`;
        const mime = ext === "webm" ? "video/webm" : ext === "mkv" ? "video/x-matroska" : "video/mp4";

        res.setHeader("Content-Type", mime);
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Content-Length", stat.size);

        const stream = fs.createReadStream(actualFile);
        stream.pipe(res);
        stream.on("end",   () => cleanup());
        stream.on("error", () => cleanup());
        req.on("close",    () => cleanup());
        return;

      } catch (e: any) {
        lastErr = e.message ?? "Lỗi không xác định";
        console.warn(`[yt-download] failed client=${extraArgs[1] ?? "web"}:`, lastErr.slice(0, 120));
        if (!isRetryableErr(lastErr)) break;
      }
    }

    cleanup();
    const isUnavail = lastErr.includes("unavailable") || lastErr.includes("Unavailable");
    const msg = isUnavail
      ? "Video không tải được từ server (geo-block hoặc cần đăng nhập)"
      : `yt-dlp: ${lastErr}`;
    if (!res.headersSent) res.status(500).json({ error: msg });

  } catch (err: unknown) {
    cleanup();
    const msg = err instanceof Error ? err.message : "Lỗi không xác định";
    if (!res.headersSent) res.status(500).json({ error: `Lỗi server: ${msg}` });
  }
});

export default router;
