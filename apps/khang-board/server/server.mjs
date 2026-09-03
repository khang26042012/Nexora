// Khang Board backend — Express + JSON file storage
// Run: node server.mjs
// Listens on 0.0.0.0:3002 by default

import express from "express";
import session from "express-session";
import cookieParser from "cookie-parser";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.resolve(__dirname, "board-state.json");

const PORT = Number(process.env.PORT ?? 3002);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "26042012khang";
const SESSION_SECRET =
  process.env.SESSION_SECRET ??
  "khang-board-dev-secret-change-me-in-prod-26042012khang";

// === Storage ===
function defaultState() {
  const now = Date.now();
  return {
    projects: {
      "khang-sword": {
        meta: {
          id: "khang-sword",
          name: "Quyền Năng Của Khang",
          description:
            "Custom netherite admin sword plugin — Paper 26.2 + Geyser Bedrock support",
          progress: 75,
          eta: null,
          note:
            "**Trạng thái**: hoàn thành MVP, đang test Bedrock client.\n\nRepo: `nexora/apps/adminsword-plugin`",
          createdAt: now,
          updatedAt: now,
        },
        tasks: [
          { id: randomUUID(), title: "Fix Warden 1-hit", status: "done", createdAt: now, updatedAt: now },
          { id: randomUUID(), title: "PDC custom_data cho Bedrock pack", status: "done", createdAt: now, updatedAt: now },
          { id: randomUUID(), title: "Host pack trên raw.githubusercontent.com", status: "done", createdAt: now, updatedAt: now },
          { id: randomUUID(), title: "Test Bedrock client download pack", status: "in_progress", createdAt: now, updatedAt: now },
          { id: randomUUID(), title: "Extension API cho PE_KhangKYT", status: "todo", createdAt: now, updatedAt: now },
        ],
        updates: [
          { id: randomUUID(), text: "Server log sạch sau khi fix Bedrock pack URL. Đợi user test.", createdAt: now - 1000 * 60 * 60 * 5, edited: false },
          { id: randomUUID(), text: "Đổi sang `custom_data` component match — `select` không work vì TextComponent mismatch.", createdAt: now - 1000 * 60 * 60 * 6, edited: false },
        ],
      },
      "xkiro-rotator": {
        meta: {
          id: "xkiro-rotator",
          name: "Xkiro Rotator",
          description: "Anti-spawn disabled + model lock + IP whitelist + email alerts",
          progress: 90,
          eta: null,
          note: "**Files** xong, đang đợi anh test trên Termux thật.",
          createdAt: now,
          updatedAt: now,
        },
        tasks: [
          { id: randomUUID(), title: "ZIP toàn bộ tool", status: "done", createdAt: now, updatedAt: now },
          { id: randomUUID(), title: "Verify SMTP alert", status: "done", createdAt: now, updatedAt: now },
          { id: randomUUID(), title: "Hướng dẫn Termux thật", status: "in_progress", createdAt: now, updatedAt: now },
        ],
        updates: [
          { id: randomUUID(), text: "Alert email về `tkccphone8@gmail.com` (email phụ).", createdAt: now - 1000 * 60 * 30, edited: false },
        ],
      },
    },
    activeProjectId: "khang-sword",
  };
}

function loadState() {
  if (!fs.existsSync(DATA_FILE)) {
    const def = defaultState();
    fs.writeFileSync(DATA_FILE, JSON.stringify(def, null, 2));
    return def;
  }
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch (e) {
    console.error("[state] parse error, using default");
    return defaultState();
  }
}

function saveState(s) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(s, null, 2));
}

let state = loadState();

// Mutex for state writes (simple, in-memory)
let writeLock = Promise.resolve();
function withLock(fn) {
  const next = writeLock.then(fn, fn);
  writeLock = next.catch(() => {});
  return next;
}

// === App ===
const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      secure: process.env.NODE_ENV === "production",
    },
  }),
);

// Logging
app.use((req, _res, next) => {
  if (req.path.startsWith("/api")) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
});

// === Auth middleware ===
function requireAdmin(req, res, next) {
  if (req.session?.admin === true) return next();
  return res.status(401).json({ error: "Unauthorized" });
}

// === Routes ===

// Auth
app.post("/api/auth/login", (req, res) => {
  const { password } = req.body || {};
  if (typeof password !== "string" || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Sai mật khẩu" });
  }
  req.session.admin = true;
  res.json({ ok: true });
});

app.post("/api/auth/logout", (req, res) => {
  req.session.admin = false;
  res.json({ ok: true });
});

app.get("/api/auth/status", (req, res) => {
  res.json({ authenticated: req.session?.admin === true });
});

// State
app.get("/api/state", (_req, res) => {
  res.json(state);
});

app.put("/api/state", requireAdmin, (req, res) =>
  withLock(async () => {
    const body = req.body || {};
    if (typeof body !== "object" || !body.projects) {
      return res.status(400).json({ error: "Invalid state" });
    }
    state = body;
    saveState(state);
    res.json({ ok: true });
  }).catch((e) => res.status(500).json({ error: e.message })),
);

