import { Router } from "express";

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

/* ── GET /api/yt/info?url=... ── */
router.get("/info", async (req, res) => {
  const url = String(req.query["url"] ?? "");
  if (!url) return res.status(400).json({ error: "Thiếu tham số url" });

  const videoId = extractVideoId(url);
  if (!videoId) return res.status(400).json({ error: "Link YouTube không hợp lệ" });

  try {
    const oembedRes = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!oembedRes.ok) throw new Error("Không lấy được thông tin video");
    const oembed = await oembedRes.json() as { title?: string; author_name?: string; thumbnail_url?: string };

    const base = `${req.protocol}://${req.get("host")}`;
    const formats = [
      { itag: "1080", quality: "1080p", ext: "mp4", url: `${base}/api/yt/download?url=${encodeURIComponent(url)}&quality=1080` },
      { itag: "720",  quality: "720p",  ext: "mp4", url: `${base}/api/yt/download?url=${encodeURIComponent(url)}&quality=720`  },
      { itag: "480",  quality: "480p",  ext: "mp4", url: `${base}/api/yt/download?url=${encodeURIComponent(url)}&quality=480`  },
      { itag: "360",  quality: "360p",  ext: "mp4", url: `${base}/api/yt/download?url=${encodeURIComponent(url)}&quality=360`  },
    ];

    return res.json({
      title:     oembed.title ?? "",
      thumbnail: oembed.thumbnail_url ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      duration:  0,
      channel:   oembed.author_name ?? "",
      formats,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lỗi không xác định";
    return res.status(500).json({ error: msg });
  }
});

/* ── GET /api/yt/download?url=...&quality=720 ── via cobalt.tools */
router.get("/download", async (req, res) => {
  const url     = String(req.query["url"]     ?? "");
  const quality = String(req.query["quality"] ?? "720");
  if (!url) return res.status(400).json({ error: "Thiếu tham số url" });

  try {
    const cobaltRes = await fetch("https://api.cobalt.tools/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept":        "application/json",
      },
      body: JSON.stringify({
        url,
        videoQuality:       quality,
        youtubeVideoCodec:  "h264",
        filenameStyle:      "basic",
        downloadMode:       "auto",
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!cobaltRes.ok) {
      const txt = await cobaltRes.text();
      throw new Error(`cobalt.tools lỗi ${cobaltRes.status}: ${txt.slice(0, 200)}`);
    }

    const data = await cobaltRes.json() as {
      status: string;
      url?: string;
      error?: { code?: string };
    };

    if ((data.status === "redirect" || data.status === "tunnel") && data.url) {
      return res.redirect(302, data.url);
    }

    if (data.status === "error") {
      throw new Error(data.error?.code ?? "cobalt error");
    }

    throw new Error(`cobalt trả về status không hợp lệ: ${data.status}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lỗi không xác định";
    if (!res.headersSent) return res.status(500).json({ error: msg });
  }
});

export default router;
