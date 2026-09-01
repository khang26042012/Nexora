import { Router, type Request, type Response } from "express";

const router = Router();

/* ── Config (ALL from env vars — never hardcode secrets) ── */
const GITHUB_TOKEN = process.env.GITHUB_STATS_TOKEN || "";
const GITHUB_REPO = process.env.GITHUB_STATS_REPO || "khang26042012/mc-player-stats";
const GITHUB_BRANCH = process.env.GITHUB_STATS_BRANCH || "main";
const PLAYER_DB_URL = process.env.PLAYER_DB_URL || "https://files.catbox.moe/gj3i7r.json";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";

/* ── Helpers ── */
async function fetchPlayerDb(): Promise<{ uuid: string; name: string }[]> {
  const res = await fetch(PLAYER_DB_URL);
  return res.json();
}

async function fetchStatsFromGithub(uuid: string): Promise<Record<string, any> | null> {
  if (!GITHUB_TOKEN) {
    console.error("[investigate] GITHUB_STATS_TOKEN not configured");
    return null;
  }
  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/stats/${uuid}.json?ref=${GITHUB_BRANCH}`;
  const res = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${GITHUB_TOKEN}`,
      "Accept": "application/vnd.github.v3+json"
    }
  });
  if (!res.ok) return null;
  const data = await res.json();
  const content = Buffer.from(data.content, "base64").toString("utf-8");
  return JSON.parse(content);
}

async function analyzeWithDeepSeek(stats: Record<string, any>, playerName: string) {
  if (!DEEPSEEK_API_KEY) {
    console.error("[investigate] DEEPSEEK_API_KEY not configured");
    return {
      riskLevel: "MEDIUM" as const,
      summary: "AI chưa được cấu hình. Vui lòng kiểm tra server.",
      flags: ["Thiếu API key"],
      playtimeHours: 0,
      keyStats: {}
    };
  }

  const prompt = `Analyze this Minecraft player stats for potential cheating/duping.
Player: ${playerName}
Stats: ${JSON.stringify(stats)}

Respond in EXACTLY this JSON format (no markdown, no explanation):
{
  "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "summary": "One sentence Vietnamese summary of findings",
  "flags": ["list of specific concerns in Vietnamese"],
  "playtimeHours": <number>,
  "keyStats": {"diamonds_mined": <n>, "deaths": <n>, "mob_kills": <n>}
}

Focus on: diamond pickup/mined ratio, netherite supply chain, XP rate vs playtime, unusual item counts.
Do NOT reveal raw numbers that could be exploited. Keep summary brief and actionable.`;

  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 500
    })
  });

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "{}";

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : text;
    return JSON.parse(jsonStr);
  } catch {
    return {
      riskLevel: "MEDIUM" as const,
      summary: "Không thể phân tích tự động. Vui lòng kiểm tra thủ công.",
      flags: ["Lỗi parse kết quả AI"],
      playtimeHours: 0,
      keyStats: {}
    };
  }
}

/* ── Route ── */
router.post("/investigate", async (req: Request, res: Response) => {
  const { playerName } = req.body;
  if (!playerName || typeof playerName !== "string") {
    res.status(400).json({ error: "Missing playerName" });
    return;
  }

  try {
    const players = await fetchPlayerDb();
    const player = players.find(p => p.name.toLowerCase() === playerName.trim().toLowerCase());
    if (!player) {
      res.status(404).json({ error: `Không tìm thấy player "${playerName}"` });
      return;
    }

    const stats = await fetchStatsFromGithub(player.uuid);
    if (!stats) {
      res.status(404).json({ error: "Không tìm thấy stats. Plugin có thể chưa export." });
      return;
    }

    const analysis = await analyzeWithDeepSeek(stats, player.name);
    res.json(analysis);

  } catch (e: any) {
    console.error("[investigate] Error:", e);
    res.status(500).json({ error: "Lỗi server: " + (e.message || "Unknown") });
  }
});

export default router;
