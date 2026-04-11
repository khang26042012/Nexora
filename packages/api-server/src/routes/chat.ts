import { Router, type Request, type Response } from "express";

const router = Router();

const GLM_BASE_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
const GLM_MODEL    = "GLM-4V-Flash";
const GLM_API_KEY  = "T49q5w7eZI+2c3Giqf2G00twjoVevINN4TOY4AkPQqpr8koua+PdGHSBP/tX+m72Ehf/N6xN+Tq+oOtq8uxRzI3/fMq2dlt2W7TKqD9PHCVn4JY6M6VxOyRSqrBhH9hQtOTP";

// Gemini part → OpenAI content
function partToContent(part: { text?: string; inlineData?: { mimeType: string; data: string } }): unknown {
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
    const messages: { role: string; content: unknown }[] = [];

    if (system_instruction?.parts?.length) {
      messages.push({
        role: "system",
        content: system_instruction.parts.map((p) => p.text).join("\n"),
      });
    }

    for (const turn of contents ?? []) {
      const role = turn.role === "model" ? "assistant" : "user";
      const parts = turn.parts.map(partToContent);
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
