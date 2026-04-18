const ZUKI_BASE    = "https://api.zukijourney.com/v1";
const GEMINI_BASE  = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse";

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
  model?:       string;
}

export type Intent = "direct" | "thinking" | "bigcontext" | "imagegen";

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

async function* parseOpenAIStream(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
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
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (!raw || raw === "[DONE]") continue;
      try {
        const chunk = (JSON.parse(raw) as { choices?: { delta?: { content?: string } }[] })
          ?.choices?.[0]?.delta?.content ?? "";
        if (chunk) yield chunk;
      } catch { /* skip */ }
    }
  }
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

async function* streamGeminiNative(
  messages: AIMessage[],
  opts: StreamOptions,
): AsyncGenerator<string> {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set");

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

  const res = await fetch(`${GEMINI_BASE}&key=${GEMINI_API_KEY}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(payload),
  });
  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err?.error?.message ?? `Gemini HTTP ${res.status}`);
  }
  yield* parseGeminiStream(res.body);
}

export async function* streamAI(
  messages: AIMessage[],
  opts: StreamOptions = {},
): AsyncGenerator<string> {
  const { temperature = 0.7, maxTokens = 4096, model = "gemini-2.5-flash" } = opts;
  const apiKey       = process.env.ZUKI_API_KEY ?? "";
  const isGeminiModel = model.startsWith("gemini");

  if (apiKey) {
    try {
      const res = await fetch(`${ZUKI_BASE}/chat/completions`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body:    JSON.stringify({ model, stream: true, temperature, max_tokens: maxTokens, messages }),
      });
      if (res.ok && res.body) {
        yield* parseOpenAIStream(res.body);
        return;
      }
      const errBody = await res.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(errBody?.error?.message ?? `Zuki HTTP ${res.status}`);
    } catch (err) {
      if (!isGeminiModel) throw err;
    }
  }

  if (!isGeminiModel) {
    throw new Error(`ZUKI_API_KEY not configured — cannot use model ${model}`);
  }
  yield* streamGeminiNative(messages, opts);
}


export async function routeIntent(
  userText: string,
  hasFile:  boolean,
  hasImage: boolean,
): Promise<Intent> {
  if (hasImage) return "bigcontext";
  if (/^(vẽ |draw |generate image|tạo ảnh|sinh ảnh|hãy vẽ|vẽ cho|tạo hình)/i.test(userText.trim())) {
    return "imagegen";
  }

  const apiKey = process.env.ZUKI_API_KEY ?? "";
  if (!apiKey) return "direct";

  try {
    const res = await fetch(`${ZUKI_BASE}/chat/completions`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model:       "gpt-4o",
        stream:      false,
        max_tokens:  10,
        temperature: 0,
        messages: [
          {
            role: "system",
            content: `Classify the user message. Reply with ONLY one word:
"imagegen" — user wants to generate/draw/render an image, diagram, or illustration
"thinking"  — code, C/C++/firmware/ESP32, algorithm, math, debug, logic, step-by-step reasoning
"bigcontext" — analyse file/log/document, translate long text, summarize large content${hasFile ? " (file attached)" : ""}
"direct"    — everything else: greetings, general info, simple questions`,
          },
          { role: "user", content: userText.slice(0, 600) },
        ],
      }),
    });
    if (res.ok) {
      const data  = await res.json() as { choices?: { message?: { content?: string } }[] };
      const reply = (data?.choices?.[0]?.message?.content ?? "").trim().toLowerCase();
      if (reply.startsWith("imagegen")) return "imagegen";
      if (reply.startsWith("thinking")) return "thinking";
      if (reply.startsWith("bigcontext")) return "bigcontext";
    }
  } catch { /* fallback to direct */ }

  return "direct";
}

export async function generateImage(prompt: string): Promise<string> {
  const apiKey = process.env.ZUKI_API_KEY ?? "";
  if (!apiKey) throw new Error("ZUKI_API_KEY not configured — cannot generate image");

  const res = await fetch(`${ZUKI_BASE}/images/generations`, {
    method:  "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body:    JSON.stringify({ model: "dall-e-3", prompt, n: 1, size: "1024x1024" }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err?.error?.message ?? `Image gen HTTP ${res.status}`);
  }
  const data = await res.json() as { data?: { url?: string }[] };
  const url  = data?.data?.[0]?.url;
  if (!url) throw new Error("Không nhận được URL ảnh từ dall-e-3");
  return url;
}

export async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured — cannot transcribe audio");

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

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err?.error?.message ?? `Gemini STT HTTP ${res.status}`);
  }
  const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
}

export async function synthesizeSpeech(text: string, voice = "nova"): Promise<Buffer> {
  const apiKey = process.env.ZUKI_API_KEY ?? "";
  if (!apiKey) throw new Error("ZUKI_API_KEY not configured — cannot synthesize speech");

  const res = await fetch(`${ZUKI_BASE}/audio/speech`, {
    method:  "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body:    JSON.stringify({ model: "gpt-4o-mini-tts", input: text.slice(0, 4096), voice }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err?.error?.message ?? `TTS HTTP ${res.status}`);
  }
  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
}