// Project
app.post("/api/project", requireAdmin, (req, res) =>
  withLock(async () => {
    const meta = req.body;
    if (!meta?.id || !meta?.name) return res.status(400).json({ error: "Missing id/name" });
    if (state.projects[meta.id]) return res.status(409).json({ error: "Project exists" });
    state.projects[meta.id] = {
      meta: { ...meta, createdAt: Date.now(), updatedAt: Date.now() },
      tasks: [],
      updates: [],
    };
    if (!state.activeProjectId) state.activeProjectId = meta.id;
    saveState(state);
    res.json({ ok: true, project: state.projects[meta.id] });
  }).catch((e) => res.status(500).json({ error: e.message })),
);

app.patch("/api/project/:id/meta", requireAdmin, (req, res) =>
  withLock(async () => {
    const proj = state.projects[req.params.id];
    if (!proj) return res.status(404).json({ error: "Not found" });
    proj.meta = { ...proj.meta, ...req.body, id: proj.meta.id, updatedAt: Date.now() };
    saveState(state);
    res.json({ ok: true, project: proj });
  }).catch((e) => res.status(500).json({ error: e.message })),
);

app.delete("/api/project/:id", requireAdmin, (req, res) =>
  withLock(async () => {
    if (!state.projects[req.params.id]) return res.status(404).json({ error: "Not found" });
    delete state.projects[req.params.id];
    if (state.activeProjectId === req.params.id) {
      state.activeProjectId = Object.keys(state.projects)[0] ?? "";
    }
    saveState(state);
    res.json({ ok: true });
  }).catch((e) => res.status(500).json({ error: e.message })),
);

// Tasks
app.post("/api/project/:id/tasks", requireAdmin, (req, res) =>
  withLock(async () => {
    const proj = state.projects[req.params.id];
    if (!proj) return res.status(404).json({ error: "Not found" });
    const { title } = req.body || {};
    if (!title || typeof title !== "string") return res.status(400).json({ error: "Missing title" });
    const task = { id: randomUUID(), title, status: "in_progress", createdAt: Date.now(), updatedAt: Date.now() };
    proj.tasks.push(task);
    proj.meta.updatedAt = Date.now();
    saveState(state);
    res.json({ ok: true, task });
  }).catch((e) => res.status(500).json({ error: e.message })),
);

app.patch("/api/project/:id/tasks/:taskId", requireAdmin, (req, res) =>
  withLock(async () => {
    const proj = state.projects[req.params.id];
    if (!proj) return res.status(404).json({ error: "Not found" });
    const t = proj.tasks.find((x) => x.id === req.params.taskId);
    if (!t) return res.status(404).json({ error: "Task not found" });
    Object.assign(t, req.body, { id: t.id, updatedAt: Date.now() });
    proj.meta.updatedAt = Date.now();
    saveState(state);
    res.json({ ok: true, task: t });
  }).catch((e) => res.status(500).json({ error: e.message })),
);

app.delete("/api/project/:id/tasks/:taskId", requireAdmin, (req, res) =>
  withLock(async () => {
    const proj = state.projects[req.params.id];
    if (!proj) return res.status(404).json({ error: "Not found" });
    const before = proj.tasks.length;
    proj.tasks = proj.tasks.filter((x) => x.id !== req.params.taskId);
    if (proj.tasks.length === before) return res.status(404).json({ error: "Task not found" });
    proj.meta.updatedAt = Date.now();
    saveState(state);
    res.json({ ok: true });
  }).catch((e) => res.status(500).json({ error: e.message })),
);

// Updates (timeline)
app.post("/api/project/:id/updates", requireAdmin, (req, res) =>
  withLock(async () => {
    const proj = state.projects[req.params.id];
    if (!proj) return res.status(404).json({ error: "Not found" });
    const { text } = req.body || {};
    if (!text || typeof text !== "string") return res.status(400).json({ error: "Missing text" });
    const update = { id: randomUUID(), text, createdAt: Date.now(), edited: false };
    proj.updates.push(update);
    proj.meta.updatedAt = Date.now();
    saveState(state);
    res.json({ ok: true, update });
  }).catch((e) => res.status(500).json({ error: e.message })),
);

app.patch("/api/project/:id/updates/:updateId", requireAdmin, (req, res) =>
  withLock(async () => {
    const proj = state.projects[req.params.id];
    if (!proj) return res.status(404).json({ error: "Not found" });
    const u = proj.updates.find((x) => x.id === req.params.updateId);
    if (!u) return res.status(404).json({ error: "Update not found" });
    if (typeof req.body.text === "string") u.text = req.body.text;
    u.edited = true;
    proj.meta.updatedAt = Date.now();
    saveState(state);
    res.json({ ok: true, update: u });
  }).catch((e) => res.status(500).json({ error: e.message })),
);

app.delete("/api/project/:id/updates/:updateId", requireAdmin, (req, res) =>
  withLock(async () => {
    const proj = state.projects[req.params.id];
    if (!proj) return res.status(404).json({ error: "Not found" });
    const before = proj.updates.length;
    proj.updates = proj.updates.filter((x) => x.id !== req.params.updateId);
    if (proj.updates.length === before) return res.status(404).json({ error: "Update not found" });
    proj.meta.updatedAt = Date.now();
    saveState(state);
    res.json({ ok: true });
  }).catch((e) => res.status(500).json({ error: e.message })),
);

// Health
app.get("/api/health", (_req, res) => res.json({ ok: true, time: Date.now() }));

// === Start ===
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Khang Board backend listening on http://0.0.0.0:${PORT}`);
  console.log(`Data file: ${DATA_FILE}`);
  console.log(`Admin password: ${ADMIN_PASSWORD === "26042012khang" ? "(default 26042012khang)" : "(custom)"}`);
});
