import { getSystemState, updateSystemState, insertPumpLog } from "./db.js";
import { pushCommandToEsp32, pushAdminCommandToEsp32 } from "./websocket.js";
import { logger } from "./lib/logger.js";

export const ADMIN_TIMEOUT_MS = 25_000; // 25 seconds

let adminTimer: NodeJS.Timeout | null = null;

// Returns remaining seconds of admin timer, or null if not active
export function getAdminTimeLeft(): number | null {
  if (!adminTimer) return null;
  return null; // timer is opaque — just signal it's active
}

export function isAdminActive(): boolean {
  return adminTimer !== null;
}

// Huỷ admin timer im lặng (không gửi lệnh ESP32) — dùng khi ESP32 vừa reconnect
export function cancelAdminTimerSilent(): void {
  if (adminTimer) {
    clearTimeout(adminTimer);
    adminTimer = null;
    logger.info("Admin timer cancelled silently (ESP32 reconnected)");
  }
}

export function adminOn(
  sendTelegram: (msg: string) => void,
  onAutoOff?: () => void
): void {
  // Cancel any existing timer
  if (adminTimer) {
    clearTimeout(adminTimer);
    adminTimer = null;
  }

  const s = getSystemState();
  updateSystemState({ pump: "ON", pump_locked: 0 });
  insertPumpLog({
    action: "ON",
    trigger: "admin",
    soil_at_start: s.soil,
    soil_at_end: null,
    duration_sec: null,
  });
  pushAdminCommandToEsp32("ON");

  logger.info("Admin mode ON — pump forced on, auto-off in 25s");

  adminTimer = setTimeout(() => {
    const cur = getSystemState();
    updateSystemState({ pump: "OFF" });
    insertPumpLog({
      action: "OFF",
      trigger: "admin_auto",
      soil_at_start: null,
      soil_at_end: cur.soil,
      duration_sec: 25,
    });
    pushAdminCommandToEsp32("OFF");
    adminTimer = null;
    logger.info("Admin mode auto-off after 25s");
    // Reset web lock khi admin tự tắt — fix bug web lock bị kẹt vĩnh viễn
    onAutoOff?.();
    sendTelegram(
      `⏱️ Chủ nhân ơi, đã hết <b>25 giây</b> Admin mode rồi ạ!\nMình đã tự động tắt máy bơm để tránh quá tưới, chủ nhân yên tâm nha 💚`
    );
  }, ADMIN_TIMEOUT_MS);
}

export function adminOff(sendTelegram: (msg: string) => void): void {
  if (adminTimer) {
    clearTimeout(adminTimer);
    adminTimer = null;
    logger.info("Admin mode cancelled by user");
  }

  const s = getSystemState();
  updateSystemState({ pump: "OFF" });
  insertPumpLog({
    action: "OFF",
    trigger: "admin_manual",
    soil_at_start: null,
    soil_at_end: s.soil,
    duration_sec: null,
  });
  pushAdminCommandToEsp32("OFF");
}
