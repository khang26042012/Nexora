import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarDays,
  Pencil,
  Save,
  X,
  Plus,
  Trash2,
  MessageSquare,
  Lock,
  LogOut,
  Loader2,
  FolderKanban,
  Check,
} from "lucide-react";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const FONT = "'Plus Jakarta Sans', sans-serif";

// === Storage keys ===
const LS_STATE = "ptk-khang-board-state-v1";
const LS_AUTH = "ptk-khang-board-auth";
const ADMIN_PASSWORD = "26042012khang";

// === Types ===
type TaskStatus = "todo" | "in_progress" | "done" | "blocked";
interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  createdAt: number;
  updatedAt: number;
}
interface ProjectMeta {
  id: string;
  name: string;
  description: string;
  progress: number;
  eta: string | null;
  note: string;
  createdAt: number;
  updatedAt: number;
}
interface UpdateMessage {
  id: string;
  text: string;
  createdAt: number;
  edited: boolean;
}
interface ProjectState {
  meta: ProjectMeta;
  tasks: Task[];
  updates: UpdateMessage[];
}
interface BoardState {
  projects: Record<string, ProjectState>;
  activeProjectId: string;
}

const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

// === Default seed (chỉ tạo lần đầu, nếu localStorage rỗng) ===
function defaultState(): BoardState {
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
          { id: newId(), title: "Fix Warden 1-hit", status: "done", createdAt: now, updatedAt: now },
          { id: newId(), title: "PDC custom_data cho Bedrock pack", status: "done", createdAt: now, updatedAt: now },
          { id: newId(), title: "Host pack trên raw.githubusercontent.com", status: "done", createdAt: now, updatedAt: now },
          { id: newId(), title: "Test Bedrock client download pack", status: "in_progress", createdAt: now, updatedAt: now },
          { id: newId(), title: "Extension API cho PE_KhangKYT", status: "todo", createdAt: now, updatedAt: now },
        ],
        updates: [
          { id: newId(), text: "Server log sạch sau khi fix Bedrock pack URL. Đợi user test.", createdAt: now - 1000 * 60 * 60 * 5, edited: false },
          { id: newId(), text: "Đổi sang `custom_data` component match — `select` không work vì TextComponent mismatch.", createdAt: now - 1000 * 60 * 60 * 6, edited: false },
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
          { id: newId(), title: "ZIP toàn bộ tool", status: "done", createdAt: now, updatedAt: now },
          { id: newId(), title: "Verify SMTP alert", status: "done", createdAt: now, updatedAt: now },
          { id: newId(), title: "Hướng dẫn Termux thật", status: "in_progress", createdAt: now, updatedAt: now },
        ],
        updates: [
          { id: newId(), text: "Alert email về `tkccphone8@gmail.com` (email phụ).", createdAt: now - 1000 * 60 * 30, edited: false },
        ],
      },
    },
    activeProjectId: "khang-sword",
  };
}

function loadState(): BoardState {
  try {
    const raw = localStorage.getItem(LS_STATE);
    if (raw) return JSON.parse(raw);
  } catch {}
  const def = defaultState();
  localStorage.setItem(LS_STATE, JSON.stringify(def));
  return def;
}
function saveState(s: BoardState) {
  localStorage.setItem(LS_STATE, JSON.stringify(s));
}

