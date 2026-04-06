import TelegramBot from "node-telegram-bot-api";
import axios from "axios";
import {
  getSystemState,
  updateSystemState,
  getRecentLogs,
  getPumpLogs,
  getTodayReport,
  clearAllLogs,
  insertPumpLog,
} from "./db.js";
import { askGemini } from "./gemini.js";
import { pushCommandToEsp32, getEsp32Socket } from "./websocket.js";
import { adminOn, adminOff, isAdminActive } from "./adminControl.js";
import { unlockOn, unlockOff } from "./unlockControl.js";
import { isWebControlLocked } from "./commandLock.js";
import { logger } from "./lib/logger.js";

const WEB_LOCK_MSG = "⚠️ Có người đang sử dụng lệnh, chủ nhân chờ một xíu nha~";

function getWeatherUrl(): string {
  const key = process.env["WEATHER_API_KEY"] ?? "";
  return `http://api.weatherapi.com/v1/forecast.json?key=${key}&q=10.2537,105.9722&days=1&aqi=no&alerts=no`;
}

let bot: TelegramBot | null = null;
let chatId: string | null = null;

/** Returns the webhook secret for header verification, if configured. */
export function getTelegramWebhookSecret(): string | undefined {
  return process.env["TELEGRAM_WEBHOOK_SECRET"];
}

/**
 * Returns true if the message's chat ID is the authorized one.
 * If TELEGRAM_CHAT_ID is not set, allows all chats (backward compat).
 */
function isAuthorized(id: number): boolean {
  const allowed = process.env["TELEGRAM_CHAT_ID"];
  if (!allowed) return true;
  return String(id) === allowed;
}

export function sendTelegram(message: string) {
  // Prefer the immutable env var; fall back to dynamically discovered chatId
  const target = process.env["TELEGRAM_CHAT_ID"] ?? chatId;
  if (!bot || !target) return;
  bot
    .sendMessage(target, message, { parse_mode: "HTML" })
    .catch((err) => logger.error({ err }, "Telegram sendMessage failed"));
}

export function processTelegramUpdate(update: any) {
  if (!bot) return;
  try {
    bot.processUpdate(update);
  } catch (err) {
    logger.error({ err }, "Error processing Telegram update");
  }
}

function formatVNTime(dateStr: string | null): string {
  if (!dateStr) return "Chưa có";
  const date = new Date(dateStr + "Z"); // treat stored UTC as UTC
  const vn = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return vn.toISOString().replace("T", " ").slice(0, 19) + " (UTC+7)";
}

function isOffline(lastSeen: string | null): boolean {
  if (!lastSeen) return true;
  const diff = (Date.now() - new Date(lastSeen + "Z").getTime()) / 1000;
  return diff > 60;
}

