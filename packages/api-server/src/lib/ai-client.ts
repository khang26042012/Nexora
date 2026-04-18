const ZUKI_MODEL  = "gemini-2.5-flash";
const ZUKI_URL    = "https://api.zukijourney.com/v1/chat/completions";
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_BASE  = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse`;

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
  maxTokens?: number;
}

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
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
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
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
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
        const parts = parsed?.candidates?.[0]?.content?.parts ?? [];
        for (const part of parts) {
          if (part.thought === true) continue;
          if (part.text) yield part.text as string;
        }
      } catch { /* skip */ }
    }
  }
}

export async function* streamAI(
  messages: AIMessage[],
  opts: StreamOptions = {},
): AsyncGenerator<string> {
  const { temperature = 0.7, maxTokens = 4096 } = opts;
  const ZUKI_API_KEY  = process.env.ZUKI_API_KEY  ?? "";
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";

  if (ZUKI_API_KEY) {
    try {
      const res = await fetch(ZUKI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ZUKI_API_KEY}`,
        },
        body: JSON.stringify({
          model: ZUKI_MODEL,
          stream: true,
          temperature,
          max_tokens: maxTokens,
          messages,
        }),
      });
      if (res.ok && res.body) {
        yield* parseOpenAIStream(res.body);
        return;
      }
    } catch {
      // fallthrough to Gemini
    }
  }

  if (!GEMINI_API_KEY) {
    throw new Error("Không có API key khả dụng (ZUKI_API_KEY và GEMINI_API_KEY đều chưa set)");
  }

  const systemMsg = messages.find(m => m.role === "system");
  const otherMsgs  = messages.filter(m => m.role !== "system");

  const payload: Record<string, unknown> = {
    contents: otherMsgs.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: toGeminiParts(m.content),
    })),
    generationConfig: { temperature, maxOutputTokens: maxTokens },
  };
  if (systemMsg) {
    const sysText = typeof systemMsg.content === "string" ? systemMsg.content : "";
    payload.system_instruction = { parts: [{ text: sysText }] };
  }

  const gemRes = await fetch(`${GEMINI_BASE}&key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!gemRes.ok || !gemRes.body) {
    const err = await gemRes.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err?.error?.message ?? `Gemini HTTP ${gemRes.status}`);
  }

  yield* parseGeminiStream(gemRes.body);
}
