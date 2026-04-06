import { Router } from "express";
import {
  getSystemState,
  updateSystemState,
  insertSensorLog,
  getRecentLogs,
} from "../db.js";
import { getBot } from "../telegram.js";
import { logger } from "../lib/logger.js";

const router = Router();

// POST /sensor-data — ESP32 posts sensor readings
router.post("/sensor-data", (req, res) => {
  try {
    const { soil, water, temp, hum, fire, rain } = req.body;

    if (
      soil === undefined ||
      water === undefined ||
      temp === undefined ||
      hum === undefined ||
      fire === undefined ||
      rain === undefined
    ) {
      res.status(400).json({ ok: false, error: "Missing fields" });
      return;
    }

    const soilNum = Number(soil);
    const waterNum = Number(water);
    const tempNum = Number(temp);
    const humNum = Number(hum);
    const fireNum = Number(fire);
    const rainNum = Number(rain);

    const state = getSystemState();
    const nowUtc = new Date().toISOString().replace("T", " ").slice(0, 19);

    const stateUpdate: any = {
      soil: soilNum,
      water: waterNum,
      temp: tempNum,
      hum: humNum,
      fire: fireNum,
      rain: rainNum,
      last_seen: nowUtc,
    };

    // Auto pump logic
    if (soilNum >= 70) {
      stateUpdate.pump = "OFF";
      stateUpdate.pump_locked = 1;
    } else if (soilNum <= 30 && soilNum > 0 && !state.pump_locked) {
      stateUpdate.pump = "ON";
    }

    updateSystemState(stateUpdate);
    insertSensorLog({ soil: soilNum, water: waterNum, temp: tempNum, hum: humNum, fire: fireNum, rain: rainNum });

    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "POST /sensor-data error");
    res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// GET /device-command — ESP32 polls for pump command
router.get("/device-command", (_req, res) => {
  try {
    const state = getSystemState();
    res.json({ pump: state.pump });
  } catch (err) {
    logger.error({ err }, "GET /device-command error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /notify — ESP32 sends a notification message
router.post("/notify", (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== "string") {
      res.status(400).json({ ok: false, error: "Missing message" });
      return;
    }

    const state = getSystemState();
    if (state.alert_enabled) {
      const bot = getBot();
      const chatId = process.env["TELEGRAM_CHAT_ID"];
      if (bot && chatId) {
        bot
          .sendMessage(chatId, `🔔 <b>ESP32 thông báo:</b>\n${message}`, {
            parse_mode: "HTML",
          })
          .catch((err) => logger.error({ err }, "Notify telegram error"));
      }
    }

    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "POST /notify error");
    res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// GET /status — Full system state (also used for keepalive pings)
router.get("/status", (_req, res) => {
  try {
    const state = getSystemState();
    res.json(state);
  } catch (err) {
    logger.error({ err }, "GET /status error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /logs — Last 10 sensor log entries
router.get("/logs", (_req, res) => {
  try {
    const logs = getRecentLogs(10);
    res.json(logs);
  } catch (err) {
    logger.error({ err }, "GET /logs error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
