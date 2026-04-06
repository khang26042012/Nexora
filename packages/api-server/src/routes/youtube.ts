import { Router } from "express";
import { execFile } from "child_process";
import path from "path";
import fs from "fs";
import https from "https";

const router = Router();

/* ── Cookie setup ──────────────────────────────────────────────
 *  Nếu env YOUTUBE_COOKIES được set (nội dung Netscape cookies.txt),
 *  server ghi ra /tmp/yt-cookies.txt và yt-dlp sẽ dùng file này.
 *  → Bypass bot check trên Render datacenter IP.
 * ──────────────────────────────────────────────────────────── */
const COOKIES_PATH = "/tmp/yt-cookies.txt";

function setupCookies() {
  const raw = process.env["YOUTUBE_COOKIES"];
  if (!raw) return false;
  try {
    // Hỗ trợ cả plain text và base64
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

    /* auto-download */
    return new Promise<string>((resolve, reject) => {
      const dest = "/tmp/yt-dlp";
      const url = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp";
      const file = fs.createWriteStream(dest);
      const download = (u: string) => https.get(u, res => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return download(res.headers.location!);
        }
        res.pipe(file);
        file.on("finish", () => { file.close(); fs.chmodSync(dest, "755"); resolve(dest); });
      }).on("error", reject);
      download(url);
    });
  })();
  return _binCache;
}

/* ── Run yt-dlp (1 attempt) ──────────────────────────────────── */
function runYtDlp(bin: string, args: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    execFile(bin, args, { maxBuffer: 10 * 1024 * 1024, timeout: 60_000 },
      (err, stdout, stderr) => {
        if (err) {
          const msg = (stderr || err.message).trim().split("\n").slice(-3).join(" | ");
          return reject(new Error(msg));
        }
        const text = stdout.trim();
        if (!text || text === "null") {
          const errMsg = (stderr || "").trim().split("\n").slice(-2).join(" | ");
          return reject(new Error(errMsg || "yt-dlp trả về null"));
        }
        try { resolve(JSON.parse(text)); }
        catch { reject(new Error("Lỗi parse JSON từ yt-dlp")); }
      }
    );
  });
}

