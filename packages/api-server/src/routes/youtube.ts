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
    const oembed = await oembedRes.json() as {
      title?: string; author_name?: string; thumbnail_url?: string;
    };

    const title = oembed.title ?? "";
    const base  = `${req.protocol}://${req.get("host")}`;
    const enc   = (v: string) => encodeURIComponent(v);

    const formats = [
      { itag: "1080", quality: "1080p", ext: "mp4", url: `${base}/api/yt/download?url=${enc(url)}&quality=1080&title=${enc(title)}` },
      { itag: "720",  quality: "720p",  ext: "mp4", url: `${base}/api/yt/download?url=${enc(url)}&quality=720&title=${enc(title)}`  },
      { itag: "480",  quality: "480p",  ext: "mp4", url: `${base}/api/yt/download?url=${enc(url)}&quality=480&title=${enc(title)}`  },
      { itag: "360",  quality: "360p",  ext: "mp4", url: `${base}/api/yt/download?url=${enc(url)}&quality=360&title=${enc(title)}`  },
    ];

    return res.json({
      title,
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

/* ── GET /api/yt/download?url=...&quality=720&title=... ── proxy qua server ── */
router.get("/download", async (req, res) => {
  const url     = String(req.query["url"]     ?? "");
  const quality = String(req.query["quality"] ?? "720");
  const title   = String(req.query["title"]   ?? "video").slice(0, 100).replace(/[^\w\s\-_()\u00C0-\u1EF9]/g, "").trim() || "video";

  if (!url) return res.status(400).json({ error: "Thiếu tham số url" });

  try {
    /* 1. Gọi cobalt.tools để lấy URL tải xuống */
    const cobaltRes = await fetch("https://api.cobalt.tools/", {
      method:  "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        url,
        videoQuality:      quality,
        youtubeVideoCodec: "h264",
        filenameStyle:     "basic",
        downloadMode:      "auto",
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!cobaltRes.ok) {
      throw new Error(`cobalt.tools lỗi ${cobaltRes.status}`);
    }

    const data = await cobaltRes.json() as {
      status:    string;
      url?:      string;
      filename?: string;
      error?:    { code?: string; message?: string };
      picker?:   Array<{ url: string; type?: string }>;
    };

    /* 2. Lấy URL thực tế từ response */
    let dlUrl: string | undefined;

    if ((data.status === "redirect" || data.status === "tunnel") && data.url) {
      dlUrl = data.url;
    } else if (data.status === "picker" && data.picker?.length) {
      /* Karaoke/slideshow: lấy item đầu tiên có type=video, hoặc item đầu tiên */
      dlUrl = data.picker.find(p => p.type === "video")?.url ?? data.picker[0].url;
    } else if (data.status === "error") {
      throw new Error(data.error?.message ?? data.error?.code ?? "cobalt.tools error");
    } else {
      throw new Error(`cobalt status: ${data.status}`);
    }

    if (!dlUrl) throw new Error("Không lấy được URL từ cobalt.tools");

    /* 3. Proxy stream qua server — giữ Content-Type: video/mp4 đúng */
    const upstream = await fetch(dlUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120",
        "Accept":     "*/*",
      },
      signal: AbortSignal.timeout(180000),
    });

    if (!upstream.ok) {
      throw new Error(`Upstream lỗi ${upstream.status} — thử chất lượng khác`);
    }

    /* Nếu upstream trả JSON (cobalt lỗi sau redirect), bắn lỗi đúng */
    const upCt = upstream.headers.get("content-type") ?? "";
    if (upCt.includes("json") || upCt.includes("html")) {
      const errBody = await upstream.text();
      try {
        const errJson = JSON.parse(errBody);
        throw new Error(errJson?.error?.message ?? errJson?.error?.code ?? "cobalt tunnel lỗi");
      } catch { throw new Error("Không tải được video — thử chất lượng khác"); }
    }

    /* 4. Stream video về client với headers đúng */
    const cl = upstream.headers.get("content-length");
    if (cl) res.setHeader("Content-Length", cl);

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Disposition", `attachment; filename="${title}_${quality}p.mp4"`);
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("X-Content-Type-Options", "nosniff");

    req.on("close", () => { /* client ngắt kết nối */ });

    const reader = upstream.body!.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      /* Backpressure: đợi drain nếu buffer đầy */
      if (!res.write(Buffer.from(value))) {
        await new Promise(r => res.once("drain", r));
      }
    }
    res.end();

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lỗi không xác định";
    if (!res.headersSent) return res.status(500).json({ error: msg });
  }
});

export default router;
