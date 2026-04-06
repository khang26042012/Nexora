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
      { itag: "1080", quality: "1080p", ext: "mp4", url: `${base}/api/yt/download?url=${enc(url)}&quality=1080` },
      { itag: "720",  quality: "720p",  ext: "mp4", url: `${base}/api/yt/download?url=${enc(url)}&quality=720`  },
      { itag: "480",  quality: "480p",  ext: "mp4", url: `${base}/api/yt/download?url=${enc(url)}&quality=480`  },
      { itag: "360",  quality: "360p",  ext: "mp4", url: `${base}/api/yt/download?url=${enc(url)}&quality=360`  },
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

/* ── GET /api/yt/download?url=...&quality=720
 *  Chỉ RESOLVE URL từ cobalt → trả JSON { url, filename }
 *  Frontend dùng URL này mở tab mới → browser user tải trực tiếp
 *  (Không proxy qua server — cobalt tunnel chặn datacenter IP)
 * ── */
router.get("/download", async (req, res) => {
  const rawUrl  = String(req.query["url"]     ?? "");
  const quality = String(req.query["quality"] ?? "720");
  if (!rawUrl) return res.status(400).json({ error: "Thiếu tham số url" });

  /* Chuẩn hoá URL: bỏ ?si= và các tracking params, dùng dạng watch?v= */
  const videoId = extractVideoId(rawUrl);
  if (!videoId) return res.status(400).json({ error: "Link YouTube không hợp lệ" });
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  try {
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
      picker?:   Array<{ url: string; type?: string; filename?: string }>;
    };

    let dlUrl:  string | undefined;
    let dlName: string | undefined;

    if ((data.status === "redirect" || data.status === "tunnel") && data.url) {
      dlUrl  = data.url;
      dlName = data.filename;
    } else if (data.status === "picker" && data.picker?.length) {
      const picked = data.picker.find(p => p.type === "video") ?? data.picker[0];
      dlUrl  = picked.url;
      dlName = picked.filename;
    } else if (data.status === "error") {
      throw new Error(data.error?.message ?? data.error?.code ?? "cobalt error");
    } else {
      throw new Error(`cobalt status: ${data.status}`);
    }

    if (!dlUrl) throw new Error("Không lấy được URL từ cobalt.tools");

    return res.json({ url: dlUrl, filename: dlName ?? `video_${quality}p.mp4` });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lỗi không xác định";
    return res.status(500).json({ error: msg });
  }
});

export default router;
