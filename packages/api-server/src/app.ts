import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import compression from "compression";
import pinoHttp from "pino-http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import router from "./routes";
import { logger } from "./lib/logger";
import { nexoraRouter } from "@workspace/nexora-garden/server";
import { accessLogMiddleware } from "./middleware/access-log.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();

// Trust Cloudflare proxy — để Express dùng đúng Host header từ X-Forwarded-Host
app.set("trust proxy", 1);

// Gzip/deflate compression — giảm ~70% bytes cho JS/CSS/HTML
app.use(
  compression({
    threshold: 1024,
    level: 6,
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) return false;
      return compression.filter(req, res);
    },
  }),
);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(accessLogMiddleware);

// ── NexoraGarden ─────────────────────────────────────────────────────────────
const nexoraGardenDist = path.resolve(
  __dirname,
  "../../../apps/nexora-garden/dist/public",
);

if (fs.existsSync(nexoraGardenDist)) {
  app.use("/NexoraGarden", express.static(nexoraGardenDist));
  logger.info({ nexoraGardenDist }, "Serving NexoraGarden dashboard");
} else {
  logger.warn({ nexoraGardenDist }, "NexoraGarden dist not found — run build first");
}

app.use("/NexoraGarden", nexoraRouter);

if (fs.existsSync(nexoraGardenDist)) {
  const indexHtml = path.join(nexoraGardenDist, "index.html");
  app.get("/NexoraGarden/{*path}", (_req: Request, res: Response) => {
    res.sendFile(indexHtml);
  });
}

// ── API routes ────────────────────────────────────────────────────────────────
app.use("/api", router);

// ── Portfolio (serve cuối cùng — catch-all) ───────────────────────────────────
const portfolioDist = path.resolve(
  __dirname,
  "../../../apps/portfolio/dist/public",
);

if (fs.existsSync(portfolioDist)) {
  app.use(express.static(portfolioDist, {
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".html")) {
        // HTML phải revalidate mỗi lần (vì nội dung có thể đổi sau deploy mới)
        res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
      } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        // Vite-hashed assets (JS/CSS có hash trong tên) → cache 1 năm, immutable
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else {
        // Ảnh/font/other static — cache 1 ngày trên browser, 7 ngày trên CDN
        res.setHeader(
          "Cache-Control",
          "public, max-age=86400, s-maxage=604800",
        );
      }
    },
  }));
  app.get("{*path}", (_req: Request, res: Response) => {
    // SPA fallback — trả index.html, không cache (revalidate)
    res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
    res.sendFile(path.join(portfolioDist, "index.html"));
  });
  logger.info({ portfolioDist }, "Serving portfolio");
} else {
  logger.warn({ portfolioDist }, "Portfolio dist not found — run build first");
}

export default app;