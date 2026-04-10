import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import router from "./routes";
import { logger } from "./lib/logger";
import { nexoraRouter } from "@workspace/nexora-garden/server";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();

// Trust Cloudflare proxy — để Express dùng đúng Host header từ X-Forwarded-Host
app.set("trust proxy", 1);

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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Surrogate-Control", "no-store");
        res.setHeader("CDN-Cache-Control", "no-store");
      }
    },
  }));
  app.get("{*path}", (_req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Surrogate-Control", "no-store");
    res.setHeader("CDN-Cache-Control", "no-store");
    res.sendFile(path.join(portfolioDist, "index.html"));
  });
  logger.info({ portfolioDist }, "Serving portfolio");
} else {
  logger.warn({ portfolioDist }, "Portfolio dist not found — run build first");
}

export default app;