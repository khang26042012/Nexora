import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const dataDir = path.join(process.cwd(), "packages/api-server/data");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const DB_PATH = path.join(dataDir, "nexora.db");
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS temp_mail_inbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    login TEXT NOT NULL,
    from_addr TEXT NOT NULL DEFAULT '',
    subject TEXT NOT NULL DEFAULT '(Không có tiêu đề)',
    body_text TEXT NOT NULL DEFAULT '',
    body_html TEXT NOT NULL DEFAULT '',
    date DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_tmp_login ON temp_mail_inbox(login);
`);

export interface TempMailMessage {
  id: number;
  login: string;
  from_addr: string;
  subject: string;
  body_text: string;
  body_html: string;
  date: string;
}

export interface TempMailMeta {
  id: number;
  from: string;
  subject: string;
  date: string;
}

export function insertEmail(
  login: string,
  from_addr: string,
  subject: string,
  body_text: string,
  body_html: string,
  date?: string,
): number {
  const stmt = db.prepare(
    `INSERT INTO temp_mail_inbox (login, from_addr, subject, body_text, body_html, date)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  const result = stmt.run(
    login.toLowerCase(),
    from_addr,
    subject || "(Không có tiêu đề)",
    body_text,
    body_html,
    date ?? new Date().toISOString(),
  );
  return result.lastInsertRowid as number;
}

export function getInbox(login: string): TempMailMeta[] {
  const rows = db
    .prepare(
      `SELECT id, from_addr as "from", subject, date
       FROM temp_mail_inbox WHERE login = ?
       ORDER BY date DESC LIMIT 50`,
    )
    .all(login.toLowerCase()) as TempMailMeta[];
  return rows;
}

export function getMessage(login: string, id: number): TempMailMessage | undefined {
  return db
    .prepare(
      `SELECT * FROM temp_mail_inbox WHERE id = ? AND login = ?`,
    )
    .get(id, login.toLowerCase()) as TempMailMessage | undefined;
}

export function deleteOldEmails(daysOld = 3): number {
  const result = db
    .prepare(`DELETE FROM temp_mail_inbox WHERE date < datetime('now', ?)`)
    .run(`-${daysOld} days`);
  return result.changes;
}
