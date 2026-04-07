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

/* ── Binary locator ──────────────────────────────────────────── */
let _binCache: Promise<string> | null = null;

function getYtDlpBin(): Promise<string> {
  if (_binCache) return _binCache;
  _binCache = (async () => {
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
      if (fs.existsSync(p)) {
        fs.chmodSync(p, "755");
        return p;
      }
    }

    /* auto-download từ GitHub nếu không có */
    return new Promise<string>((resolve, reject) => {
      const dest = "/tmp/yt-dlp";
      const url = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp";
      const file = fs.createWriteStream(dest);
      const download = (u: string) => https.get(u, res => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return download(res.headers.location!);
        }
        res.pipe(file);
        file.on("finish", () => {
          file.close();
          fs.chmodSync(dest, "755");
          resolve(dest);
        });
      }).on("error", reject);
      download(url);
    });
  })();
  return _binCache;
}

/* ── Format selector theo quality ───────────────────────────── */
const QUALITY_FORMAT: Record<string, string> = {
  best:  "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
  "720p":"bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best[height<=720]",
  "480p":"bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480][ext=mp4]/best[height<=480]",
  "360p":"bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/best[height<=360][ext=mp4]/best[height<=360]",
};

/* ── Base yt-dlp args ────────────────────────────────────────── */
function baseArgs(opts?: { extraArgs?: string[] }): string[] {
  return [
    "--no-warnings",
    "--no-check-certificate",
    ...(hasCookies ? ["--cookies", COOKIES_PATH] : []),
    ...(opts?.extraArgs ?? []),
  ];
}

/* ── Thử nhiều player_client cho YouTube nếu thất bại ──────── */
const YT_CLIENT_STRATEGIES = [
  [],                                                              // default
  ["--extractor-args", "youtube:player_client=tv_embedded"],
  ["--extractor-args", "youtube:player_client=web"],
  ["--extractor-args", "youtube:player_client=android"],
  ["--extractor-args", "youtube:player_client=mweb"],
];

/* ── Helper: chạy yt-dlp một lần với args nhất định ───────── */
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

/* ── GET /api/yt/info?url=... ────────────────────────────────
 *  Thử lần lượt nhiều yt-dlp client strategies cho YouTube
 * ─────────────────────────────────────────────────────────── */
router.get("/info", async (req, res) => {
  const url = String(req.query["url"] ?? "").trim();
  if (!url) return res.status(400).json({ error: "Thiếu tham số url" });

  try {
    const bin = await getYtDlpBin();
    let lastErr = "";

    for (const extraArgs of YT_CLIENT_STRATEGIES) {
      try {
        const args = [
          url,
          "--dump-single-json",
          "--skip-download",
          ...baseArgs({ extraArgs }),
        ];
        const stdout = await runYtDlp(bin, args, 35_000);
        let data: any;
        try { data = JSON.parse(stdout); }
        catch { throw new Error("Không parse được JSON từ yt-dlp"); }

        return res.json({
          title:     data.title         ?? "Unknown",
          thumbnail: data.thumbnail      ?? "",
          duration:  data.duration       ?? 0,
          channel:   data.channel        ?? data.uploader ?? "Unknown",
          platform:  data.extractor_key  ?? "Unknown",
        });
      } catch (e: any) {
        lastErr = e.message ?? "Lỗi không xác định";
        /* Nếu lỗi không liên quan đến format/client → stop ngay */
        const isRetryable = lastErr.includes("format") || lastErr.includes("player_client")
          || lastErr.includes("Requested") || lastErr.includes("Failed to extract");
        if (!isRetryable) break;
      }
    }

    const isBotCheck = lastErr.includes("Sign in") || lastErr.includes("bot")
      || lastErr.includes("cookies") || lastErr.includes("confirm");
    const hint = isBotCheck ? " | Cần set YOUTUBE_COOKIES để bypass bot-check." : "";
    return res.status(500).json({ error: `yt-dlp: ${lastErr}${hint}` });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lỗi không xác định";
    return res.status(500).json({ error: `Lỗi server: ${msg}` });
  }
});

/* ── GET /api/yt/download?url=...&quality=best|720p|480p|360p
 *  Approach từ n8n workflow:
 *  1. yt-dlp tải xuống file /tmp/yt_xxxx.mp4
 *  2. Server pipe file về browser
 *  3. Xóa file tạm
 *  → Không bị timeout / stream break như approach pipe trực tiếp
 * ─────────────────────────────────────────────────────────── */
router.get("/download", async (req, res) => {
  const url     = String(req.query["url"]     ?? "").trim();
  const quality = String(req.query["quality"] ?? "best").trim();
  const title   = String(req.query["title"]   ?? "video").trim();

  if (!url) return res.status(400).json({ error: "Thiếu tham số url" });

  const fmt = QUALITY_FORMAT[quality] ?? QUALITY_FORMAT["best"];
  const tmpFile = `/tmp/yt_${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`;

  const cleanup = () => {
    try { if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile); } catch {}
  };

  try {
    const bin = await getYtDlpBin();

    const args = [
      url,
      "-o", tmpFile,
      "-f", fmt,
      "--merge-output-format", "mp4",
      ...baseArgs(),
    ];

    await new Promise<void>((resolve, reject) => {
      execFile(bin, args, { timeout: 180_000 }, (err, _stdout, stderr) => {
        if (err) {
          return reject(new Error((stderr || err.message).trim().split("\n").slice(-3).join(" | ")));
        }
        resolve();
      });
    });

    if (!fs.existsSync(tmpFile)) {
      return res.status(500).json({ error: "yt-dlp không tạo ra file output" });
    }

    const stat = fs.statSync(tmpFile);
    const safeTitle = title.replace(/[^\w\s\-\(\)\[\]]/g, "").trim().slice(0, 80) || "video";
    const filename  = `${safeTitle}_${quality}.mp4`;

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", stat.size);

    const stream = fs.createReadStream(tmpFile);
    stream.pipe(res);

    stream.on("end",   cleanup);
    stream.on("error", cleanup);
    req.on("close",    cleanup);

  } catch (err: unknown) {
    cleanup();
    const msg = err instanceof Error ? err.message : "Lỗi không xác định";
    if (!res.headersSent) res.status(500).json({ error: `yt-dlp: ${msg}` });
  }
});

export default router;
