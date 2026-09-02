import { createServer } from "node:http";
import app from "./app";
import { logger } from "./lib/logger";
import { initDb } from "./lib/db.js";
import { logger } from "./lib/logger.js";

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

const httpServer = createServer(app);



httpServer.listen(port, "0.0.0.0", () => {
  logger.info({ port }, "Server listening");
  });