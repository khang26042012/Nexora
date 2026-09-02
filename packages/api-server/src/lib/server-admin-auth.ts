import crypto from "node:crypto";

interface Session {
  token: string;
  createdAt: number;
  expiresAt: number;
}

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 giờ
const sessions = new Map<string, Session>();

export function createSession(): { token: string; expiresAt: number } {
  // Cleanup expired
  const now = Date.now();
  for (const [k, v] of sessions.entries()) {
    if (v.expiresAt < now) sessions.delete(k);
  }
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = now + SESSION_TTL_MS;
  sessions.set(token, { token, createdAt: now, expiresAt });
  return { token, expiresAt };
}

export function verifySession(token: string | undefined | null): boolean {
  if (!token) return false;
  const s = sessions.get(token);
  if (!s) return false;
  if (s.expiresAt < Date.now()) {
    sessions.delete(token);
    return false;
  }
  return true;
}

export function revokeSession(token: string | undefined | null): void {
  if (token) sessions.delete(token);
}

export function getSessionCount(): number {
  // Cleanup
  const now = Date.now();
  for (const [k, v] of sessions.entries()) {
    if (v.expiresAt < now) sessions.delete(k);
  }
  return sessions.size;
}
