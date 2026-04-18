import { Router, type Request, type Response } from "express";
import { insertToolLog } from "../lib/admin-db.js";
import { streamAI } from "../lib/ai-client.js";

const router = Router();

function buildSystemPrompt(mode: string, lang: string): string {
  const langLabel = lang === "en" ? "English" : "Tiếng Việt";
  if (mode === "manual") {
    return `You are a world-class prompt engineer. Your job is to take the user's structured parameters and craft ONE polished, complete, ready-to-use AI prompt.

CRITICAL RULES — follow strictly:
- NEVER ask the user any questions — generate immediately with what you have
- NEVER say "Please provide...", "Could you tell me..." or similar
- Start directly with the prompt — no preamble, no "Here is your prompt:"
- Where values are missing or vague, embed a placeholder in square brackets, e.g. [chủ đề cụ thể], [tên người nhận]
- If placeholders are present, add ONE short note at the end: "Ghi chú: Điền [placeholder] để prompt hoạt động tốt hơn."
- Do NOT use markdown formatting — no asterisks, no bold, no italic, no numbered lists
- Output plain text only, ready to paste into any LLM
- Write the output prompt in ${langLabel}
- Make it specific, clear, and actionable`;
  }
  return `You are a world-class prompt engineer. The user gives you a short rough idea. Your job is to immediately write a complete, detailed, ready-to-use AI prompt.

CRITICAL RULES — follow strictly:
- NEVER ask the user any questions — not before, during, or after generating
- NEVER say "Please provide...", "Could you tell me...", "What is your..." or any variation
- Start the output directly with the prompt content — no preamble, no "Here is your prompt:", no "Sure!"
- Where specific information is missing (name, company, topic, etc.), embed a short inline placeholder in square brackets, for example: [tên công ty], [vị trí ứng tuyển], [số năm kinh nghiệm]
- After the prompt body, add ONE short note line (in ${langLabel}) starting with "Ghi chú:" listing what placeholders the user should fill in — keep it under 1 sentence
- Do NOT use markdown formatting — no asterisks, no bold, no italic, no numbered lists with **
- Output plain text only
- Write the entire prompt in ${langLabel}`;
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
  if (!userMsg) { res.status(400).json({ error: "Không có nội dung" }); return; }

  const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? req.ip ?? "unknown";
  insertToolLog({ ip, tool: "prompt-gen", action: mode, detail: userMsg.slice(0, 500) });

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    for await (const chunk of streamAI([
      { role: "system", content: buildSystemPrompt(mode, lang) },
      { role: "user", content: userMsg },
    ], { temperature: 0.85, maxTokens: 2048 })) {
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    }
  } catch (err: unknown) {
    res.write(`data: ${JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" })}\n\n`);
  }
  res.write("data: [DONE]\n\n");
  res.end();
});

export default router;
