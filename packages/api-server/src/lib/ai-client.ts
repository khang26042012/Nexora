// ============================================================
//  Gemini Multi-Key Smart Caller
//  - 4 API keys xoay vòng
//  - Key bị 429/quota → skip, thử key tiếp
//  - Tất cả key hết → đổi proxy endpoint, thử lại
//  - Model duy nhất: gemini-2.5-flash
// ============================================================

const MODEL = "gemini-2.5-flash";

const GEMINI_KEYS: string[] = [
  process.env.GEMINI_KEY_1 ?? "",
  process.env.GEMINI_KEY_2 ?? "",
  process.env.GEMINI_KEY_3 ?? "",
  process.env.GEMINI_KEY_4 ?? "",
].filter(k => k.length > 0);

// Proxy endpoints — nếu endpoint 0 hết key hoặc bị block, thử endpoint 1+
const GEMINI_PROXIES: string[] = [
  "https://generativelanguage.googleapis.com/v1beta",
  "https://generativelanguage.googleapis.com/v1beta", // placeholder — thêm proxy thật ở đây nếu cần
];

// Cooldown state: keyIndex → timestamp hết cooldown
const keyCooldown = new Map<number, number>();
const COOLDOWN_MS = 60_000; // 60s cooldown mỗi key khi bị 429

function getAvailableKeys(): number[] {
  const now = Date.now();
  return GEMINI_KEYS.map((_, i) => i).filter(i => {
    const until = keyCooldown.get(i) ?? 0;
    return now >= until;
  });
}

function markKeyExhausted(keyIdx: number): void {
  keyCooldown.set(keyIdx, Date.now() + COOLDOWN_MS);
  console.warn(`[gemini] key${keyIdx + 1} exhausted → cooldown 60s`);
}

// ============================================================
//  Types
// ============================================================

type TextPart  = { type: "text"; text?: string };
type ImagePart = { type: "image_url"; image_url: { url: string } };
type ContentPart = TextPart | ImagePart;
export type MessageContent = string | ContentPart[];

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: MessageContent;
}

export interface StreamOptions {
  temperature?: number;
  maxTokens?:   number;
  model?:       string; // ignored — always gemini-2.5-flash
}

export type Intent = "direct" | "thinking" | "bigcontext" | "imagegen" | "download";

// ============================================================
//  Helpers
// ============================================================

function toGeminiParts(content: MessageContent): object[] {
  if (typeof content === "string") return [{ text: content }];
  return content.map(part => {
    if (part.type === "text") return { text: (part as TextPart).text ?? "" };
    if (part.type === "image_url") {
      const url = (part as ImagePart).image_url.url;
      const match = url.match(/^data:([^;]+);base64,(.+)$/s);
      if (match) return { inlineData: { mimeType: match[1], data: match[2] } };
    }
    return { text: "" };
  });
}

async function* parseGeminiStream(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader  = body.getReader();
  const decoder = new TextDecoder();
  let buffer    = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const raw = line.slice(5).trim();
      if (!raw || raw === "[DONE]") continue;
      try {
        const parsed = JSON.parse(raw);
        const parts  = parsed?.candidates?.[0]?.content?.parts ?? [];
        for (const part of parts) {
          if (part.thought === true) continue;
          if (part.text) yield part.text as string;
        }
      } catch { /* skip */ }
    }
  }
}

function buildGeminiPayload(messages: AIMessage[], opts: StreamOptions): object {
  const systemMsg = messages.find(m => m.role === "system");
  const otherMsgs = messages.filter(m => m.role !== "system");
  const payload: Record<string, unknown> = {
    contents: otherMsgs.map(m => ({
      role:  m.role === "assistant" ? "model" : "user",
      parts: toGeminiParts(m.content),
    })),
    generationConfig: {
      temperature:     opts.temperature ?? 0.7,
      maxOutputTokens: opts.maxTokens   ?? 4096,
    },
  };
  if (systemMsg) {
    const sysText = typeof systemMsg.content === "string" ? systemMsg.content : "";
    payload.system_instruction = { parts: [{ text: sysText }] };
  }
  return payload;
}

// ============================================================
//  Core: Smart key rotation với proxy fallback
// ============================================================

