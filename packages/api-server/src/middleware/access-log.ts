import type { Request, Response, NextFunction } from "express";
import { insertAccessLog } from "../lib/admin-db.js";

export function accessLogMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on("finish", () => {
    const skip =
      req.path.startsWith("/api/admin") ||
      req.path === "/api/health" ||
      req.method === "OPTIONS";
    if (skip) return;

    insertAccessLog({
      ip: (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim()
        ?? req.ip
        ?? "unknown",
      method: req.method,
      path: req.path.split("?")[0],
      status: res.statusCode,
      duration_ms: Date.now() - start,
      user_agent: req.headers["user-agent"] ?? "",
      referer: req.headers["referer"] ?? "",
    });
  });

  next();
}
