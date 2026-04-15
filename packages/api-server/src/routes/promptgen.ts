import { Router, type Request, type Response } from "express";

const router = Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
const GEMINI_MODEL   = "gemini-2.5-flash";
const GEMINI_URL     = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;

function buildSystemPrompt(mode: string, lang: string): string {
  const langLabel = lang === "en" ? "English" : "Tiếng Việt";

  if (mode === "manual") {
    return `You are a world-class prompt engineer. Your job is to take the user's structured parameters and craft ONE polished, complete, ready-to-use AI prompt.

CRITICAL RULES — follow strictly:
- Output ONLY the final prompt text — nothing else
- Do NOT ask any questions or request more information under any circumstances
- Do NOT include headers, labels, bullet points, or explanations
- Do NOT use markdown formatting — no asterisks, no bold, no italic, no numbered lists
- Output plain text only, ready to paste into any LLM
- Combine all parameters naturally into a single coherent prompt
- Write the output prompt in ${langLabel}
- Make it specific, clear, and actionable`;
  }

  return `You are a world-class prompt engineer. The user gives you a short rough idea. Your job is to immediately expand and rewrite it into a clear, detailed, effective AI prompt.

CRITICAL RULES — follow strictly:
- Output ONLY the final prompt text — nothing else, no questions, no preamble
- NEVER ask for clarification or more details — work with what you have and make smart assumptions
- NEVER write "Here is your prompt:", "Sure!", or any introduction — start directly with the prompt content
- Do NOT use markdown formatting — no asterisks, no bold, no italic, no numbered lists with **
- Output plain text only
- Do NOT add role-playing or system constraints unless the user mentioned them
- Write the output prompt in ${langLabel}`;
}

function buildUserMessage(mode: string, body: Record<string, string>): string {
  if (mode === "manual") {
    const parts: string[] = [];
    if (body.role?.trim())         parts.push(`Role/Persona: ${body.role.trim()}`);
    if (body.task?.trim())         parts.push(`Task: ${body.task.trim()}`);
    if (body.context?.trim())      parts.push(`Context: ${body.context.trim()}`);
    if (body.tone?.trim())         parts.push(`Tone/Style: ${body.tone.trim()}`);
    if (body.outputFormat?.trim()) parts.push(`Output format: ${body.outputFormat.trim()}`);
    if (body.extra?.trim())        parts.push(`Additional requirements: ${body.extra.trim()}`);
    return parts.join("\n");
  }
  return body.description?.trim() ?? "";
}

router.post("/prompt-gen", async (req: Request, res: Response) => {
  const { mode = "ai", lang = "vi", ...rest } = req.body as Record<string, string>;

  const userMsg = buildUserMessage(mode, rest);
  if (!userMsg) {
    res.status(400).json({ error: "Không có nội dung" });
    return;
  }

  if (!GEMINI_API_KEY) {
    res.status(500).json({ error: "GEMINI_API_KEY chưa được set" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const payload = {
    system_instruction: { parts: [{ text: buildSystemPrompt(mode, lang) }] },
    contents: [{ role: "user", parts: [{ text: userMsg }] }],
    generationConfig: { temperature: 0.85, maxOutputTokens: 2048 },
  };

  const gemRes = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!gemRes.ok || !gemRes.body) {
    const errText = await gemRes.text().catch(() => "");
    res.write(`data: ${JSON.stringify({ error: `Gemini ${gemRes.status}: ${errText.slice(0, 200)}` })}\n\n`);
    res.end();
    return;
  }

  const reader = gemRes.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split("\n")) {
      if (!line.startsWith("data:")) continue;
      const raw = line.slice(5).trim();
      if (raw === "[DONE]") continue;
      try {
        const json = JSON.parse(raw);
        const text: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
      } catch { /* skip */ }
    }
  }

  res.write("data: [DONE]\n\n");
  res.end();
});

export default router;
