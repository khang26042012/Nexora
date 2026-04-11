import { Router, type Request, type Response } from "express";

const router = Router();

const GLM_API_KEY = "pPkt7MEjmndvE80ERx9WK1nmjOJ/eD0KlMTNsSEkXzhHLrKMvmKdj+MMNxu0mRqpm5h6a8jYJZ6g8ihI+Qo1EnFiDWs76y1KXOn6sITP4eUKi4pAhJXMNyGEekAK8zsG88u8";
const GLM_MODEL = "GLM-4V-Flash";
const GLM_BASE_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";

// Gemini part → text content
function partToText(part: { text?: string; inlineData?: { mimeType: string; data: string } }): unknown {
  if (part.inlineData) {
    return {
      type: "image_url",
      image_url: { url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` },
    };
  }
  return { type: "text", text: part.text ?? "" };
}

router.post("/chat", async (req: Request, res: Response) => {
  const { system_instruction, contents, generationConfig } = req.body as {
    system_instruction?: { parts: { text: string }[] };
    contents: { role: string; parts: { text?: string; inlineData?: { mimeType: string; data: string } }[] }[];
    generationConfig?: { temperature?: number; maxOutputTokens?: number };
  };

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  try {
    // Chuyển Gemini format → OpenAI messages format
    const messages: { role: string; content: unknown }[] = [];

    if (system_instruction?.parts?.length) {
      messages.push({
        role: "system",
        content: system_instruction.parts.map((p) => p.text).join("\n"),
      });
    }

    for (const turn of contents ?? []) {
      const role = turn.role === "model" ? "assistant" : "user";
      const parts = turn.parts.map(partToText);
      messages.push({
        role,
        content: parts.length === 1 && (parts[0] as { type: string }).type === "text"
          ? (parts[0] as { type: string; text: string }).text
          : parts,
      });
    }

    const upstream = await fetch(GLM_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: GLM_MODEL,
        messages,
        stream: true,
        temperature: generationConfig?.temperature ?? 0.7,
        max_tokens: generationConfig?.maxOutputTokens ?? 8192,
      }),
    });

    if (!upstream.ok) {
      const errData = await upstream.json().catch(() => ({})) as { error?: { message?: string } };
      res.write(`data: ${JSON.stringify({ error: errData?.error?.message ?? `HTTP ${upstream.status}` })}\n\n`);
      res.end();
      return;
    }

    const reader = upstream.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });

      // Convert OpenAI SSE → Gemini SSE format mà frontend đang đọc
      const lines = chunk.split("\n");
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (raw === "[DONE]") continue;
        try {
          const parsed = JSON.parse(raw) as {
            choices?: { delta?: { content?: string } }[];
            error?: { message?: string };
          };
          if (parsed.error) {
            res.write(`data: ${JSON.stringify({ error: parsed.error.message })}\n\n`);
            continue;
          }
          const text = parsed.choices?.[0]?.delta?.content;
          if (text) {
            res.write(`data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] })}\n\n`);
          }
        } catch {
          // ignore parse errors
        }
      }
    }

    res.end();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
    res.end();
  }
});

export default router;
