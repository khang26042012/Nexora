import { Router, type Request, type Response } from "express";
import { insertToolLog } from "../lib/admin-db.js";

const router = Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
const GEMINI_MODEL   = "gemini-1.5-flash";
const GEMINI_URL     = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;

router.post("/chat", async (req: Request, res: Response) => {
  const { system_instruction, contents, generationConfig } = req.body as {
    system_instruction?: { parts: { text: string }[] };
    contents: { role: string; parts: { text?: string }[] }[];
    generationConfig?: { temperature?: number; maxOutputTokens?: number };
  };

  const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? req.ip ?? "unknown";
  const lastUserMsg = Array.isArray(contents)
    ? contents.filter(c => c.role === "user").at(-1)?.parts?.map(p => p.text ?? "").join("") ?? ""
    : "";
  insertToolLog({ ip, tool: "chat", action: "message", detail: lastUserMsg.slice(0, 500) });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  try {
    const upstream = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction,
        contents,
        generationConfig: {
          temperature: generationConfig?.temperature ?? 0.7,
          maxOutputTokens: generationConfig?.maxOutputTokens ?? 8192,
        },
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
        if (!raw || raw === "[DONE]") continue;
        res.write(`data: ${raw}\n\n`);
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
