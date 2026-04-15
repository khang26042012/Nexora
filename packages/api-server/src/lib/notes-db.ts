import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, "../../../../apps/nexora-garden/data");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const DB_PATH = path.join(dataDir, "nexora.db");

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export function createNote(title: string, content: string): string {
  const id = randomBytes(6).toString("base64url");
  db.prepare("INSERT INTO notes (id, title, content) VALUES (?, ?, ?)").run(
    id,
    title,
    content,
  );
  return id;
}

export function getNoteById(id: string): Note | undefined {
  return db
    .prepare("SELECT id, title, content, created_at FROM notes WHERE id = ?")
    .get(id) as Note | undefined;
}
