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
  app.use("/NexoraGarden", (_req: Request, res: Response) => {
    res.sendFile(indexHtml);
  });
}

app.use("/api", router);

export default app;
