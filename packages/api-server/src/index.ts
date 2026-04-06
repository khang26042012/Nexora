import { createServer } from "node:http";
import app from "./app";
import { logger } from "./lib/logger";
import {
  initDb,
  initTelegramBot,
  sendTelegram,
  initWebSocket,
} from "@workspace/nexora-garden/server";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception — server will continue");
});

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection — server will continue");
});

initDb();
logger.info("NexoraGarden database initialized");

const httpServer = createServer(app);

initWebSocket(httpServer, sendTelegram);

await initTelegramBot();

httpServer.listen(port, "0.0.0.0", () => {
  logger.info({ port }, "Server listening");
  setTimeout(() => {
    sendTelegram("✅ NexoraGarden server đã khởi động");
  }, 3000);
});
