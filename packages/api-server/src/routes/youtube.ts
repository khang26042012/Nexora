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

/* ── Binary locator + auto-updater ──────────────────────────────
 *  Ưu tiên: /tmp/yt-dlp-latest (luôn download mới nhất khi khởi động)
 *  Fallback: binary trong node_modules (có thể cũ)
 *  Download chạy background → không block request đầu
 * ──────────────────────────────────────────────────────────────── */
const LATEST_BIN  = "/tmp/yt-dlp-latest";
const GH_RELEASE  = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp";

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

function downloadLatestYtDlp(): Promise<string> {
  return new Promise((resolve, reject) => {
    const tmp = LATEST_BIN + ".tmp";
    const file = fs.createWriteStream(tmp);
    const get = (u: string) => https.get(u, { timeout: 30_000 }, res => {
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        res.resume(); // bỏ qua body, follow redirect
        return get(res.headers.location);
      }
      if (res.statusCode !== 200) {
        res.resume();
        file.destroy();
        return reject(new Error(`GitHub HTTP ${res.statusCode}`));
      }
      res.pipe(file);
      file.on("finish", () => {
        try {
          fs.renameSync(tmp, LATEST_BIN);
          fs.chmodSync(LATEST_BIN, "755");
          console.log("[yt-dlp] latest binary ready:", LATEST_BIN);
          resolve(LATEST_BIN);
        } catch(e) { reject(e); }
      });
    }).on("error", (e) => { file.destroy(); reject(e); });
    get(GH_RELEASE);
  });
}

/* Resolve bin: trả về ngay (node_modules hoặc cached latest),
   đồng thời kick download latest ở background nếu chưa có    */
let _latestReady: string | null = null;
let _downloadPromise: Promise<string> | null = null;

function kickLatestDownload() {
  if (_latestReady || _downloadPromise) return;
  _downloadPromise = downloadLatestYtDlp()
    .then(p => { _latestReady = p; _downloadPromise = null; return p; })
    .catch(e => { console.warn("[yt-dlp] background download failed:", e.message); _downloadPromise = null; return ""; });
}

async function getYtDlpBin(): Promise<string> {
  /* Nếu đã có latest → dùng luôn */
  if (_latestReady && fs.existsSync(_latestReady)) return _latestReady;

  /* Nếu download đang chạy và node_modules bin tồn tại → dùng node_modules tạm */
  const nmBin = findNodeModulesBin();

  /* Kick background download nếu chưa có */
  kickLatestDownload();

  if (nmBin) return nmBin;

  /* Không có gì → chờ download */
  if (_downloadPromise) return _downloadPromise;

  /* Fallback: download đồng bộ */
  return downloadLatestYtDlp();
}

/* Kick ngay khi module load */
kickLatestDownload();

/* ── Format selector theo quality ───────────────────────────────
 *  Không filter ext=mp4 vì android client hay trả webm/other
 *  Không dùng bestvideo+bestaudio (cần ffmpeg merge, Render không có)
 *  Dùng combined format (video+audio trong 1 stream) hoặc best bất kỳ
 * ──────────────────────────────────────────────────────────────── */
const QUALITY_FORMAT: Record<string, string> = {
  best:  "best",
  "720p":"best[height<=720]/best[height<=800]/best",
  "480p":"best[height<=480]/best[height<=540]/best",
  "360p":"best[height<=360]/best[height<=480]/best",
};

/* ── Base yt-dlp args ────────────────────────────────────────── */
function baseArgs(opts?: { extraArgs?: string[]; download?: boolean }): string[] {
  return [
    "--no-warnings",
    "--no-check-certificate",
    "--socket-timeout", "15",
    "--no-playlist",
    /* --ignore-no-formats-error: chỉ dùng cho /info (metadata), KHÔNG dùng cho download
       vì sẽ khiến yt-dlp exit 0 khi không có format → không tạo file → khó detect lỗi */
    ...(opts?.download ? [] : ["--ignore-no-formats-error"]),
    ...(hasCookies ? ["--cookies", COOKIES_PATH] : []),
    ...(opts?.extraArgs ?? []),
  ];
}

