import { Router, type Request, type Response } from "express";

const router = Router();

const GEMINI_BASE_URL = process.env["AI_INTEGRATIONS_GEMINI_BASE_URL"] ?? "";
const GEMINI_API_KEY  = process.env["AI_INTEGRATIONS_GEMINI_API_KEY"] ?? "";
const GEMINI_MODEL    = "gemini-2.5-flash";

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

  if (!GEMINI_BASE_URL) {
    res.write(`data: ${JSON.stringify({ error: "Gemini chưa được cấu hình" })}\n\n`);
    res.end();
    return;
  }

  try {
    const body: Record<string, unknown> = { contents };
    if (system_instruction) body["system_instruction"] = system_instruction;
    if (generationConfig) {
      body["generationConfig"] = {
        temperature: generationConfig.temperature ?? 0.8,
        maxOutputTokens: generationConfig.maxOutputTokens ?? 8192,
      };
    }

    const url = `${GEMINI_BASE_URL}/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse`;

    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GEMINI_API_KEY}`,
      },
      body: JSON.stringify(body),
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
        if (!raw || raw === "[DONE]") continue;
        try {
          const parsed = JSON.parse(raw) as {
            candidates?: { content?: { parts?: { text?: string }[] } }[];
            error?: { message?: string };
          };
          if (parsed.error) {
            res.write(`data: ${JSON.stringify({ error: parsed.error.message })}\n\n`);
            continue;
          }
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
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
