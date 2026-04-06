import { updateSystemState } from "./db.js";
import { pushUnlockCommandToEsp32 } from "./websocket.js";
import { logger } from "./lib/logger.js";

export const UNLOCK_TIMEOUT_MS = 500_000; // 500 seconds

let unlockTimer: NodeJS.Timeout | null = null;

export function isUnlockActive(): boolean {
  return unlockTimer !== null;
}

export function unlockOn(sendTelegram: (msg: string) => void): void {
  if (unlockTimer) {
    clearTimeout(unlockTimer);
    unlockTimer = null;
  }

  updateSystemState({ pump_locked: 0 });
  pushUnlockCommandToEsp32("ON");
  logger.info("Unlock ON — pump auto-start allowed, auto-reset in 500s");

  unlockTimer = setTimeout(() => {
    updateSystemState({ pump_locked: 1 });
    pushUnlockCommandToEsp32("OFF");
    unlockTimer = null;
    logger.info("Unlock auto-reset to OFF after 500s");
    sendTelegram(
      `🔒 Chủ nhân ơi, đã hết <b>500 giây</b> mở khóa!\nMình đã tự động khóa lại bơm tự động để tránh bơm tự bật ạ.`
    );
  }, UNLOCK_TIMEOUT_MS);
}

export function unlockOff(sendTelegram?: (msg: string) => void): void {
  if (unlockTimer) {
    clearTimeout(unlockTimer);
    unlockTimer = null;
    logger.info("Unlock timer cancelled");
  }

  updateSystemState({ pump_locked: 1 });
  pushUnlockCommandToEsp32("OFF");
  logger.info("Unlock OFF — pump auto-start locked");
}