/* ── Thử nhiều player_client — android trước vì bypass datacenter IP tốt nhất ── */
const YT_CLIENT_STRATEGIES = [
  ["--extractor-args", "youtube:player_client=android"],           // bypass bot-check datacenter
  ["--extractor-args", "youtube:player_client=tv_embedded"],
  ["--extractor-args", "youtube:player_client=mweb"],
  [],                                                               // default (web) — fallback cuối
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

/* ── Helper: lỗi có nên retry client khác không ─────────────── */
function isRetryableErr(msg: string): boolean {
  return msg.includes("format") || msg.includes("No video")
    || msg.includes("player_client") || msg.includes("Requested")
    || msg.includes("Failed to extract") || msg.includes("unavailable")
    || msg.includes("Unavailable") || msg.includes("This video");
}

/* ── GET /api/yt/info?url=... ────────────────────────────────
 *  Thử lần lượt nhiều yt-dlp client strategies cho YouTube
 *  Chỉ trả success khi video CÓ format tải được (formats.length > 0)
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
        const stdout = await runYtDlp(bin, args, 22_000);
        let data: any;
        try { data = JSON.parse(stdout); }
        catch { throw new Error("Không parse được JSON từ yt-dlp"); }

        /* Video không có format tải được → thử client khác */
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

/* ── GET /api/yt/download?url=...&quality=best|720p|480p|360p
 *  1. Thử lần lượt các player_client strategies (giống /info)
 *  2. yt-dlp tải xuống file /tmp/yt_xxxx.mp4
 *  3. Server pipe file về browser
 *  → Không bị timeout / stream break như approach pipe trực tiếp
 * ─────────────────────────────────────────────────────────── */
router.get("/download", async (req, res) => {
  const url     = String(req.query["url"]     ?? "").trim();
  const quality = String(req.query["quality"] ?? "best").trim();
  const title   = String(req.query["title"]   ?? "video").trim();

  if (!url) return res.status(400).json({ error: "Thiếu tham số url" });

  const fmt = QUALITY_FORMAT[quality] ?? QUALITY_FORMAT["best"]!;
  /* Fallback rộng hơn: nếu format chính không có thì lấy bất kỳ */
  const fmtWithFallback = `${fmt}/best`;

  const tmpFile = `/tmp/yt_${Date.now()}_${Math.random().toString(36).slice(2)}.%(ext)s`;

  const cleanup = (ext?: string) => {
    /* Xóa file bất kể ext là gì */
    const base = tmpFile.replace(".%(ext)s", "");
    try {
      for (const e of ["mp4","webm","mkv","m4a","mp3","part",ext ?? ""].filter(Boolean)) {
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
          "-f", fmtWithFallback,
          ...baseArgs({ extraArgs, download: true }),
        ];

        await new Promise<void>((resolve, reject) => {
          execFile(bin, args, { timeout: 180_000 }, (err, _stdout, stderr) => {
            if (err) {
              return reject(new Error((stderr || err.message).trim().split("\n").filter(Boolean).slice(-3).join(" | ")));
            }
            resolve();
          });
        });

        /* Tìm file đã tải (ext có thể khác mp4) */
        const base = tmpFile.replace(".%(ext)s", "");
        const actualFile = ["mp4","webm","mkv","m4a","mp3"]
          .map(e => `${base}.${e}`)
          .find(p => fs.existsSync(p));

        if (!actualFile) {
          lastErr = "No video formats found"; // trigger retry với client tiếp theo
          continue; // luôn thử client tiếp theo khi không có file
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
        stream.on("end",   () => cleanup(ext));
        stream.on("error", () => cleanup(ext));
        req.on("close",    () => cleanup(ext));
        return; /* Thành công → thoát vòng lặp */

      } catch (e: any) {
        lastErr = e.message ?? "Lỗi không xác định";
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