async function tryStreamWithKey(
  keyIdx: number,
  proxyBase: string,
  payload: object,
): Promise<AsyncGenerator<string> | null> {
  const key = GEMINI_KEYS[keyIdx];
  const url = `${proxyBase}/models/${MODEL}:streamGenerateContent?alt=sse&key=${key}`;
  try {
    const res = await fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      signal:  AbortSignal.timeout(30_000),
      body:    JSON.stringify(payload),
    });

    if (res.ok && res.body) {
      console.info(`[gemini] key${keyIdx + 1} proxy=${proxyBase.includes("googleapis") ? "google" : "proxy"} OK`);
      return parseGeminiStream(res.body);
    }

    // Đọc error body
    const errBody = await res.json().catch(() => ({})) as { error?: { message?: string; status?: string } };
    const errMsg  = errBody?.error?.message ?? `HTTP ${res.status}`;
    const status  = errBody?.error?.status  ?? "";

    // Quota / rate limit → cooldown key này
    if (res.status === 429 || status === "RESOURCE_EXHAUSTED" || errMsg.includes("quota")) {
      markKeyExhausted(keyIdx);
      return null;
    }

    // Auth fail → cooldown lâu hơn
    if (res.status === 401 || res.status === 403) {
      keyCooldown.set(keyIdx, Date.now() + 300_000); // 5 phút
      console.warn(`[gemini] key${keyIdx + 1} auth error (${res.status}) → cooldown 5m`);
      return null;
    }

    console.warn(`[gemini] key${keyIdx + 1} HTTP ${res.status}: ${errMsg}`);
    return null;
  } catch (e) {
    console.warn(`[gemini] key${keyIdx + 1} exception:`, (e as Error).message);
    return null;
  }
}

async function tryFetchWithKey(
  keyIdx: number,
  proxyBase: string,
  endpoint: string,
  payload: object,
): Promise<Response | null> {
  const key = GEMINI_KEYS[keyIdx];
  const url = `${proxyBase}/models/${endpoint}?key=${key}`;
  try {
    const res = await fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      signal:  AbortSignal.timeout(25_000),
      body:    JSON.stringify(payload),
    });

    if (res.ok) return res;

    const errBody = await res.json().catch(() => ({})) as { error?: { message?: string; status?: string } };
    const errMsg  = errBody?.error?.message ?? `HTTP ${res.status}`;
    const status  = errBody?.error?.status  ?? "";

    if (res.status === 429 || status === "RESOURCE_EXHAUSTED" || errMsg.includes("quota")) {
      markKeyExhausted(keyIdx);
      return null;
    }
    if (res.status === 401 || res.status === 403) {
      keyCooldown.set(keyIdx, Date.now() + 300_000);
      return null;
    }
    console.warn(`[gemini] key${keyIdx + 1} fetch HTTP ${res.status}: ${errMsg}`);
    return null;
  } catch (e) {
    console.warn(`[gemini] key${keyIdx + 1} fetch exception:`, (e as Error).message);
    return null;
  }
}

// Xoay vòng keys + proxy để stream
export async function* streamAI(
  messages: AIMessage[],
  opts: StreamOptions = {},
): AsyncGenerator<string> {
  const payload = buildGeminiPayload(messages, opts);

  for (const proxyBase of GEMINI_PROXIES) {
    const available = getAvailableKeys();
    for (const keyIdx of available) {
      const stream = await tryStreamWithKey(keyIdx, proxyBase, payload);
      if (stream) { yield* stream; return; }
    }
  }

  // Tất cả keys đều fail → thử lại với env key (nếu có) như safety net
  const envKey = process.env.GEMINI_API_KEY;
  if (envKey) {
    console.warn("[gemini] All rotated keys failed → trying GEMINI_API_KEY env");
    const url = `${GEMINI_PROXIES[0]}/models/${MODEL}:streamGenerateContent?alt=sse&key=${envKey}`;
    const res = await fetch(url, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    if (res.ok && res.body) { yield* parseGeminiStream(res.body); return; }
  }

  throw new Error("Tất cả Gemini API keys đều hết quota hoặc gặp lỗi. Vui lòng thử lại sau.");
}

// Xoay vòng keys + proxy cho non-streaming request
async function geminiGenerate(endpoint: string, payload: object): Promise<object> {
  for (const proxyBase of GEMINI_PROXIES) {
    const available = getAvailableKeys();
    for (const keyIdx of available) {
      const res = await tryFetchWithKey(keyIdx, proxyBase, endpoint, payload);
      if (res) return await res.json() as object;
    }
  }
  const envKey = process.env.GEMINI_API_KEY;
  if (envKey) {
    const url = `${GEMINI_PROXIES[0]}/models/${endpoint}?key=${envKey}`;
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (res.ok) return await res.json() as object;
  }
  throw new Error("Tất cả Gemini API keys đều hết quota.");
}

// ============================================================
//  Intent routing (rule-based — không cần gọi API)
// ============================================================

const IMAGEGEN_START_RE = /^(vẽ|draw|generate image|tạo ảnh|sinh ảnh|hãy vẽ|vẽ cho|tạo hình|hãy tạo ảnh|hãy tạo hình)/i;
const IMAGEGEN_ANY_RE   = /\btạo (một |cho tôi |cho mình )?(bức |tấm )?(ảnh|hình ảnh)\b|\b(generate|create|draw|render) (an? )?(image|picture|photo|illustration)\b/i;

function isImagegenRequest(userText: string): boolean {
  return IMAGEGEN_START_RE.test(userText.trim()) || IMAGEGEN_ANY_RE.test(userText);
}

const VIDEO_URL_RE = /https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|tiktok\.com\/.+|instagram\.com\/(?:reel|p)\/|vimeo\.com\/)\S*/i;
const DOWNLOAD_KW  = /\b(tải|download|tải về|tải video|lấy video|lưu video|tải xuống)\b/i;