// === Markdown render đơn giản ===
function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function renderMarkdown(input: string) {
  if (!input) return null;
  const lines = input.split("\n");
  return lines.map((line, idx) => {
    if (!line.trim()) return <br key={idx} />;
    let h = escapeHtml(line);
    h = h.replace(/`([^`]+)`/g, '<code class="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.85em]">$1</code>');
    h = h.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-white">$1</strong>');
    h = h.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
    h = h.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer" class="text-blue-300 underline-offset-2 hover:underline">$1</a>');
    return <span key={idx} dangerouslySetInnerHTML={{ __html: h }} />;
  });
}

function formatTime(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return time;
  return `${d.toLocaleDateString("vi-VN")} ${time}`;
}

// === Glass card style (giống portfolio) ===
const glass: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 20,
  backdropFilter: "blur(12px)",
};

// === Main page ===
export function KhangBoard() {
  const [state, setState] = useState<BoardState | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setState(loadState());
    setIsAdmin(localStorage.getItem(LS_AUTH) === "ok");
  }, []);

  if (!state) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-white/60" />
      </div>
    );
  }

  const active = state.projects[state.activeProjectId] || Object.values(state.projects)[0];

  const update = (mut: (s: BoardState) => BoardState) => {
    setSaving(true);
    const next = mut(state);
    setState(next);
    saveState(next);
    setTimeout(() => setSaving(false), 200);
  };

  const switchProject = (id: string) =>
    update((s) => ({ ...s, activeProjectId: id }));

  const logout = () => {
    localStorage.removeItem(LS_AUTH);
    setIsAdmin(false);
  };

  return (
    <div className="min-h-screen bg-black text-white" style={{ fontFamily: FONT }}>
      <Navigation />
      <main className="container max-w-5xl mx-auto px-4 py-8 pt-20 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <FolderKanban className="h-5 w-5 text-blue-300" />
            <h1 className="text-xl font-semibold tracking-tight">Khang Board</h1>
            <span className="text-[11px] text-white/50 font-mono">
              · progress + updates
            </span>
            {saving && <Loader2 className="h-3 w-3 animate-spin text-white/40" />}
          </div>
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <>
                <select
                  className="h-8 rounded-md border border-white/15 bg-white/5 px-2 text-xs font-mono text-white"
                  value={state.activeProjectId}
                  onChange={(e) => switchProject(e.target.value)}
                >
                  {Object.values(state.projects).map((p) => (
                    <option key={p.meta.id} value={p.meta.id} className="bg-black">
                      {p.meta.name}
                    </option>
                  ))}
                </select>
                <Button size="sm" variant="ghost" onClick={logout}>
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : null}
          </div>
        </motion.div>

        {!active ? (
          <div style={glass} className="p-8 text-center text-white/60">
            Chưa có project nào.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProgressCard
              project={active}
              isAdmin={isAdmin}
              onUpdateMeta={(patch) =>
                update((s) => ({
                  ...s,
                  projects: {
                    ...s.projects,
                    [active.meta.id]: {
                      ...active,
                      meta: { ...active.meta, ...patch, updatedAt: Date.now() },
                    },
                  },
                }))
              }
              onAddTask={(title) =>
                update((s) => ({
                  ...s,
                  projects: {
                    ...s.projects,
                    [active.meta.id]: {
                      ...active,
                      tasks: [
                        ...active.tasks,
                        { id: newId(), title, status: "in_progress", createdAt: Date.now(), updatedAt: Date.now() },
                      ],
                      meta: { ...active.meta, updatedAt: Date.now() },
                    },
                  },
                }))
              }
              onUpdateTask={(taskId, patch) =>
                update((s) => ({
                  ...s,
                  projects: {
                    ...s.projects,
                    [active.meta.id]: {
                      ...active,
                      tasks: active.tasks.map((t) =>
                        t.id === taskId ? { ...t, ...patch, updatedAt: Date.now() } : t,
                      ),
                      meta: { ...active.meta, updatedAt: Date.now() },
                    },
                  },
                }))
              }
              onDeleteTask={(taskId) =>
                update((s) => ({
                  ...s,
                  projects: {
                    ...s.projects,
                    [active.meta.id]: {
                      ...active,
                      tasks: active.tasks.filter((t) => t.id !== taskId),
                      meta: { ...active.meta, updatedAt: Date.now() },
                    },
                  },
                }))
              }
            />

            <UpdatesCard
              updates={active.updates}
              isAdmin={isAdmin}
              onPost={(text) =>
                update((s) => ({
                  ...s,
                  projects: {
                    ...s.projects,
                    [active.meta.id]: {
                      ...active,
                      updates: [
                        ...active.updates,
                        { id: newId(), text, createdAt: Date.now(), edited: false },
                      ],
                      meta: { ...active.meta, updatedAt: Date.now() },
                    },
                  },
                }))
              }
              onEdit={(id, text) =>
                update((s) => ({
                  ...s,
                  projects: {
                    ...s.projects,
                    [active.meta.id]: {
                      ...active,
                      updates: active.updates.map((u) =>
                        u.id === id ? { ...u, text, edited: true } : u,
                      ),
                      meta: { ...active.meta, updatedAt: Date.now() },
                    },
                  },
                }))
              }
              onDelete={(id) =>
                update((s) => ({
                  ...s,
                  projects: {
                    ...s.projects,
                    [active.meta.id]: {
                      ...active,
                      updates: active.updates.filter((u) => u.id !== id),
                      meta: { ...active.meta, updatedAt: Date.now() },
                    },
                  },
                }))
              }
            />
          </div>
        )}

        {isAdmin && (
          <AdminExtras
            state={state}
            onAddProject={(name, description) => {
              const id = name
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9\-]+/g, "-")
                .replace(/^-+|-+$/g, "");
              if (!id || state.projects[id]) return;
              const now = Date.now();
              update((s) => ({
                ...s,
                projects: {
                  ...s.projects,
                  [id]: {
                    meta: { id, name, description, progress: 0, eta: null, note: "", createdAt: now, updatedAt: now },
                    tasks: [],
                    updates: [],
                  },
                },
                activeProjectId: id,
              }));
            }}
            onDeleteProject={(id) =>
              update((s) => {
                const next = { ...s.projects };
                delete next[id];
                return {
                  projects: next,
                  activeProjectId:
                    s.activeProjectId === id ? Object.keys(next)[0] ?? "" : s.activeProjectId,
                };
              })
            }
          />
        )}
      </main>
    </div>
  );
}

// === Progress Card ===
function ProgressCard({
  project,
  isAdmin,
  onUpdateMeta,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
}: {
  project: ProjectState;
  isAdmin: boolean;
  onUpdateMeta: (patch: Partial<ProjectMeta>) => void;
  onAddTask: (title: string) => void;
  onUpdateTask: (id: string, patch: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(project.meta);
  const [newTask, setNewTask] = useState("");

  const startEdit = () => {
    setDraft(project.meta);
    setEditing(true);
  };
  const save = () => {
    onUpdateMeta(draft);
    setEditing(false);
  };

  const etaText = project.meta.eta
    ? new Date(project.meta.eta).toLocaleDateString("vi-VN")
    : "—";
  const etaRemaining = project.meta.eta
    ? Math.ceil((new Date(project.meta.eta).getTime() - Date.now()) / 86400000)
    : null;

  const visibleTasks = [
    ...project.tasks.filter((t) => t.status === "in_progress"),
    ...project.tasks.filter((t) => t.status === "todo"),
  ].slice(0, 8);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card style={glass} className="border-white/12">
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-lg font-semibold">
                {editing ? (
                  <Input
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    className="max-w-xs bg-white/5 border-white/15"
                  />
                ) : (
                  project.meta.name
                )}
              </CardTitle>
              <Badge variant="secondary" className="font-mono text-[10px] bg-white/10 text-white/80 border-white/15">
                {project.meta.id}
              </Badge>
            </div>
            {editing ? (
              <Input
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="Mô tả ngắn"
                className="max-w-md bg-white/5 border-white/15 text-sm"
              />
            ) : project.meta.description ? (
              <p className="text-xs text-white/60">{project.meta.description}</p>
            ) : null}
          </div>
          {isAdmin &&
            (editing ? (
              <div className="flex gap-1.5">
                <Button size="sm" onClick={save}>
                  <Save className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={startEdit} className="border-white/15 bg-white/5">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            ))}
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Progress + ETA */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-white/50">
                Tiến độ
              </Label>
              <div className="flex items-end justify-between gap-2">
                <span className="text-2xl font-bold text-blue-300 font-mono">
                  {editing ? (
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={draft.progress}
                      onChange={(e) =>
                        setDraft({ ...draft, progress: Number(e.target.value) || 0 })
                      }
                      className="w-20 h-7 text-right font-mono bg-white/5 border-white/15"
                    />
                  ) : (
                    `${project.meta.progress}%`
                  )}
                </span>
              </div>
              <Progress value={editing ? draft.progress : project.meta.progress} className="h-1.5" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-white/50 flex items-center gap-1">
                <CalendarDays className="h-3 w-3" /> ETA
              </Label>
              {editing ? (
                <Input
                  type="date"
                  value={draft.eta || ""}
                  onChange={(e) => setDraft({ ...draft, eta: e.target.value || null })}
                  className="bg-white/5 border-white/15 text-sm"
                />
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-base font-medium">{etaText}</span>
                  {etaRemaining !== null && (
                    <span
                      className={
                        etaRemaining < 0
                          ? "text-[10px] text-red-400 font-mono"
                          : etaRemaining <= 3
                          ? "text-[10px] text-amber-300 font-mono"
                          : "text-[10px] text-white/50 font-mono"
                      }
                    >
                      {etaRemaining < 0 ? `trễ ${-etaRemaining}d` : `còn ${etaRemaining}d`}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-white/50">Note</Label>
            {editing ? (
              <Textarea
                value={draft.note}
                onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                placeholder="Markdown: **bold**, *italic*, `code`, [link](url)"
                className="font-mono text-sm min-h-[70px] bg-white/5 border-white/15"
              />
            ) : project.meta.note ? (
              <div className="rounded-md border border-white/10 bg-white/5 p-2.5 text-sm leading-relaxed">
                {renderMarkdown(project.meta.note)}
              </div>
            ) : (
              <p className="text-sm text-white/40 italic">(trống)</p>
            )}
          </div>

          {/* Tasks */}
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-white/50">
              Tasks ({visibleTasks.length})
            </Label>
            <div className="space-y-1">
              {visibleTasks.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5"
                >
                  {isAdmin ? (
                    <Checkbox
                      checked={t.status === "done"}
                      onCheckedChange={(c) => onUpdateTask(t.id, { status: c ? "done" : "in_progress" })}
                    />
                  ) : (
                    <span className="h-4 w-4 rounded-sm border border-white/15 inline-block" />
                  )}
                  <span
                    className={
                      t.status === "done"
                        ? "text-sm line-through text-white/40"
                        : "text-sm"
                    }
                  >
                    {t.title}
                  </span>
                  {isAdmin && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 ml-auto text-white/40 hover:text-red-400"
                      onClick={() => onDeleteTask(t.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {isAdmin && (
              <form
                className="flex gap-2 pt-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newTask.trim()) return;
                  onAddTask(newTask.trim());
                  setNewTask("");
                }}
              >
                <Input
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  placeholder="+ thêm task…"
                  className="text-sm bg-white/5 border-white/15"
                />
                <Button type="submit" size="sm" variant="outline" className="border-white/15 bg-white/5">
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </form>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// === Updates Card ===
function UpdatesCard({
  updates,
  isAdmin,
  onPost,
  onEdit,
  onDelete,
}: {
  updates: UpdateMessage[];
  isAdmin: boolean;
  onPost: (text: string) => void;
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const sorted = [...updates].sort((a, b) => a.createdAt - b.createdAt);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
      <Card style={glass} className="border-white/12">
        <CardHeader className="pb-3 flex flex-row items-center gap-2 space-y-0">
          <MessageSquare className="h-4 w-4 text-blue-300" />
          <CardTitle className="text-base font-semibold">Updates gần đây</CardTitle>
          <span className="text-xs text-white/50 font-mono">({sorted.length})</span>
        </CardHeader>
        <CardContent className="space-y-3">
          {isAdmin && (
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!draft.trim()) return;
                onPost(draft.trim());
                setDraft("");
              }}
            >
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Viết update mới… (Markdown: **bold**, `code`, [link](url))"
                className="min-h-[60px] font-mono text-sm bg-white/5 border-white/15"
              />
              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={!draft.trim()}>
                  <Plus className="h-3.5 w-3.5" /> Đăng
                </Button>
              </div>
            </form>
          )}

          <Separator className="bg-white/10" />

          <ScrollArea className="h-[400px] pr-3">
            {sorted.length === 0 ? (
              <p className="text-sm text-white/40 italic py-4 text-center">(chưa có update)</p>
            ) : (
              <div className="space-y-2.5">
                {sorted.map((u) => (
                  <div
                    key={u.id}
                    className="group rounded-md border border-white/10 bg-white/5 p-2.5 hover:border-white/20 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-white/50 font-mono">
                        {formatTime(u.createdAt)}
                        {u.edited && <span className="ml-1.5 italic">(đã sửa)</span>}
                      </span>
                      {isAdmin && editingId !== u.id && (
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => {
                              setEditingId(u.id);
                              setEditText(u.text);
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-white/40 hover:text-red-400"
                            onClick={() => onDelete(u.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                    {editingId === u.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="min-h-[50px] text-sm font-mono bg-white/5 border-white/15"
                          autoFocus
                        />
                        <div className="flex gap-1.5 justify-end">
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                            <X className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              onEdit(u.id, editText.trim());
                              setEditingId(null);
                            }}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {renderMarkdown(u.text)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// === Admin: tạo / xoá project ===
function AdminExtras({
  state,
  onAddProject,
  onDeleteProject,
}: {
  state: BoardState;
  onAddProject: (name: string, description: string) => void;
  onDeleteProject: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <Card style={glass} className="border-white/12">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Plus className="h-3.5 w-3.5 text-blue-300" />
            Tạo project mới
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tên project (vd: khang-sword)"
              className="bg-white/5 border-white/15"
            />
            <Input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Mô tả (optional)"
              className="bg-white/5 border-white/15"
            />
            <Button
              onClick={() => {
                if (!name.trim()) return;
                onAddProject(name.trim(), desc.trim());
                setName("");
                setDesc("");
              }}
              disabled={!name.trim()}
            >
              <Plus className="h-3.5 w-3.5" /> Tạo
            </Button>
          </div>

          <Separator className="bg-white/10" />

          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-white/50">
              Tất cả project ({Object.keys(state.projects).length})
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {Object.values(state.projects).map((p) => (
                <div
                  key={p.meta.id}
                  className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.meta.name}</div>
                    <div className="text-[10px] text-white/50 font-mono">
                      {p.meta.id} · {p.meta.progress}% · {p.tasks.length} tasks ·{" "}
                      {p.updates.length} updates
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-white/40 hover:text-red-400"
                    onClick={() => {
                      if (confirm(`Xoá project "${p.meta.id}"?`)) onDeleteProject(p.meta.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// === Admin login (route ẩn /khang-board-admin) ===
export function KhangBoardAdmin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setTimeout(() => {
      if (password === ADMIN_PASSWORD) {
        localStorage.setItem(LS_AUTH, "ok");
        window.location.href = "/khang-board";
      } else {
        setError("Sai mật khẩu");
        setBusy(false);
      }
    }, 200);
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4" style={{ fontFamily: FONT }}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <Navigation />
        <div style={glass} className="p-6 mt-20 space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-blue-300" />
            <h1 className="text-lg font-semibold">Khang Board — Admin</h1>
          </div>
          <p className="text-xs text-white/50">
            Nhập mật khẩu để đăng bài / sửa tiến độ. Public mode xem tại{" "}
            <a href="/khang-board" className="text-blue-300 hover:underline">/khang-board</a>.
          </p>
          <form onSubmit={submit} className="space-y-3">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              autoFocus
              className="bg-white/5 border-white/15"
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy || !password}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Vào admin"}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

export default KhangBoard;
