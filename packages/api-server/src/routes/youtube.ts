import { Router } from "express";
import { execFile } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";
import { resolve } from "path";
import { createRequire } from "module";

const router = Router();
const execFileAsync = promisify(execFile);

/* ── Tìm đường dẫn binary yt-dlp (lazy — chỉ throw khi thực sự dùng) ── */
let _ytDlpPath: string | null = null;

function findYtDlpBin(): string {
  if (_ytDlpPath) return _ytDlpPath;

  /* 1. Biến môi trường cho phép override */
  if (process.env.YOUTUBE_DL_PATH) {
    _ytDlpPath = process.env.YOUTUBE_DL_PATH;
    return _ytDlpPath;
  }

  /* 2. Tìm qua require.resolve từ package yt-dlp-exec */
  try {
    const req = createRequire(import.meta.url);
    const pkgDir = resolve(req.resolve("yt-dlp-exec"), "../..");
    const candidate = resolve(pkgDir, "bin/yt-dlp");
    if (existsSync(candidate)) { _ytDlpPath = candidate; return _ytDlpPath; }
  } catch {}

  /* 3. Fallback — thử nhiều path (Replit dev, Render production, hệ thống) */
  const cwd = process.cwd();
  const fallbacks = [
    /* Render production: start từ /opt/render/project/src */
    resolve(cwd, "node_modules/.pnpm/yt-dlp-exec@1.0.2/node_modules/yt-dlp-exec/bin/yt-dlp"),
    /* Replit dev: start từ packages/api-server */
    resolve(cwd, "../../node_modules/.pnpm/yt-dlp-exec@1.0.2/node_modules/yt-dlp-exec/bin/yt-dlp"),
    /* npm install (không pnpm) */
    resolve(cwd, "node_modules/yt-dlp-exec/bin/yt-dlp"),
    resolve(cwd, "../../node_modules/yt-dlp-exec/bin/yt-dlp"),
    /* System yt-dlp */
    "/usr/bin/yt-dlp",
    "/usr/local/bin/yt-dlp",
  ];
  for (const p of fallbacks) {
    if (existsSync(p)) { _ytDlpPath = p; return _ytDlpPath; }
  }

  throw new Error(`Không tìm thấy yt-dlp binary. cwd=${cwd}. Cần chạy pnpm install trước.`);
}

/* ── Gọi yt-dlp → JSON ── */
async function ytDlpInfo(url: string): Promise<any> {
  const { stdout } = await execFileAsync(findYtDlpBin(), [
    url,
    "--dump-single-json",
    "--no-warnings",
    "--no-call-home",
    "--no-check-certificate",
    "--prefer-free-formats",
    "--youtube-skip-dash-manifest",
  ], { maxBuffer: 50 * 1024 * 1024, timeout: 30000 });

  return JSON.parse(stdout);
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m?.[1]) return m[1];
  }
  return null;
}

/* ── GET /api/yt/info?url=... ── */
router.get("/info", async (req, res) => {
  const url = String(req.query["url"] ?? "");
  if (!url) return res.status(400).json({ error: "Thiếu tham số url" });

  const videoId = extractVideoId(url);
  if (!videoId) return res.status(400).json({ error: "Link YouTube không hợp lệ" });

  try {
    const info = await ytDlpInfo(url);

    const title    = info.title    ?? "Video";
    const channel  = info.uploader ?? "";
    const duration = info.duration ?? 0;
    const thumbnail = info.thumbnail
      ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    const allFormats: any[] = info.formats ?? [];

    /* Lọc combined (video+audio) có URL trực tiếp */
    const combined = allFormats.filter((f: any) =>
      f.url &&
      f.vcodec && f.vcodec !== "none" &&
      f.acodec && f.acodec !== "none" &&
      (f.height ?? 0) > 0
    );

    const qualityBands = [
      { itag: "1080", label: "1080p", minH: 900,  maxH: 9999 },
      { itag: "720",  label: "720p",  minH: 650,  maxH: 899  },
      { itag: "480",  label: "480p",  minH: 400,  maxH: 649  },
      { itag: "360",  label: "360p",  minH: 0,    maxH: 399  },
    ];

    const formats: Array<{ itag: string; quality: string; ext: string; url: string }> = [];
    const base = `${req.protocol}://${req.get("host")}`;
    const enc  = (v: string) => encodeURIComponent(v);

    for (const q of qualityBands) {
      const candidates = combined
        .filter((f: any) => (f.height ?? 0) >= q.minH && (f.height ?? 0) <= q.maxH)
        .sort((a: any, b: any) => (b.height ?? 0) - (a.height ?? 0));

      if (candidates.length > 0) {
        /* Có combined URL → dùng trực tiếp */
        formats.push({
          itag:    q.itag,
          quality: q.label,
          ext:     "mp4",
          url:     candidates[0].url,
        });
      } else {
        /* Fallback: stream qua server với format selector */
        formats.push({
          itag:    q.itag,
          quality: q.label,
          ext:     "mp4",
          url:     `${base}/api/yt/stream?url=${enc(url)}&height=${q.minH || 360}`,
        });
      }
    }

    return res.json({ title, thumbnail, duration, channel, formats });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lỗi không xác định";
    return res.status(500).json({ error: `yt-dlp: ${msg}` });
  }
});

/* ── GET /api/yt/stream?url=...&height=720
 *  Fallback: stream qua server khi không có combined URL
 * ── */
router.get("/stream", async (req, res) => {
  const rawUrl = String(req.query["url"]    ?? "");
  const height = String(req.query["height"] ?? "360");
  if (!rawUrl) return res.status(400).json({ error: "Thiếu tham số url" });

  const videoId = extractVideoId(rawUrl);
  if (!videoId) return res.status(400).json({ error: "Link không hợp lệ" });

  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const fmt = `best[height<=${height}][ext=mp4]/best[height<=${height}]/best`;

  try {
    const proc = execFile(findYtDlpBin(), [url, "-f", fmt, "-o", "-", "--no-warnings", "--no-call-home"]);

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Disposition", `attachment; filename="video_${height}p.mp4"`);

    proc.stdout?.pipe(res);

    proc.on("error", (err: Error) => {
      if (!res.headersSent) res.status(500).json({ error: err.message });
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lỗi không xác định";
    return res.status(500).json({ error: msg });
  }
});

export default router;
