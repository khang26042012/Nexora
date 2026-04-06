import { fileURLToPath } from "node:url";
import path from "node:path";
import { createServer } from "node:http";

// Load .env before anything else
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dotenv = await import("dotenv");
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import app from "./app.js";
import { initDb } from "./db.js";
import { initTelegramBot, sendTelegram } from "./telegram.js";
import { initWebSocket } from "./websocket.js";
import { logger } from "./lib/logger.js";

// Global error handlers — prevent unhandled errors from crashing the server
process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception — server will continue");
});

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection — server will continue");
});

const rawPort = process.env["PORT"];
if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Initialize SQLite tables
initDb();
logger.info("Database initialized");

// Create HTTP server from Express app (needed to share with WebSocket)
const httpServer = createServer(app);

// Attach WebSocket server — pass sendTelegram to avoid circular imports
initWebSocket(httpServer, sendTelegram);

// Start Telegram bot (webhook in production, polling in development)
await initTelegramBot();

httpServer.listen(port, "0.0.0.0", () => {
  logger.info({ port }, "NexoraGarden server listening");
  // Send startup notification (delayed to let Telegram bot auth first)
  setTimeout(() => {
    sendTelegram("✅ NexoraGarden server đã khởi động");
  }, 3000);
});
