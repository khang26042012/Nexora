import { Router, type Request, type Response } from "express";
import {
  getAccessLogs,
  getToolLogs,
  getStats,
  clearLogs,
} from "../lib/admin-db.js";

const router = Router();

const ADMIN_KEY = process.env.ADMIN_KEY ?? "nexora2026";

function auth(req: Request, res: Response): boolean {
  const key = req.headers["x-admin-key"] ?? req.query.key;
  if (key !== ADMIN_KEY) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

router.get("/admin/stats", (req: Request, res: Response) => {
  if (!auth(req, res)) return;
  res.json(getStats());
});

router.get("/admin/logs", (req: Request, res: Response) => {
  if (!auth(req, res)) return;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
  const offset = (page - 1) * limit;
  const onlyErrors = req.query.type === "error";
  const search = (req.query.search as string) || "";
  const data = getAccessLogs({ limit, offset, onlyErrors, search });
  res.json({ ...data, page, limit });
});

router.get("/admin/tool-logs", (req: Request, res: Response) => {
  if (!auth(req, res)) return;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
  const offset = (page - 1) * limit;
  const tool = (req.query.tool as string) || "all";
  const search = (req.query.search as string) || "";
  const data = getToolLogs({ limit, offset, tool, search });
  res.json({ ...data, page, limit });
});

router.delete("/admin/logs", (req: Request, res: Response) => {
  if (!auth(req, res)) return;
  const type = (req.query.type as string) || "all";
  if (!["access", "tool", "all"].includes(type)) {
    res.status(400).json({ error: "type phải là access | tool | all" });
    return;
  }
  clearLogs(type as "access" | "tool" | "all");
  res.json({ ok: true });
});

router.get("/admin/ai-test", async (req: Request, res: Response) => {
  if (!auth(req, res)) return;

  const ZUKI_BASE = "https://api.zukijourney.com/v1";
  const key1 = process.env.ZUKI_API_KEY_1 ?? "";
  const key2 = process.env.ZUKI_API_KEY_2 ?? "";
  const geminiKey = process.env.GEMINI_API_KEY ?? "";

  const results: Record<string, unknown> = {
    env: {
      ZUKI_API_KEY_1: key1 ? `set (${key1.slice(0, 8)}...)` : "NOT SET",
      ZUKI_API_KEY_2: key2 ? `set (${key2.slice(0, 8)}...)` : "NOT SET",
      GEMINI_API_KEY: geminiKey ? `set (${geminiKey.slice(0, 8)}...)` : "NOT SET",
    },
    zuki: {} as Record<string, unknown>,
  };

  for (const [label, key] of [["key1", key1], ["key2", key2]] as [string, string][]) {
    if (!key) { (results.zuki as Record<string, unknown>)[label] = "NOT SET"; continue; }
    try {
      const r = await fetch(`${ZUKI_BASE}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify({
          model: "gpt-4o-mini",
          stream: false,
          max_tokens: 5,
          temperature: 0,
          messages: [{ role: "user", content: "hi" }],
        }),
      });
      const body = await r.json().catch(() => ({}));
      (results.zuki as Record<string, unknown>)[label] = {
        status: r.status,
        ok: r.ok,
        response: body,
      };
    } catch (e) {
      (results.zuki as Record<string, unknown>)[label] = { error: (e as Error).message };
    }
  }

  res.json(results);
});

export default router;
