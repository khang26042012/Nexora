import { Router, type Request, type Response } from "express";
import multer from "multer";
import sharp from "sharp";
import { insertToolLog } from "../lib/admin-db.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const HF_MODEL = "https://api-inference.huggingface.co/models/briaai/RMBG-1.4";

async function removeBgHuggingFace(imageBuffer: Buffer, mimeType: string): Promise<Buffer> {
  const headers: Record<string, string> = { "Content-Type": mimeType };
  const hfToken = process.env.HF_TOKEN;
  if (hfToken) headers["Authorization"] = `Bearer ${hfToken}`;

  const res = await fetch(HF_MODEL, {
    method: "POST",
    headers,
    body: imageBuffer,
    signal: AbortSignal.timeout(90_000),
  });

  if (res.status === 503) {
    const body = await res.json().catch(() => ({})) as any;
    const wait = body?.estimated_time ?? 30;
    throw Object.assign(new Error(`Model đang khởi động (~${Math.ceil(wait)}s), thử lại sau.`), { status: 503 });
  }

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`HuggingFace API lỗi ${res.status}: ${msg.slice(0, 200)}`);
  }

  const contentType = res.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    // Segmentation response: [{label, score, mask (base64 PNG grayscale)}]
    const segments = await res.json() as Array<{ label: string; score: number; mask: string }>;
    const seg = segments[0];
    if (!seg?.mask) throw new Error("Không nhận được mask từ API");

    const maskBuf = Buffer.from(seg.mask, "base64");
    const meta = await sharp(imageBuffer).metadata();
    const w = meta.width!, h = meta.height!;

    // Resize mask to match original, convert to grayscale raw
    const maskGray = await sharp(maskBuf).resize(w, h).greyscale().raw().toBuffer();

    // Apply mask as alpha channel
    const { data, info } = await sharp(imageBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const out = Buffer.from(data);
    for (let i = 0; i < info.width * info.height; i++) {
      out[i * 4 + 3] = maskGray[i];
    }

    return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
      .png()
      .toBuffer();
  }

  // Direct binary PNG response
  return Buffer.from(await res.arrayBuffer());
}

async function removeBgRemoveBg(imageBuffer: Buffer, mimeType: string, apiKey: string, originalName: string): Promise<Buffer> {
  const form = new FormData();
  const blob = new Blob([imageBuffer], { type: mimeType });
  form.append("image_file", blob, originalName);
  form.append("size", "auto");
  form.append("format", "png");

  const res = await fetch("https://api.remove.bg/v1.0/removebg", {
    method: "POST",
    headers: { "X-Api-Key": apiKey },
    body: form,
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    let msg = `remove.bg lỗi ${res.status}`;
    try { msg = (JSON.parse(errText)?.errors?.[0]?.title) ?? msg; } catch { /* ignore */ }
    throw new Error(msg);
  }

  return Buffer.from(await res.arrayBuffer());
}

router.post("/bg-remove", upload.single("image"), async (req: Request, res: Response) => {
  if (!req.file) { res.status(400).json({ error: "Không có file ảnh" }); return; }

  const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? req.ip ?? "unknown";
  insertToolLog({ ip, tool: "bg-remover", action: "remove", detail: `size=${req.file.size}` });

  try {
    let resultBuf: Buffer;

    const removeBgKey = process.env.REMOVE_BG_API_KEY;
    if (removeBgKey) {
      // Primary: remove.bg if API key is set
      resultBuf = await removeBgRemoveBg(
        req.file.buffer,
        req.file.mimetype,
        removeBgKey,
        req.file.originalname ?? "image.jpg"
      );
    } else {
      // Free fallback: HuggingFace RMBG-1.4
      resultBuf = await removeBgHuggingFace(req.file.buffer, req.file.mimetype);
    }

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", 'attachment; filename="no_bg.png"');
    res.setHeader("Content-Length", resultBuf.length);
    res.send(resultBuf);
  } catch (e: any) {
    const status = (e as any)?.status ?? 500;
    res.status(status).json({ error: e?.message ?? "Lỗi server" });
  }
});

export default router;
