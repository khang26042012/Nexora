import { Router } from "express";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

function resolveYtdlpPath(): string {
  /* 1. Project root binary — download bởi render.yaml build step
   *    Render: startCommand chạy từ /opt/render/project/src/
   *    Local : process.cwd() = workspace root */
  const cwdBin = join(process.cwd(), "yt-dlp");
  if (existsSync(cwdBin)) return cwdBin;

  /* 2. Binary từ yt-dlp-exec npm package */
  try {
    const _require = createRequire(import.meta.url);
    const { YOUTUBE_DL_PATH } = _require("yt-dlp-exec/src/constants") as { YOUTUBE_DL_PATH: string };
    if (existsSync(YOUTUBE_DL_PATH)) return YOUTUBE_DL_PATH;
  } catch {}

  /* 3. Thử /usr/local/bin nếu có */
  if (existsSync("/usr/local/bin/yt-dlp")) return "/usr/local/bin/yt-dlp";

  /* 4. Fallback PATH */
  return "yt-dlp";
}

const YOUTUBE_DL_PATH = resolveYtdlpPath();

const router = Router();

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

function runYtdlpJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const proc = spawn(YOUTUBE_DL_PATH, [
      url,
      "--dump-single-json",
      "--no-warnings",
      "--no-call-home",
      "--no-check-certificate",
      "--quiet",
      "--socket-timeout", "10",
      "--retries", "2",
      "--extractor-retries", "1",
      "--geo-bypass",
      "--no-playlist",
    ]);
    let stdout = "";
    let stderr = "";
    let done = false;

    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        proc.kill("SIGKILL");
        reject(new Error("yt-dlp timeout — YouTube đang chặn IP server. Thử lại sau."));
      }
    }, 20000);

    proc.stdout.on("data", (d) => (stdout += d));
    proc.stderr.on("data", (d) => (stderr += d));
    proc.on("error", (err) => {
      if (!done) { done = true; clearTimeout(timer); reject(err); }
    });
    proc.on("close", (code) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (code !== 0) return reject(new Error(stderr.trim().slice(0, 300) || `yt-dlp exit ${code}`));
      try { resolve(JSON.parse(stdout)); }
      catch (e) { reject(new Error("Không parse được JSON từ yt-dlp")); }
    });
  });
}

/* ── GET /api/yt/info?url=... ── */
router.get("/info", async (req, res) => {
  const url = String(req.query["url"] ?? "");
  if (!url) return res.status(400).json({ error: "Thiếu tham số url" });

  const videoId = extractVideoId(url);
  if (!videoId) return res.status(400).json({ error: "Link YouTube không hợp lệ" });

  try {
    const info = await runYtdlpJson(url);

    /* Thumbnail */
    const thumbs: { url: string; preference?: number }[] = info.thumbnails ?? [];
    const sortedThumbs = thumbs.sort((a, b) => (b.preference ?? 0) - (a.preference ?? 0));
    const thumbnail =
      sortedThumbs.find((t) => t.url?.includes("maxresdefault"))?.url ??
      sortedThumbs.find((t) => t.url?.includes("hqdefault"))?.url ??
      sortedThumbs[0]?.url ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    /* Formats — video+audio combined (không cần ffmpeg để tải) */
    type Fmt = { format_id: string; ext: string; vcodec: string; acodec: string; height?: number; url?: string; format_note?: string };
    const allFmts: Fmt[] = info.formats ?? [];

    const combined = allFmts
      .filter((f) => f.vcodec !== "none" && f.acodec !== "none" && f.url)
      .sort((a, b) => (b.height ?? 0) - (a.height ?? 0));

    /* Dedupe theo height, giữ 1 format mỗi chất lượng */
    const seen = new Set<number>();
    const formats: { itag: string; quality: string; ext: string; url: string }[] = [];

    for (const f of combined) {
      const h = f.height ?? 0;
      if (!h || seen.has(h)) continue;
      seen.add(h);
      formats.push({
        itag: f.format_id,
        quality: `${h}p`,
        ext: f.ext ?? "mp4",
        url: f.url!,
      });
    }

    /* Fallback: nếu không có combined format nào, dùng download endpoint server-side */
    if (formats.length === 0) {
      const base = `${req.protocol}://${req.get("host")}`;
      formats.push(
        { itag: "360", quality: "360p", ext: "mp4", url: `${base}/api/yt/download?url=${encodeURIComponent(url)}&quality=360` },
        { itag: "720", quality: "720p", ext: "mp4", url: `${base}/api/yt/download?url=${encodeURIComponent(url)}&quality=720` },
      );
    }

    return res.json({
      title: info.title,
      thumbnail,
      duration: info.duration ?? 0,
      channel: info.uploader ?? info.channel ?? info.artist ?? "",
      formats,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lỗi không xác định";
    return res.status(500).json({ error: msg });
  }
});

/* ── GET /api/yt/download?url=...&quality=360 ── (fallback server-side stream) */
router.get("/download", async (req, res) => {
  const url = String(req.query["url"] ?? "");
  const quality = String(req.query["quality"] ?? "360");
  if (!url) return res.status(400).json({ error: "Thiếu tham số url" });

  /* Format string — chỉ dùng combined formats, không cần ffmpeg */
  const height = parseInt(quality) || 360;
  const fmtStr = height <= 360
    ? "18/best[height<=360][ext=mp4]/best[height<=360]"
    : `bestvideo[height<=${height}][ext=mp4]+bestaudio[ext=m4a]/22/18/best[height<=${height}]`;

  let title = "video";
  try {
    const info = await runYtdlpJson(url);
    title = (info.title as string ?? "video").replace(/[^\w\s\-_.()]/g, "").trim().slice(0, 100);
  } catch {}

  res.setHeader("Content-Disposition", `attachment; filename="${title}.mp4"`);
  res.setHeader("Content-Type", "video/mp4");
  res.setHeader("X-Content-Type-Options", "nosniff");

  const proc = spawn(YOUTUBE_DL_PATH, [
    url,
    "-f", fmtStr,
    "--merge-output-format", "mp4",
    "-o", "-",
    "--no-warnings",
    "--no-call-home",
    "--no-check-certificate",
    "--quiet",
  ]);

  req.on("close", () => proc.kill());
  proc.stdout.pipe(res);
  proc.stderr.on("data", (d) => console.error("[yt-dlp]", d.toString().trim()));
  proc.on("close", (code) => { if (code !== 0 && !res.headersSent) res.status(500).end(); });
});

export default router;
