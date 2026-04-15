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

export default router;
