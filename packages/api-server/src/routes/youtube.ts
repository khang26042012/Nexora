import { Router } from "express";
import { spawn, execSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import crypto from "node:crypto";

const router = Router();

/* ── Tìm hoặc tải yt-dlp binary ────────────────────────────────────────── */
let ytDlpPath: string | null = null;

async function getYtDlp(): Promise<string> {
  if (ytDlpPath) return ytDlpPath;

  // 1. Thử system yt-dlp (Nix / Ubuntu với yt-dlp cài sẵn)
  try {
    const p = execSync("which yt-dlp 2>/dev/null").toString().trim();
    if (p) { ytDlpPath = p; return p; }
  } catch {}

  // 2. Download binary vào /tmp nếu chưa có (Render / server không có yt-dlp)
  const tmpBin = path.join(os.tmpdir(), "yt-dlp");
  if (fs.existsSync(tmpBin)) {
    ytDlpPath = tmpBin;
    return tmpBin;
  }

  console.log("[yt-downloader] yt-dlp not found — downloading binary...");
  await new Promise<void>((resolve, reject) => {
    const curl = spawn("curl", [
      "-L", "--silent", "--show-error",
      "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp",
      "-o", tmpBin,
    ]);
    curl.on("close", (code) => {
      if (code === 0) {
        fs.chmodSync(tmpBin, 0o755);
        console.log("[yt-downloader] yt-dlp downloaded OK");
        resolve();
      } else {
        reject(new Error("Tải yt-dlp binary thất bại"));
      }
    });
    curl.on("error", reject);
  });

  ytDlpPath = tmpBin;
  return tmpBin;
}

/* ── Chạy yt-dlp ────────────────────────────────────────────────────────── */
async function runYtDlp(args: string[]): Promise<string> {
  const bin = await getYtDlp();
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, args, { env: process.env });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d: Buffer) => (stdout += d.toString()));
    proc.stderr.on("data", (d: Buffer) => (stderr += d.toString()));
    proc.on("close", (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr.trim() || `yt-dlp exited with code ${code}`));
    });
    proc.on("error", reject);
  });
}

/* ── GET /api/yt/info?url=... ─────────────────────────────────────────── */
router.get("/info", async (req, res) => {
  const url = String(req.query["url"] ?? "");
  if (!url) return res.status(400).json({ error: "Thiếu tham số url" });

  try {
    const json = await runYtDlp([
      "--dump-json",
      "--no-playlist",
      "--no-warnings",
      url,
    ]);

    const data = JSON.parse(json) as {
      title: string;
      thumbnail: string;
      duration: number;
      channel?: string;
      uploader?: string;
      formats?: {
        format_id: string;
        height?: number;
        ext?: string;
        filesize?: number;
        vcodec?: string;
      }[];
    };

    const wantedHeights = [1080, 720, 480, 360];
    const seen = new Set<number>();
    const formats: { itag: string; quality: string; ext: string; size?: string }[] = [];

    for (const f of data.formats ?? []) {
      if (!f.height || !wantedHeights.includes(f.height)) continue;
      if (seen.has(f.height)) continue;
      if (!f.vcodec || f.vcodec === "none") continue;
      seen.add(f.height);
      formats.push({
        itag: String(f.format_id),
        quality: `${f.height}p`,
        ext: f.ext ?? "mp4",
        size: f.filesize
          ? `${(f.filesize / 1024 / 1024).toFixed(1)} MB`
          : undefined,
      });
    }

    if (formats.length === 0) {
      formats.push({ itag: "bv+ba/best", quality: "Best", ext: "mp4" });
    }

    formats.sort((a, b) => {
      const qa = parseInt(a.quality) || 9999;
      const qb = parseInt(b.quality) || 9999;
      return qb - qa;
    });

    return res.json({
      title: data.title,
      thumbnail: data.thumbnail,
      duration: data.duration,
      channel: data.channel ?? data.uploader,
      formats,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lỗi không xác định";
    return res.status(500).json({ error: msg });
  }
});

/* ── GET /api/yt/download?url=...&itag=...&title=... ─────────────────── */
router.get("/download", async (req, res) => {
  const url = String(req.query["url"] ?? "");
  const itag = String(req.query["itag"] ?? "bv+ba/best");
  const title = String(req.query["title"] ?? "video").slice(0, 80);

  if (!url) return res.status(400).json({ error: "Thiếu tham số url" });

  const uid = crypto.randomUUID();
  const tmpDir = os.tmpdir();
  const outPath = path.join(tmpDir, `nexora_yt_${uid}.mp4`);

  const formatArg =
    itag === "bv+ba/best"
      ? "bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best"
      : `${itag}+bestaudio[ext=m4a]/${itag}+bestaudio/best`;

  try {
    await runYtDlp([
      "--no-playlist",
      "--no-warnings",
      "-f", formatArg,
      "--merge-output-format", "mp4",
      "-o", outPath,
      url,
    ]);

    if (!fs.existsSync(outPath)) {
      return res.status(500).json({ error: "Tải về xong nhưng không tìm thấy file" });
    }

    const stat = fs.statSync(outPath);
    const safeFilename = title.replace(/[^\w\s\-]/g, "_") + ".mp4";

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(safeFilename)}`
    );
    res.setHeader("Content-Length", stat.size);

    const stream = fs.createReadStream(outPath);
    stream.pipe(res);
    stream.on("close", () => fs.unlink(outPath, () => {}));
    stream.on("error", () => fs.unlink(outPath, () => {}));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lỗi khi tải video";
    if (!res.headersSent) return res.status(500).json({ error: msg });
  }
});

export default router;
