import { Router } from "express";
import axios from "axios";

const router = Router();
const BASE = "https://www.1secmail.com/api/v1/";

router.get("/tempmail/domains", async (_req, res) => {
  try {
    const { data } = await axios.get<string[]>(`${BASE}?action=getDomainList`, { timeout: 8000 });
    res.json({ domains: data });
  } catch {
    res.json({ domains: ["1secmail.com", "1secmail.net", "1secmail.org", "wwjmp.com", "esiix.com"] });
  }
});

router.get("/tempmail/inbox", async (req, res) => {
  const { login, domain } = req.query as Record<string, string>;
  if (!login || !domain) return res.status(400).json({ error: "Missing login or domain" });
  try {
    const { data } = await axios.get(`${BASE}?action=getMessages&login=${encodeURIComponent(login)}&domain=${encodeURIComponent(domain)}`, { timeout: 8000 });
    res.json({ messages: data });
  } catch {
    res.status(502).json({ error: "Cannot reach mail server" });
  }
});

router.get("/tempmail/message", async (req, res) => {
  const { login, domain, id } = req.query as Record<string, string>;
  if (!login || !domain || !id) return res.status(400).json({ error: "Missing params" });
  try {
    const { data } = await axios.get(`${BASE}?action=readMessage&login=${encodeURIComponent(login)}&domain=${encodeURIComponent(domain)}&id=${id}`, { timeout: 8000 });
    res.json(data);
  } catch {
    res.status(502).json({ error: "Cannot reach mail server" });
  }
});

export default router;
