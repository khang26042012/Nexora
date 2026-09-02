import { Router, type Request, type Response } from "express";
import crypto from "node:crypto";
import { createSession, verifySession, revokeSession } from "../lib/server-admin-auth";

const router = Router();

const ADMIN_PASSWORD = process.env["ADMIN_PASSWORD"] || "26042012khang";
const SESSION_HEADER = "x-admin-token";

// SHA-256 hash helper
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
    // Delay nhỏ để chống brute force
    setTimeout(() => res.status(401).json({ error: "Sai mật khẩu" }), 500);
    return;
  }
  const session = createSession();
  res.json({
    ok: true,
    token: session.token,
    expiresAt: session.expiresAt,
  });
});

// ── POST /api/server-admin/logout ──
router.post("/server-admin/logout", (req: Request, res: Response) => {
  const token = req.headers[SESSION_HEADER] as string | undefined;
  revokeSession(token);
  res.json({ ok: true });
});

// ── GET /api/server-admin/check — check session còn hạn ──
router.get("/server-admin/check", (req: Request, res: Response) => {
  const token = req.headers[SESSION_HEADER] as string | undefined;
  res.json({ ok: verifySession(token) });
});

// ── Plugin proxy config ──
const PLUGIN_URL = process.env["RCONKHANG_URL"] || "http://127.0.0.1:8765";
const PLUGIN_KEY = process.env["RCONKHANG_KEY"] || "";

async function proxyToPlugin(path: string, init: RequestInit = {}): Promise<Response> {
  const url = `${PLUGIN_URL.replace(/\/$/, "")}${path}`;
  return fetch(url, {
    ...init,
    headers: {
      ...init.headers,
      "Authorization": `Bearer ${PLUGIN_KEY}`,
    },
  });
}

function handleProxyError(res: Response, err: any) {
  console.error("[server-admin] proxy error:", err?.message || err);
  if (!res.headersSent) {
    res.status(502).json({ error: "Plugin không khả dụng — kiểm tra server Minecraft có bật không", detail: err?.message });
  }
}

// ── GET /api/server-admin/plugin/players — proxy → plugin /players ──
router.get("/server-admin/plugin/players", async (req: Request, res: Response) => {
  if (!checkAdminAuth(req, res)) return;
  if (!PLUGIN_KEY) {
    res.status(503).json({ error: "Plugin API key chưa cấu hình (RCONKHANG_KEY)" });
    return;
  }
  try {
    const r = await proxyToPlugin("/players");
    const text = await r.text();
    res.status(r.status).type("application/json").send(text);
  } catch (err) {
    handleProxyError(res, err);
  }
});

// ── GET /api/server-admin/plugin/bans — list bans ──
router.get("/server-admin/plugin/bans", async (req: Request, res: Response) => {
  if (!checkAdminAuth(req, res)) return;
  if (!PLUGIN_KEY) {
    res.status(503).json({ error: "Plugin API key chưa cấu hình" });
    return;
  }
  try {
    const r = await proxyToPlugin("/bans");
    const text = await r.text();
    res.status(r.status).type("application/json").send(text);
  } catch (err) {
    handleProxyError(res, err);
  }
});

// ── GET /api/server-admin/plugin/log — action log ──
router.get("/server-admin/plugin/log", async (req: Request, res: Response) => {
  if (!checkAdminAuth(req, res)) return;
  if (!PLUGIN_KEY) {
    res.status(503).json({ error: "Plugin API key chưa cấu hình" });
    return;
  }
  try {
    const r = await proxyToPlugin("/log");
    const text = await r.text();
    res.status(r.status).type("application/json").send(text);
  } catch (err) {
    handleProxyError(res, err);
  }
});

// ── Generic POST proxy: /api/server-admin/plugin/<action> ──
// Action: ban, unban, kick, clear-effects, whisper, teleport, ban-ip, unban-ip
const PROXY_ACTIONS = new Set([
  "ban", "unban", "kick", "clear-effects", "whisper", "teleport", "ban-ip", "unban-ip"
]);

router.post("/server-admin/plugin/:action", async (req: Request, res: Response) => {
  if (!checkAdminAuth(req, res)) return;
  if (!PLUGIN_KEY) {
    res.status(503).json({ error: "Plugin API key chưa cấu hình" });
    return;
  }
  const action = req.params.action;
  if (!PROXY_ACTIONS.has(action)) {
    res.status(400).json({ error: `Action không hợp lệ: ${action}` });
    return;
  }
  try {
    const r = await proxyToPlugin(`/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body || {}),
    });
    const text = await r.text();
    res.status(r.status).type("application/json").send(text);
  } catch (err) {
    handleProxyError(res, err);
  }
});

// ── GET /api/server-admin/plugin/download — proxy download jar từ GitHub Releases ──
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
  } catch (err) {
    handleProxyError(res, err);
  }
});

export default router;