export async function initTelegramBot() {
  const token = process.env["TELEGRAM_TOKEN"];
  if (!token) {
    logger.warn("TELEGRAM_TOKEN not set, Telegram bot disabled");
    return;
  }

  // Use webhook mode in production, polling in development
  const isProduction = process.env["NODE_ENV"] === "production";
  // Base URL of the api-server deployment, e.g. "https://nexorax-api.onrender.com"
  const serverBaseUrl = process.env["TELEGRAM_WEBHOOK_URL"];
  const webhookSecret = process.env["TELEGRAM_WEBHOOK_SECRET"];

  if (isProduction && serverBaseUrl) {
    // Webhook mode — no polling, no network conflicts, safe for Render
    bot = new TelegramBot(token, { polling: false });

    // Path is always /NexoraGarden/telegram-webhook — matches router mount point
    const fullWebhookUrl = `${serverBaseUrl}/NexoraGarden/telegram-webhook`;
    try {
      await bot.setWebHook(fullWebhookUrl, webhookSecret ? { secret_token: webhookSecret } : undefined);
      logger.info({ fullWebhookUrl }, "Telegram bot started (webhook mode)");
    } catch (err) {
      logger.error({ err }, "Failed to set Telegram webhook");
    }
  } else {
    // Polling mode — delete any existing webhook first to avoid conflicts
    // (If a webhook was previously registered, polling will never receive updates)
    bot = new TelegramBot(token, { polling: false });
    try {
      await bot.deleteWebHook();
      logger.info("Telegram: cleared existing webhook before starting polling");
    } catch (err) {
      logger.warn({ err }, "Telegram: failed to clear webhook (non-fatal)");
    }

    // Re-create bot with polling enabled after webhook is cleared
    bot = new TelegramBot(token, {
      polling: {
        interval: 1000,
        autoStart: true,
        params: { timeout: 10 },
      },
    });

    bot.on("polling_error", (err: any) => {
      // 409 Conflict = still has a webhook; 404 = token invalid
      const code = err?.response?.body?.error_code;
      if (code === 409) {
        logger.error({ err }, "Telegram polling conflict: webhook still active. Set TELEGRAM_WEBHOOK_URL or call deleteWebhook manually.");
      } else {
        logger.error({ err }, "Telegram polling error");
      }
    });

    logger.info("Telegram bot started (polling mode)");
  }

  bot.onText(/\/start/, (msg) => {
    const id = msg.chat.id;
    const configuredId = process.env["TELEGRAM_CHAT_ID"];

    if (configuredId && String(id) !== configuredId) {
      // Bot is configured for a specific owner — reject unauthorized users silently
      logger.warn({ chatId: id }, "Unauthorized /start attempt rejected");
      return;
    }

    // Update local reply target (only for notification routing; never overrides env auth)
    chatId = String(id);
    bot!.sendMessage(
      id,
      `🌷 Chào chủ nhân đến với NexoraGarden!\nMình luôn sẵn sàng hỗ trợ chủ nhân nè 💚\nGõ /help để xem danh sách lệnh nhé!`,
      { parse_mode: "HTML" }
    );
  });

  bot.onText(/\/help/, (msg) => {
    bot!.sendMessage(
      msg.chat.id,
      `📖 Đây là danh sách toàn bộ lệnh của NexoraGarden nè chủ nhân ơi~\n\n` +
        `/status — Trạng thái hệ thống\n` +
        `/weather — Thời tiết tại vị trí\n` +
        `/logs — 10 bản ghi cảm biến gần nhất\n` +
        `/report — Báo cáo hôm nay\n` +
        `/history — Lịch sử bơm\n` +
        `/pump_on — Bật máy bơm\n` +
        `/pump_off — Tắt máy bơm\n` +
        `/unlock_on — Mở khóa bơm tự động (tự tắt sau 500s)\n` +
        `/unlock_off — Tắt mở khóa bơm tự động\n` +
        `/admin_on — Bật bơm Admin (bỏ qua kiểm tra độ ẩm, tự tắt sau 25s)\n` +
        `/admin_off — Tắt bơm Admin ngay lập tức\n` +
        `/alert_on — Bật cảnh báo\n` +
        `/alert_off — Tắt cảnh báo\n` +
        `/clear — Xóa toàn bộ dữ liệu log\n` +
        `/help — Xem lệnh này\n\n` +
        `💬 Gửi câu hỏi bất kỳ để hỏi NexoraAI nhé!`,
      { parse_mode: "HTML" }
    );
  });

  bot.onText(/\/status/, (msg) => {
    const id = msg.chat.id;
    chatId = String(id);
    const s = getSystemState();
    const offline = isOffline(s.last_seen);
    const offlineWarn = offline
      ? "\n⚠️ <b>Chủ nhân ơi, ESP32 đang mất kết nối rồi!</b>"
      : "";
    bot!.sendMessage(
      id,
      `✨ <b>Trạng thái hiện tại của vườn:</b>${offlineWarn}\n\n` +
        `🌱 Độ ẩm đất: <b>${s.soil}%</b>\n` +
        `💧 Mức nước: <b>${s.water}%</b>\n` +
        `🌡️ Nhiệt độ: <b>${s.temp}°C</b>\n` +
        `💨 Độ ẩm KK: <b>${s.hum}%</b>\n` +
        `🔥 Lửa: <b>${s.fire ? "CÓ ⚠️" : "Không"}</b>\n` +
        `🌧️ Mưa: <b>${s.rain ? "Có" : "Không"}</b>\n` +
        `⚙️ Máy bơm: <b>${s.pump}</b>\n` +
        `🔒 Khóa bơm: <b>${s.pump_locked ? "Có" : "Không"}</b>\n` +
        `🔔 Cảnh báo: <b>${s.alert_enabled ? "Bật" : "Tắt"}</b>\n` +
        `⏰ Lần cuối thấy: <b>${formatVNTime(s.last_seen)}</b>`,
      { parse_mode: "HTML" }
    );
  });

  bot.onText(/\/weather/, async (msg) => {
    const id = msg.chat.id;
    try {
      const res = await axios.get(getWeatherUrl());
      const d = res.data;
      const cur = d.current;
      const fore = d.forecast?.forecastday?.[0]?.day;
      bot!.sendMessage(
        id,
        `🌤️ <b>Thời tiết tại Vĩnh Hòa hôm nay nè chủ nhân:</b>\n\n` +
          `📍 ${d.location?.name}, ${d.location?.region}\n` +
          `🌡️ Nhiệt độ: <b>${cur.temp_c}°C</b> (cảm giác ${cur.feelslike_c}°C)\n` +
          `💧 Độ ẩm: <b>${cur.humidity}%</b>\n` +
          `🌬️ Gió: <b>${cur.wind_kph} km/h</b>\n` +
          `☁️ Điều kiện: <b>${cur.condition?.text}</b>\n` +
          `🌧️ Mưa hôm nay: <b>${fore?.totalprecip_mm ?? 0} mm</b>\n` +
          `🌡️ Cao/thấp: <b>${fore?.maxtemp_c ?? "-"}°C / ${fore?.mintemp_c ?? "-"}°C</b>`,
        { parse_mode: "HTML" }
      );
    } catch (err: any) {
      bot!.sendMessage(
        id,
        `❌ Chủ nhân ơi, mình không lấy được thời tiết rồi: ${err?.message}`
      );
    }
  });

  bot.onText(/\/logs/, (msg) => {
    const id = msg.chat.id;
    const logs = getRecentLogs(10) as any[];
    if (!logs.length) {
      bot!.sendMessage(id, "📭 Chủ nhân ơi, chưa có dữ liệu log nào cả.");
      return;
    }
    const lines = logs.map(
      (l, i) =>
        `${i + 1}. <code>${formatVNTime(l.timestamp)}</code>\n` +
        `   🌱${l.soil}% 💧${l.water}% 🌡️${l.temp}°C 💨${l.hum}% 🔥${l.fire} 🌧️${l.rain}`
    );
    bot!.sendMessage(
      id,
      `📒 <b>Đây là 10 bản ghi cảm biến gần nhất nè chủ nhân:</b>\n\n${lines.join("\n\n")}`,
      { parse_mode: "HTML" }
    );
  });

  bot.onText(/\/report/, (msg) => {
    const id = msg.chat.id;
    const r = getTodayReport() as any;
    bot!.sendMessage(
      id,
      `📝 <b>Báo cáo hôm nay của khu vườn:</b>\n\n` +
        `🌡️ Nhiệt độ TB: <b>${r.avg_temp ?? "N/A"}°C</b>\n` +
        `💨 Độ ẩm TB: <b>${r.avg_hum ?? "N/A"}%</b>\n` +
        `📡 Tổng bản ghi: <b>${r.total_readings ?? 0}</b>\n` +
        `⚙️ Máy bơm: <b>${r.pump_activations ?? 0} lần</b>\n` +
        `🔥 Lửa: <b>${r.fire_events ?? 0} sự kiện</b>\n` +
        `🌧️ Mưa: <b>${r.rain_events ?? 0} sự kiện</b>`,
      { parse_mode: "HTML" }
    );
  });

  bot.onText(/\/history/, (msg) => {
    const id = msg.chat.id;
    const logs = getPumpLogs() as any[];
    if (!logs.length) {
      bot!.sendMessage(id, "📭 Chủ nhân ơi, chưa có lịch sử bơm nào cả.");
      return;
    }
    const lines = logs.slice(0, 20).map(
      (l, i) =>
        `${i + 1}. [${l.action}] <code>${formatVNTime(l.timestamp)}</code>\n` +
        `   Trigger: ${l.trigger} | Đất: ${l.soil_at_start ?? "?"}% → ${l.soil_at_end ?? "?"}% | ${l.duration_sec ?? "?"}s`
    );
    bot!.sendMessage(
      id,
      `🕒 <b>Đây là lịch sử 20 lần bơm gần nhất nè chủ nhân:</b>\n\n${lines.join("\n\n")}`,
      { parse_mode: "HTML" }
    );
  });

  bot.onText(/\/pump_on/, (msg) => {
      const id = msg.chat.id;
      if (!isAuthorized(id)) return;
      if (isWebControlLocked()) {
        bot!.sendMessage(id, WEB_LOCK_MSG, { parse_mode: "HTML" });
        return;
      }
      const s = getSystemState();
      const esp32 = getEsp32Socket();
      if (!esp32 || esp32.readyState !== 1) {
        bot!.sendMessage(
          id,
          `⚠️ Chủ nhân ơi, ESP32 đang offline rồi ạ!\nLệnh không thể gửi đến thiết bị. Kiểm tra nguồn điện và WiFi nhé!`,
          { parse_mode: "HTML" }
        );
        return;
      }
      updateSystemState({ pump: "ON", pump_locked: 0 });
      insertPumpLog({
        action: "ON",
        trigger: "manual",
        soil_at_start: s.soil,
        soil_at_end: null,
        duration_sec: null,
      });
      pushCommandToEsp32("ON");
      const soilWarn = s.soil > 30 ? `\n⚠️ Lưu ý: Đất đang ở <b>${s.soil}%</b> — hãy tắt bơm đúng lúc nhé!` : ``;
      bot!.sendMessage(
        id,
        `✅ Chủ nhân ơi, mình đã bật máy bơm (thủ công) rồi ạ!${soilWarn}`,
        { parse_mode: "HTML" }
      );
    });

  bot.onText(/\/pump_off/, (msg) => {
      const id = msg.chat.id;
      if (!isAuthorized(id)) return;
      if (isWebControlLocked()) {
        bot!.sendMessage(id, WEB_LOCK_MSG, { parse_mode: "HTML" });
        return;
      }
      const s = getSystemState();
      const esp32Off = getEsp32Socket();
      if (!esp32Off || esp32Off.readyState !== 1) {
        bot!.sendMessage(
          id,
          `⚠️ Chủ nhân ơi, ESP32 đang offline rồi ạ!\nLệnh không thể gửi đến thiết bị.`,
          { parse_mode: "HTML" }
        );
        return;
      }
      updateSystemState({ pump: "OFF", pump_locked: 0 });
      insertPumpLog({
        action: "OFF",
        trigger: "manual",
        soil_at_start: null,
        soil_at_end: s.soil,
        duration_sec: null,
      });
      pushCommandToEsp32("OFF");
      bot!.sendMessage(
        id,
        `✅ Chủ nhân ơi, mình đã tắt máy bơm và mở khóa rồi ạ!`,
        { parse_mode: "HTML" }
      );
    });

  bot.onText(/\/unlock_on/, (msg) => {
    const id = msg.chat.id;
    if (!isAuthorized(id)) return;
    if (isWebControlLocked()) {
      bot!.sendMessage(id, WEB_LOCK_MSG, { parse_mode: "HTML" });
      return;
    }
    unlockOn(sendTelegram);
    bot!.sendMessage(
      id,
      `✅ Chủ nhân ơi, mình đã gửi lệnh mở khóa (unlock ON) về ESP32 rồi ạ!\n⏳ Lệnh sẽ tự động tắt sau <b>500 giây</b> để tránh bơm tự bật nhé!`,
      { parse_mode: "HTML" }
    );
  });

  bot.onText(/\/unlock_off/, (msg) => {
    const id = msg.chat.id;
    if (!isAuthorized(id)) return;
    if (isWebControlLocked()) {
      bot!.sendMessage(id, WEB_LOCK_MSG, { parse_mode: "HTML" });
      return;
    }
    unlockOff();
    bot!.sendMessage(
      id,
      `✅ Chủ nhân ơi, mình đã gửi lệnh tắt mở khóa (unlock OFF) về ESP32 rồi ạ!`,
      { parse_mode: "HTML" }
    );
  });

  bot.onText(/\/admin_on/, (msg) => {
    const id = msg.chat.id;
    if (!isAuthorized(id)) return;
    if (isWebControlLocked()) {
      bot!.sendMessage(id, WEB_LOCK_MSG, { parse_mode: "HTML" });
      return;
    }
    const active = isAdminActive();
    adminOn(sendTelegram);
    bot!.sendMessage(
      id,
      `🔓 Chủ nhân ơi, mình đã bật <b>Admin Mode</b> rồi ạ!\n` +
        `⚙️ Máy bơm đã được BẬT ngay (bỏ qua kiểm tra độ ẩm).\n` +
        `⏳ Sẽ tự động TẮT sau <b>25 giây</b> nếu chủ nhân không tắt trước nhé!` +
        (active ? `\n\n♻️ Đã reset lại bộ đếm 25s từ đầu.` : ``),
      { parse_mode: "HTML" }
    );
  });

  bot.onText(/\/admin_off/, (msg) => {
    const id = msg.chat.id;
    if (!isAuthorized(id)) return;
    if (isWebControlLocked()) {
      bot!.sendMessage(id, WEB_LOCK_MSG, { parse_mode: "HTML" });
      return;
    }
    const wasActive = isAdminActive();
    adminOff(sendTelegram);
    bot!.sendMessage(
      id,
      wasActive
        ? `✅ Chủ nhân ơi, mình đã tắt <b>Admin Mode</b> và TẮT máy bơm rồi ạ!`
        : `✅ Chủ nhân ơi, mình đã tắt máy bơm rồi ạ! (Admin mode không đang chạy)`,
      { parse_mode: "HTML" }
    );
  });

  bot.onText(/\/alert_on/, (msg) => {
    if (!isAuthorized(msg.chat.id)) return;
    updateSystemState({ alert_enabled: 1 });
    bot!.sendMessage(
      msg.chat.id,
      `🔔 Chủ nhân ơi, mình đã bật cảnh báo rồi ạ!`,
      { parse_mode: "HTML" }
    );
  });

  bot.onText(/\/alert_off/, (msg) => {
    if (!isAuthorized(msg.chat.id)) return;
    updateSystemState({ alert_enabled: 0 });
    bot!.sendMessage(
      msg.chat.id,
      `🔕 Chủ nhân ơi, mình đã tắt cảnh báo rồi ạ!`,
      { parse_mode: "HTML" }
    );
  });

  bot.onText(/\/clear/, (msg) => {
    if (!isAuthorized(msg.chat.id)) return;
    clearAllLogs();
    bot!.sendMessage(
      msg.chat.id,
      `🧹 Chủ nhân ơi, mình đã xóa toàn bộ sensor_logs và pump_logs rồi ạ!`
    );
  });

  // Catch-all: forward to Gemini AI
  bot.on("message", async (msg) => {
    if (!msg.text || msg.text.startsWith("/")) return;
    const id = msg.chat.id;
    chatId = String(id);
    try {
      await bot!.sendChatAction(id, "typing");
      const reply = await askGemini(msg.text);
      bot!.sendMessage(id, reply, { parse_mode: "HTML" });
    } catch (err: any) {
      bot!.sendMessage(
        id,
        `❌ Chủ nhân ơi, AI đang gặp lỗi: ${err?.message}`
      );
    }
  });
}
