import { Router } from "express";
import axios from "axios";
import { insertEmail, getInbox, getMessage } from "../lib/tempmail-db.js";

const router = Router();
const SECMAIL_BASE = "https://www.1secmail.com/api/v1/";
const CUSTOM_DOMAIN = "nexorax.cloud";
const WEBHOOK_SECRET = process.env.TEMPMAIL_WEBHOOK_SECRET ?? "";

/* ── Domains ── */
router.get("/tempmail/domains", async (_req, res) => {
  let extra: string[] = [];
  try {
    const { data } = await axios.get<string[]>(`${SECMAIL_BASE}?action=getDomainList`, { timeout: 6000 });
    extra = data ?? [];
  } catch {
    extra = ["1secmail.com", "1secmail.net", "1secmail.org", "wwjmp.com"];
  }
  res.json({ domains: [CUSTOM_DOMAIN, ...extra] });
});

/* ── Inbox ── */
router.get("/tempmail/inbox", async (req, res) => {
  const { login, domain } = req.query as Record<string, string>;
  if (!login || !domain) return res.status(400).json({ error: "Missing login or domain" });

  if (domain === CUSTOM_DOMAIN) {
    const messages = getInbox(login);
    return res.json({ messages });
  }

  try {
    const { data } = await axios.get(
      `${SECMAIL_BASE}?action=getMessages&login=${encodeURIComponent(login)}&domain=${encodeURIComponent(domain)}`,
      { timeout: 8000 },
    );
    res.json({ messages: data });
  } catch {
    res.status(502).json({ error: "Cannot reach mail server" });
  }
});

/* ── Read message ── */
router.get("/tempmail/message", async (req, res) => {
  const { login, domain, id } = req.query as Record<string, string>;
  if (!login || !domain || !id) return res.status(400).json({ error: "Missing params" });

  if (domain === CUSTOM_DOMAIN) {
    const msg = getMessage(login, parseInt(id, 10));
    if (!msg) return res.status(404).json({ error: "Message not found" });
    return res.json({
      id: msg.id,
      from: msg.from_addr,
      subject: msg.subject,
      date: msg.date,
      body: msg.body_text || msg.body_html,
      textBody: msg.body_text,
      htmlBody: msg.body_html,
    });
  }

  try {
    const { data } = await axios.get(
      `${SECMAIL_BASE}?action=readMessage&login=${encodeURIComponent(login)}&domain=${encodeURIComponent(domain)}&id=${id}`,
      { timeout: 8000 },
    );
    res.json(data);
  } catch {
    res.status(502).json({ error: "Cannot reach mail server" });
  }
});

/* ── Webhook: nhận email từ Cloudflare Worker ── */
router.post("/tempmail/receive", (req, res) => {
  if (WEBHOOK_SECRET) {
    const incomingSecret = req.headers["x-webhook-secret"];
    if (incomingSecret !== WEBHOOK_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  const { to, from, subject, text, html, date } = req.body ?? {};
  if (!to || !from) return res.status(400).json({ error: "Missing to or from" });

  const toAddr: string = Array.isArray(to) ? to[0] : to;
  const loginPart = toAddr.split("@")[0]?.toLowerCase() ?? "";
  if (!loginPart) return res.status(400).json({ error: "Invalid to address" });

  const id = insertEmail(
    loginPart,
    from,
    subject ?? "",
    text ?? "",
    html ?? "",
    date,
  );

  res.json({ ok: true, id });
});

export default router;
