import { Router, type IRouter } from "express";
import {
  getSystemState,
  getRecentLogs,
  updateSystemState,
  insertPumpLog,
  getPumpLogs,
  getTodayReport,
  getCommands,
  addCommand,
  updateCommand,
  deleteCommand,
} from "./db.js";
import { pushCommandToEsp32, getEsp32Socket, broadcastManualPumpLog, broadcastWebLock } from "./websocket.js";
import { processTelegramUpdate, sendTelegram, getTelegramWebhookSecret } from "./telegram.js";
import { adminOn, adminOff, isAdminActive } from "./adminControl.js";
import { unlockOn, unlockOff, isUnlockActive } from "./unlockControl.js";
import { setWebControlLock } from "./commandLock.js";
import { logger } from "./lib/logger.js";

const router: IRouter = Router();

// ── Legacy routes (used by Telegram / UptimeRobot) ──────────────────────────
router.get("/status", (_req, res) => {
  try {
    res.json(getSystemState());
  } catch (err) {
    logger.error({ err }, "GET /status error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/logs", (_req, res) => {
  try {
    const logs = getRecentLogs(10);
    res.json(logs);
  } catch (err) {
    logger.error({ err }, "GET /logs error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Dashboard API ─────────────────────────────────────────────────────────────
router.get("/api/status", (_req, res) => {
  try {
    res.json({ ...getSystemState(), admin_active: isAdminActive() });
  } catch (err) {
    logger.error({ err }, "GET /api/status error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/logs", (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    res.json(getRecentLogs(limit));
  } catch (err) {
    logger.error({ err }, "GET /api/logs error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/pump-logs", (_req, res) => {
  try {
    res.json(getPumpLogs());
  } catch (err) {
    logger.error({ err }, "GET /api/pump-logs error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/report", (_req, res) => {
  try {
    res.json(getTodayReport());
  } catch (err) {
    logger.error({ err }, "GET /api/report error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/pump — { action: "ON" | "OFF" }
router.post("/api/pump", (req, res) => {
  try {
    const action = req.body?.action as "ON" | "OFF";
    if (action !== "ON" && action !== "OFF") {
      res.status(400).json({ error: "action must be ON or OFF" });
      return;
    }
    const s = getSystemState();
    if (action === "ON" && s.soil > 30) {
      res.status(400).json({ error: "Độ ẩm đất hiện tại > 30%, không thể bật bơm" });
      return;
    }
    updateSystemState({ pump: action, pump_locked: 0 });
    insertPumpLog({
      action,
      trigger: "manual_web",
      soil_at_start: action === "ON" ? s.soil : null,
      soil_at_end: action === "OFF" ? s.soil : null,
      duration_sec: null,
    });
    pushCommandToEsp32(action);
    broadcastManualPumpLog(action);
    const lockActive = action === "ON";
    setWebControlLock(lockActive);
    broadcastWebLock(lockActive);
    res.json({ ok: true, pump: action });
  } catch (err) {
    logger.error({ err }, "POST /api/pump error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/unlock — { action: "ON" | "OFF" }
router.post("/api/unlock", (req, res) => {
  try {
    const action = req.body?.action as "ON" | "OFF";
    if (action !== "ON" && action !== "OFF") {
      res.status(400).json({ error: "action must be ON or OFF" });
      return;
    }
    if (action === "ON") {
      unlockOn(sendTelegram);
    } else {
      unlockOff();
    }
    const lockActive = action === "ON";
    setWebControlLock(lockActive);
    broadcastWebLock(lockActive);
    res.json({ ok: true, unlock: action, active: isUnlockActive() });
  } catch (err) {
    logger.error({ err }, "POST /api/unlock error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/admin — { action: "ON" | "OFF" }
router.post("/api/admin", (req, res) => {
  try {
    const action = req.body?.action as "ON" | "OFF";
    if (action !== "ON" && action !== "OFF") {
      res.status(400).json({ error: "action must be ON or OFF" });
      return;
    }
    if (action === "ON") {
      adminOn(sendTelegram, () => {
        // Callback khi admin tự tắt sau 25s — reset web lock
        setWebControlLock(false);
        broadcastWebLock(false);
      });
    } else {
      adminOff(sendTelegram);
    }
    const lockActive = action === "ON";
    setWebControlLock(lockActive);
    broadcastWebLock(lockActive);
    res.json({ ok: true, admin: action, active: isAdminActive() });
  } catch (err) {
    logger.error({ err }, "POST /api/admin error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/alert — { enabled: boolean }
router.post("/api/alert", (req, res) => {
  try {
    const enabled = req.body?.enabled;
    updateSystemState({ alert_enabled: enabled ? 1 : 0 });
    res.json({ ok: true, alert_enabled: enabled ? 1 : 0 });
  } catch (err) {
    logger.error({ err }, "POST /api/alert error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/tft — { enabled: boolean }
router.post("/api/tft", (req, res) => {
  try {
    const enabled = req.body?.enabled;
    updateSystemState({ tft_enabled: enabled ? 1 : 0 });
    const sock = getEsp32Socket();
    if (sock && sock.readyState === 1) {
      sock.send(JSON.stringify({ type: "command", tft: enabled ? "ON" : "OFF" }));
    }
    res.json({ ok: true, tft_enabled: enabled ? 1 : 0 });
  } catch (err) {
    logger.error({ err }, "POST /api/tft error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Commands CRUD ──────────────────────────────────────────────────────────────
router.get("/api/commands", (_req, res) => {
  try {
    res.json(getCommands());
  } catch (err) {
    logger.error({ err }, "GET /api/commands error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/commands", (req, res) => {
  try {
    const { name, command, description } = req.body ?? {};
    if (!name || !command) {
      res.status(400).json({ error: "name and command are required" });
      return;
    }
    const result = addCommand({ name, command, description: description ?? "" });
    res.json({ ok: true, id: result.lastInsertRowid });
  } catch (err) {
    logger.error({ err }, "POST /api/commands error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/api/commands/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, command, description } = req.body ?? {};
    if (!name || !command) {
      res.status(400).json({ error: "name and command are required" });
      return;
    }
    const result = updateCommand(id, { name, command, description: description ?? "" });
    if (result.changes === 0) {
      res.status(404).json({ error: "Command not found or is built-in" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "PUT /api/commands error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/api/commands/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    const result = deleteCommand(id);
    if (result.changes === 0) {
      res.status(404).json({ error: "Command not found or is built-in" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "DELETE /api/commands error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Telegram Webhook (production mode) ────────────────────────────────────────
router.post("/telegram-webhook", (req, res) => {
  // Verify webhook secret if configured
  const expectedSecret = getTelegramWebhookSecret();
  if (expectedSecret) {
    const incomingSecret = req.headers["x-telegram-bot-api-secret-token"];
    if (incomingSecret !== expectedSecret) {
      logger.warn("Telegram webhook: invalid secret token — request rejected");
      res.sendStatus(403);
      return;
    }
  }
  try {
    processTelegramUpdate(req.body);
    res.sendStatus(200);
  } catch (err) {
    logger.error({ err }, "POST /telegram-webhook error");
    res.sendStatus(200); // Always return 200 to Telegram to avoid retries
  }
});

export default router;