export function extractVideoUrl(text: string): string | null {
  const m = text.match(VIDEO_URL_RE);
  return m ? m[0].replace(/[)\]>.,;!?'"]+$/, "") : null;
}

export function isDownloadRequest(text: string): boolean {
  return DOWNLOAD_KW.test(text) && VIDEO_URL_RE.test(text);
}

export async function routeIntent(
  userText: string,
  hasFile:  boolean,
  hasImage: boolean,
): Promise<Intent> {
  if (hasImage) return "bigcontext";
  if (isDownloadRequest(userText)) return "download";
  if (isImagegenRequest(userText)) return "imagegen";

  const t = userText.toLowerCase();
  if (hasFile || userText.length > 800) return "bigcontext";
  if (/viết code|lập trình|thuật toán|algorithm|debug|c\+\+|esp32|firmware|arduino|javascript|python|typescript|sql|regex|toán học|math|tính toán|phân tích sâu|giải thích chi tiết/.test(t)) return "thinking";
  return "direct";
}

// ============================================================
//  Image generation (Pollinations.ai — không cần key)
// ============================================================

export async function generateImage(prompt: string): Promise<string> {
  let enhancedPrompt = prompt;

  // Dùng Gemini để enhance prompt trước
  try {
    const payload = {
      contents: [{
        role: "user",
        parts: [{ text: `You are an expert image prompt engineer. Translate the following prompt to English (if not already) and enhance it with vivid details, artistic style, lighting, and composition cues to maximize image quality. Return ONLY the enhanced English prompt, nothing else.\n\nPrompt: ${prompt}` }],
      }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 300 },
    };
    const data = await geminiGenerate(`${MODEL}:generateContent`, payload) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (text) enhancedPrompt = text;
  } catch { /* dùng prompt gốc nếu fail */ }

  const encoded = encodeURIComponent(enhancedPrompt);
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&nologo=true&model=flux`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error(`Image gen failed: HTTP ${res.status}`);
  return url;
}

// ============================================================
//  Audio transcription (Gemini native)
// ============================================================

export async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
  const safeMime = mimeType.includes("webm") ? "audio/webm"
                 : mimeType.includes("ogg")  ? "audio/ogg"
                 : mimeType.includes("mp4")  ? "audio/mp4"
                 : mimeType.includes("wav")  ? "audio/wav"
                 : "audio/webm";

  const base64Audio = audioBuffer.toString("base64");
  const payload = {
    contents: [{
      role: "user",
      parts: [
        { inlineData: { mimeType: safeMime, data: base64Audio } },
        { text: "Transcribe this audio accurately. Return ONLY the transcribed text, no explanation, no quotes, no extra formatting." },
      ],
    }],
    generationConfig: { temperature: 0, maxOutputTokens: 1024 },
  };

  const data = await geminiGenerate(`${MODEL}:generateContent`, payload) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
}

// ============================================================
//  TTS — không có Gemini TTS, trả lỗi rõ ràng
// ============================================================

export async function synthesizeSpeech(_text: string, _voice = "nova"): Promise<Buffer> {
  throw new Error("TTS không khả dụng (đã xóa Zuki). Vui lòng tắt tính năng đọc to.");
}
