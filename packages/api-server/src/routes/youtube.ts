import { Router } from "express";

const router = Router();

/* ── Danh sách Invidious instances — đã kiểm tra hoạt động từ server ── */
const INVIDIOUS_INSTANCES = [
  "https://invidious.protokolla.fi",
  "https://iv.ggtyler.dev",
  "https://invidious.slipfox.xyz",
  "https://invidious.materialio.us",
  "https://invidious.privacyredirect.com",
  "https://invidious.nerdvpn.de",
  "https://yt.artemislena.eu",
  "https://yewtu.be",
  "https://inv.nadeko.net",
  "https://invidious.perennialte.ch",
];

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

/* ── Fetch với follow redirect ── */
async function fetchWithRedirect(url: string, timeoutMs = 10000): Promise<Response> {
  return fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    redirect: "follow",
  });
}

async function fetchInvidious(videoId: string): Promise<any> {
  const errors: string[] = [];
  for (const base of INVIDIOUS_INSTANCES) {
    try {
      const res = await fetchWithRedirect(
        `${base}/api/v1/videos/${videoId}?fields=title,videoThumbnails,lengthSeconds,author,formatStreams,adaptiveFormats`,
        10000
      );
      if (!res.ok) {
        errors.push(`${base}: HTTP ${res.status}`);
        continue;
      }
      const data = await res.json();
      if (!data?.title) {
        errors.push(`${base}: response thiếu title`);
        continue;
      }
      data._invidiousBase = base;
      return data;
    } catch (e: any) {
      errors.push(`${base}: ${e.message ?? "timeout"}`);
    }
  }
  throw new Error(`Tất cả Invidious instance đều lỗi: ${errors.join(" | ")}`);
}

/* ── GET /api/yt/info?url=... ── */
router.get("/info", async (req, res) => {
  const url = String(req.query["url"] ?? "");
  if (!url) return res.status(400).json({ error: "Thiếu tham số url" });

  const videoId = extractVideoId(url);
  if (!videoId) return res.status(400).json({ error: "Link YouTube không hợp lệ" });

  try {
    const data = await fetchInvidious(videoId);
    const base = data._invidiousBase as string;

    /* Thumbnail tốt nhất */
    const thumbnails: { quality: string; url: string }[] = data.videoThumbnails ?? [];
    const thumb =
      thumbnails.find((t) => t.quality === "maxresdefault")?.url ??
      thumbnails.find((t) => t.quality === "hqdefault")?.url ??
      thumbnails[0]?.url ?? "";

    /* formatStreams = video+audio kết hợp (360p, 720p) */
    type FmtStream = { itag: string; quality: string; type: string; container: string; url: string };
    const fmtStreams: FmtStream[] = data.formatStreams ?? [];

    const QUALITY_RANK: Record<string, number> = {
      "1080p": 1080, "720p60": 720, "720p": 720,
      "480p": 480, "360p": 360, "240p": 240, "144p": 144,
    };

    const seen = new Set<number>();
    const formats: { itag: string; quality: string; ext: string; url: string }[] = [];

    for (const f of fmtStreams) {
      if (!f.type?.startsWith("video")) continue;
      const rank = QUALITY_RANK[f.quality] ?? 0;
      if (!rank || seen.has(rank)) continue;
      seen.add(rank);

      const proxyUrl = `${base}/latest_version?id=${videoId}&itag=${f.itag}&local=true`;

      formats.push({
        itag: f.itag,
        quality: `${rank}p`,
        ext: f.container ?? "mp4",
        url: proxyUrl,
      });
    }

    if (formats.length === 0) {
      return res.status(500).json({ error: "Không tìm thấy định dạng video nào" });
    }

    formats.sort((a, b) => parseInt(b.quality) - parseInt(a.quality));

    return res.json({
      title: data.title,
      thumbnail: thumb,
      duration: data.lengthSeconds,
      channel: data.author,
      formats,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lỗi không xác định";
    return res.status(500).json({ error: msg });
  }
});

export default router;
