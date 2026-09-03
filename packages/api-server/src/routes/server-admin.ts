import { Router, type Request, type Response } from "express";
import crypto from "node:crypto";
import { createSession, verifySession, revokeSession } from "../lib/server-admin-auth";
import {
  isHubConnected,
  getHubState,
  getCachedPlayers,
  getCachedBans,
  getCachedLog,
  requestPlugin,
} from "../lib/ws-hub";

const router = Router();

const ADMIN_PASSWORD = process.env["ADMIN_PASSWORD"] || "26042012khang";
const SESSION_HEADER = "x-admin-token";

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function checkAdminAuth(req: Request, res: Response): boolean {
  const token = req.headers[SESSION_HEADER] as string | undefined;
  if (!verifySession(token)) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

// ── POST /api/server-admin/login ──
router.post("/server-admin/login", (req: Request, res: Response) => {
  const { password } = (req.body || {}) as { password?: string };
  if (!password || sha256(password) !== sha256(ADMIN_PASSWORD)) {
    setTimeout(() => res.status(401).json({ error: "Sai mật khẩu" }), 500);
    return;
  }
  const session = createSession();
  res.json({ ok: true, token: session.token, expiresAt: session.expiresAt });
});

// ── POST /api/server-admin/logout ──
router.post("/server-admin/logout", (req: Request, res: Response) => {
  const token = req.headers[SESSION_HEADER] as string | undefined;
  revokeSession(token);
  res.json({ ok: true });
});

// ── GET /api/server-admin/check ──
router.get("/server-admin/check", (req: Request, res: Response) => {
  const token = req.headers[SESSION_HEADER] as string | undefined;
  res.json({ ok: verifySession(token), pluginConnected: isHubConnected(), hub: getHubState() });
});

// ── GET /api/server-admin/plugin/status — connection status ──
router.get("/server-admin/plugin/status", (req: Request, res: Response) => {
  if (!checkAdminAuth(req, res)) return;
  res.json({ connected: isHubConnected(), hub: getHubState() });
});

// ── GET /api/server-admin/plugin/players — cached snapshot from plugin ──
router.get("/server-admin/plugin/players", (req: Request, res: Response) => {
  if (!checkAdminAuth(req, res)) return;
  if (!isHubConnected()) {
    res.status(502).json({ error: "Plugin chưa kết nối WebSocket" });
    return;
  }
  // Try to ask plugin for fresh snapshot, fall back to cache.
  // Plugin trả { players: [...] }; unwrap để FE nhận flat array.
  requestPlugin("list-players")
    .then((result) => {
      const list = result && Array.isArray(result.players) ? result.players : (Array.isArray(result) ? result : []);
      res.json({ players: list, source: "live" });
    })
    .catch(() => {
      const cached = getCachedPlayers();
      if (cached) res.json({ players: cached, source: "cache" });
      else res.status(502).json({ error: "Plugin không phản hồi" });
    });
});

// ── GET /api/server-admin/plugin/bans ──
router.get("/server-admin/plugin/bans", (req: Request, res: Response) => {
  if (!checkAdminAuth(req, res)) return;
  if (!isHubConnected()) {
    res.status(502).json({ error: "Plugin chưa kết nối WebSocket" });
    return;
  }
  requestPlugin("list-bans")
    .then((result) => res.json(result))
    .catch(() => {
      const cached = getCachedBans();
      if (cached) res.json({ bans: cached, ipBans: getHubState()?.players?.length ? undefined : [] });
      else res.status(502).json({ error: "Plugin không phản hồi" });
    });
});

// ── GET /api/server-admin/plugin/log ──
router.get("/server-admin/plugin/log", (req: Request, res: Response) => {
  if (!checkAdminAuth(req, res)) return;
  if (!isHubConnected()) {
    res.status(502).json({ error: "Plugin chưa kết nối WebSocket" });
    return;
  }
  const cached = getCachedLog();
  if (cached) res.json({ log: cached });
  else res.status(502).json({ error: "Chưa có log" });
});

// ── Generic POST action: /api/server-admin/plugin/<action> ──
const PROXY_ACTIONS = new Set([
  "ban", "unban", "kick", "clear-effects", "whisper", "teleport", "ban-ip", "unban-ip"
]);

router.post("/server-admin/plugin/:action", async (req: Request, res: Response) => {
  if (!checkAdminAuth(req, res)) return;
  if (!isHubConnected()) {
    res.status(502).json({ error: "Plugin chưa kết nối WebSocket" });
    return;
  }
  const action = req.params.action;
  if (!PROXY_ACTIONS.has(action)) {
    res.status(400).json({ error: `Action không hợp lệ: ${action}` });
    return;
  }
  try {
    const result = await requestPlugin(action, req.body || {});
    res.json({ ok: true, result });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Plugin error" });
  }
});

// ── GET /api/server-admin/plugin/download — latest jar từ GitHub Releases ──
router.get("/server-admin/plugin/download", async (req: Request, res: Response) => {
  if (!checkAdminAuth(req, res)) return;
  const repo = "khang26042012/Nexora";
  try {
    const r = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: { "User-Agent": "nexora-server-admin" }
    });
    if (!r.ok) {
      res.status(502).json({ error: "Không lấy được thông tin release", status: r.status });
      return;
    }
    const release = await r.json() as any;
    const jar = release.assets?.find((a: any) => a.name?.endsWith(".jar"));
    if (!jar) {
      res.status(404).json({ error: "Chưa có plugin .jar trong release" });
      return;
    }
    res.json({
      version: release.tag_name,
      jarName: jar.name,
      downloadUrl: jar.browser_download_url,
      size: jar.size,
      publishedAt: jar.created_at,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "GitHub error" });
  }
});

export default router;