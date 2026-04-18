import { Router, type Request, type Response } from "express";
import multer from "multer";
import { insertToolLog } from "../lib/admin-db.js";
import {
  streamAI,
  moderateContent,
  routeIntent,
  generateImage,
  transcribeAudio,
  synthesizeSpeech,
  type AIMessage,
} from "../lib/ai-client.js";

const router  = Router();
const upload  = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const THINKING_SUFFIX = `

KHI CÂU HỎI PHỨC TẠP hoặc người dùng gõ từ "thinking":
Bắt đầu câu trả lời bằng thẻ <think>...</think> để trình bày quá trình suy nghĩ, rồi mới đưa ra câu trả lời chính thức bên ngoài thẻ đó.
Format: <think>\n[lý luận nội tâm]\n</think>\n[câu trả lời]`;

function trimMessages(msgs: AIMessage[], maxChars = 14000): AIMessage[] {
  let total = 0;
  const result: AIMessage[] = [];
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m   = msgs[i];
    const len = typeof m.content === "string"
      ? m.content.length
      : (m.content as { text?: string }[]).map(p => p.text ?? "").join("").length;
    if (total + len > maxChars && result.length > 0) break;
    result.unshift(m);
    total += len;
  }
  return result;
}

function sseWrite(res: Response, data: object) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function setupSSE(res: Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
}

async function streamWithThinkFilter(
  res: Response,
  messages: AIMessage[],
  model: string,
  maxTokens = 4000,
): Promise<string> {
  let inThinkTag    = false;
  let thinkEmitted  = false;
  let fullText      = "";

  for await (const chunk of streamAI(messages, { temperature: 0.7, maxTokens, model })) {
    if (chunk.includes("<think>")) {
      inThinkTag = true;
      if (!thinkEmitted) {
        sseWrite(res, { type: "thinking", active: true });
        thinkEmitted = true;
      }
    }
    if (chunk.includes("</think>")) {
      inThinkTag = false;
      sseWrite(res, { type: "thinking", active: false });
      const after = chunk.split("</think>").slice(1).join("</think>");
      if (after) { sseWrite(res, { text: after }); fullText += after; }
      continue;
    }
    if (!inThinkTag) {
      sseWrite(res, { text: chunk });
      fullText += chunk;
    }
  }

  if (thinkEmitted) sseWrite(res, { type: "thinking", active: false });
  return fullText;
}

router.post("/chat", async (req: Request, res: Response) => {
  const { messages, system } = req.body as { messages: AIMessage[]; system?: string };

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages array required" });
    return;
  }

  const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim()
    ?? req.ip ?? "unknown";

  const lastUser     = [...messages].reverse().find(m => m.role === "user");
  const lastUserText = typeof lastUser?.content === "string"
    ? lastUser.content
    : (lastUser?.content as { text?: string }[] ?? []).map(p => p.text ?? "").join("");
  insertToolLog({ ip, tool: "chat", action: "message", detail: lastUserText.slice(0, 500) });

  const hasImage = messages.some(m =>
    Array.isArray(m.content) &&
    (m.content as { type?: string }[]).some(p => p.type === "image_url")
  );
  const hasFile = !hasImage && lastUserText.startsWith("[Đính kèm file:");

  setupSSE(res);

  try {
    sseWrite(res, { type: "pipeline", stage: "moderating" });

    const modResult = await moderateContent(lastUserText);
    if (modResult.flagged) {
      sseWrite(res, { error: `⚠️ ${modResult.reason ?? "Nội dung không được phép"}` });
      res.end();
      return;
    }

    sseWrite(res, { type: "pipeline", stage: "routing" });

    const intent = await routeIntent(lastUserText, hasFile, hasImage);

    if (intent === "imagegen") {
      sseWrite(res, { type: "model", name: "dall-e-3" });
      sseWrite(res, { type: "pipeline", stage: "generating" });

      const prompt = lastUserText.replace(/^(vẽ|draw|generate image|tạo ảnh|sinh ảnh|hãy vẽ|vẽ cho|tạo hình)\s*/i, "").trim();
      try {
        const imageUrl = await generateImage(prompt || lastUserText);
        sseWrite(res, { type: "image", url: imageUrl });
        sseWrite(res, { text: `\n🎨 Ảnh đã được tạo bằng DALL-E 3.` });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Lỗi tạo ảnh";
        sseWrite(res, { error: `Lỗi tạo ảnh: ${msg}` });
      }
      res.end();
      return;
    }

    let model: string;
    if (intent === "thinking") {
      model = "deepseek-reasoner";
      sseWrite(res, { type: "model", name: "deepseek-reasoner" });
      sseWrite(res, { type: "thinking", active: true });
    } else if (intent === "bigcontext") {
      model = "gemini-2.5-flash";
      sseWrite(res, { type: "model", name: "gemini-2.5-flash" });
    } else {
      model = "gpt-4o";
      sseWrite(res, { type: "model", name: "gpt-4o" });
    }

    const sysContent = system
      ? (intent === "thinking" ? system + THINKING_SUFFIX : system)
      : undefined;

    const allMessages: AIMessage[] = [
      ...(sysContent ? [{ role: "system" as const, content: sysContent }] : []),
      ...trimMessages(messages),
    ];

    await streamWithThinkFilter(res, allMessages, model, intent === "thinking" ? 8000 : 4000);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    sseWrite(res, { error: msg });
  }

  res.end();
});

router.post("/chat/image", async (req: Request, res: Response) => {
  const { prompt } = req.body as { prompt?: string };
  if (!prompt || !prompt.trim()) {
    res.status(400).json({ error: "prompt required" });
    return;
  }
  const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? req.ip ?? "unknown";
  insertToolLog({ ip, tool: "chat-image", action: "generate", detail: prompt.slice(0, 200) });
  try {
    const imageUrl = await generateImage(prompt.trim());
    res.json({ url: imageUrl });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Image gen error";
    res.status(500).json({ error: msg });
  }
});

router.post("/chat/stt", upload.single("audio"), async (req: Request, res: Response) => {
  const file = (req as Request & { file?: Express.Multer.File }).file;
  if (!file) {
    res.status(400).json({ error: "audio file required" });
    return;
  }
  try {
    const text = await transcribeAudio(file.buffer, file.mimetype || "audio/webm");
    res.json({ text });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "STT error";
    res.status(500).json({ error: msg });
  }
});

router.post("/chat/tts", async (req: Request, res: Response) => {
  const { text, voice = "nova" } = req.body as { text?: string; voice?: string };
  if (!text || !text.trim()) {
    res.status(400).json({ error: "text required" });
    return;
  }
  try {
    const audioBuf = await synthesizeSpeech(text, voice);
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", audioBuf.length);
    res.send(audioBuf);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "TTS error";
    res.status(500).json({ error: msg });
  }
});

export default router;