/* ── Run yt-dlp với retry nhiều strategy ─────────────────────── */
async function ytDlpInfo(url: string): Promise<any> {
  const bin = await getYtDlpBin();

  const baseArgs = [
    "--dump-single-json",
    "--no-warnings",
    "--no-check-certificate",
  ];
  const cookieArgs = hasCookies ? ["--cookies", COOKIES_PATH] : [];

  /* Strategy 1: web client mặc định (đầy đủ format nhất) */
  try {
    return await runYtDlp(bin, [
      url, ...baseArgs,
      "-f", "bestvideo*+bestaudio/bestvideo/bestaudio/best",
      ...cookieArgs,
    ]);
  } catch (e1) {
    const msg1 = (e1 as Error).message;

    /* Strategy 2: android client (bypass datacenter bot-check, 360p combined) */
    try {
      return await runYtDlp(bin, [
        url, ...baseArgs,
        "-f", "bestvideo*+bestaudio/bestvideo/bestaudio/best",
        "--extractor-args", "youtube:player_client=android",
        ...cookieArgs,
      ]);
    } catch (e2) {
      const msg2 = (e2 as Error).message;

      /* Strategy 3: mobileapp + bỏ format selector (lấy bất kỳ) */
      try {
        return await runYtDlp(bin, [
          url, ...baseArgs,
          "--extractor-args", "youtube:player_client=android",
          ...cookieArgs,
        ]);
      } catch (e3) {
        /* Ném lỗi của strategy 1 (thường rõ nghĩa nhất) */
        throw new Error(msg1 || msg2 || (e3 as Error).message);
      }
    }
  }
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

function cleanUrl(url: string): string {
  const videoId = extractVideoId(url);
  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : url;
}

/* ── GET /api/yt/info?url=... ── */
router.get("/info", async (req, res) => {
  const url = String(req.query["url"] ?? "");
  if (!url) return res.status(400).json({ error: "Thiếu tham số url" });
  if (!extractVideoId(url)) return res.status(400).json({ error: "Link YouTube không hợp lệ" });

  try {
    const data = await ytDlpInfo(cleanUrl(url));
    const base  = `${req.protocol}://${req.get("host")}`;
    const enc   = (v: string) => encodeURIComponent(v);

    const qualityMap: Record<string, { minH: number; maxH: number }> = {
      "1080p": { minH: 900,  maxH: 9999 },
      "720p":  { minH: 650,  maxH: 899  },
      "480p":  { minH: 400,  maxH: 649  },
      "360p":  { minH: 0,    maxH: 399  },
    };

    const allFormats: any[] = data.formats ?? [];

    const formats = Object.entries(qualityMap).map(([label, { minH, maxH }]) => {
      /* Tìm combined format (video+audio) MP4 trong dải height */
      const candidates = allFormats
        .filter(f => f.url && f.vcodec !== "none" && f.acodec !== "none"
          && f.ext === "mp4"
          && (f.height ?? 0) >= minH && (f.height ?? 0) <= maxH)
        .sort((a, b) => (b.height ?? 0) - (a.height ?? 0));

      if (candidates.length > 0) {
        return { itag: String(candidates[0].format_id), quality: label, ext: "mp4", url: candidates[0].url };
      }

      /* Fallback: stream proxy */
      return {
        itag: label.replace("p", ""),
        quality: label,
        ext: "mp4",
        url: `${base}/api/yt/stream?id=${enc(data.id)}&height=${minH || 360}`,
      };
    });

    return res.json({
      title:     data.title,
      thumbnail: data.thumbnail,
      duration:  data.duration,
      channel:   data.channel ?? data.uploader,
      formats,
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lỗi không xác định";

    /* Hướng dẫn thêm nếu bot check */
    const isBotCheck = msg.includes("Sign in") || msg.includes("bot") || msg.includes("cookies");
    const hint = isBotCheck
      ? " | Hãy set YOUTUBE_COOKIES trên Render để bypass."
      : "";

    return res.status(500).json({ error: `yt-dlp: ${msg}${hint}` });
  }
});

/* ── GET /api/yt/stream?id=VIDEO_ID&height=360 ── */
router.get("/stream", async (req, res) => {
  const videoId = String(req.query["id"] ?? "");
  const height  = parseInt(String(req.query["height"] ?? "360"), 10);
  if (!videoId) return res.status(400).json({ error: "Thiếu tham số id" });

  try {
    const data = await ytDlpInfo(`https://www.youtube.com/watch?v=${videoId}`);
    const allFormats: any[] = data.formats ?? [];

    const fmt = allFormats
      .filter(f => f.url && f.vcodec !== "none" && f.acodec !== "none" && f.ext === "mp4"
        && (f.height ?? 0) <= height + 50)
      .sort((a, b) => (b.height ?? 0) - (a.height ?? 0))[0];

    if (!fmt) return res.status(404).json({ error: "Không tìm thấy format phù hợp" });

    const bin = await getYtDlpBin();
    const args = [
      `https://www.youtube.com/watch?v=${videoId}`,
      "-f", `best[height<=${height}][ext=mp4]/best[height<=${height}]/best`,
      "-o", "-",
      "--no-warnings",
      "--no-check-certificate",
      "--extractor-args", "youtube:player_client=ios,web",
    ];
    if (hasCookies) args.push("--cookies", COOKIES_PATH);

    const proc = execFile(bin, args);

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Disposition", `attachment; filename="video_${height}p.mp4"`);

    proc.stdout?.pipe(res);
    proc.on("error", () => { if (!res.headersSent) res.status(500).end(); });
    req.on("close", () => proc.kill());

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lỗi không xác định";
    if (!res.headersSent) res.status(500).json({ error: msg });
  }
});

export default router;
