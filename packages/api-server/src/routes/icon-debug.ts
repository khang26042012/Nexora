import { Router, type Request, type Response } from "express";
import { logger } from "../lib/logger.js";

const router = Router();

router.post("/icon-debug", (req: Request, res: Response) => {
  const { totalItems, loadedOk, failedCount, failedIds, errors } = req.body;

  // Structured log with [ICON-DEBUG] prefix for easy Railway Logs filtering
  logger.info(
    {
      totalItems,
      loadedOk,
      failedCount,
      failedIds: failedIds?.slice(0, 50), // cap to avoid huge log lines
      errorCount: errors?.length ?? 0,
    },
    "[ICON-DEBUG] Tổng số item quét: %d | Load OK: %d | Fallback: %d",
    totalItems ?? 0,
    loadedOk ?? 0,
    failedCount ?? 0,
  );

  // Log each failed ID with frequency (top 30)
  if (Array.isArray(failedIds) && failedIds.length > 0) {
    const freq = new Map<string, number>();
    for (const id of failedIds) freq.set(id, (freq.get(id) ?? 0) + 1);
    const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
    for (const [id, count] of sorted) {
      logger.info("[ICON-DEBUG]   - %s (%d lần) → https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@1.20.4/assets/minecraft/textures/item/%s.png", id, count, id.replace("minecraft:", ""));
    }
  }

  // Log errors separately
  if (Array.isArray(errors) && errors.length > 0) {
    for (const err of errors.slice(0, 10)) {
      logger.error("[ERROR] %s | Vị trí: %s | Chi tiết: %s", err.message ?? "Unknown", err.location ?? "unknown", err.detail ?? "");
    }
  }

  res.json({ ok: true });
});

export default router;
