import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import router from "./routes.js";
import { logger } from "./lib/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();

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
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// All API + legacy routes handled here
app.use("/", router);

if (process.env.NODE_ENV === "production") {
  // API server dist is at artifacts/api-server/dist/index.mjs
  // Dashboard dist is at artifacts/dashboard/dist/public/
  const dashboardDist = path.resolve(__dirname, "../../dashboard/dist/public");
  const indexHtml = path.join(dashboardDist, "index.html");

  logger.info({ dashboardDist, exists: fs.existsSync(dashboardDist) }, "Dashboard dist path");

  if (fs.existsSync(dashboardDist)) {
    // Serve static assets (JS, CSS, images, etc.)
    app.use(express.static(dashboardDist));

    // SPA fallback — serve index.html for any unmatched route
    app.use((_req: Request, res: Response) => {
      res.sendFile(indexHtml);
    });
  } else {
    logger.error({ dashboardDist }, "Dashboard dist not found — did the build run?");
    app.use((_req: Request, res: Response) => {
      res.status(503).send("Dashboard not built. Please check the build logs.");
    });
  }
} else {
  // In development: proxy anything the router didn't handle to the Vite dev server.
  // This MUST be after the router so API routes are never forwarded to Vite.
  const vitePort = process.env.VITE_DEV_PORT ?? "5173";
  const { createProxyMiddleware } = await import("http-proxy-middleware");

  app.use(
    createProxyMiddleware({
      target: `http://127.0.0.1:${vitePort}`,
      changeOrigin: true,
      ws: false,
    }),
  );
  logger.info({ vitePort }, "Dev proxy fallback → Vite registered");
}

export default app;
