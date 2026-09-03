import { useEffect, useState } from "react";
import * as api from "@/lib/api";
import type { BoardState, ProjectState } from "@/lib/types";
import { ProgressCard } from "@/components/ProgressCard";
import { UpdatesCard } from "@/components/UpdatesCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Lock, Plus, Trash2, LogOut, FolderKanban, Loader2, RefreshCw } from "lucide-react";
import { formatDateLong } from "@/lib/markdown";

const ADMIN_PWD = "26042012khang";

export default function App() {
  // Public mode by default. Admin only when on /admin URL with correct password.
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const isAdminRoute = path === "/admin" || path === "/admin/";
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);

  useEffect(() => {
    api.adminStatus()
      .then((r) => setAuthenticated(r.authenticated))
      .catch(() => setAuthenticated(false))
      .finally(() => setCheckingAuth(false));
  }, []);

  const tryLogin = async () => {
    if (!password) return;
    setLoginBusy(true);
    setLoginError(null);
    try {
      await api.adminLogin(password);
      setAuthenticated(true);
      setPassword("");
    } catch (err: any) {
      setLoginError(err.message || "Sai mật khẩu");
    } finally {
      setLoginBusy(false);
    }
  };

  const logout = async () => {
    await api.adminLogout().catch(() => {});
    setAuthenticated(false);
  };

  const isAdmin = isAdminRoute && authenticated;

  // === Load state ===
  const [state, setState] = useState<BoardState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const s = await api.getState();
      setState(s);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Lỗi tải state");
    }
  };

  useEffect(() => {
    load();
  }, []);

  // === Mutations (only allowed when admin) ===
  const wrap = async (fn: () => Promise<void>) => {
    if (!isAdmin) return;
    setSaving(true);
    try {
      await fn();
      await load();
    } catch (err: any) {
      setError(err.message || "Lỗi lưu");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateMeta = (projectId: string, patch: Partial<ProjectState["meta"]>) =>
    wrap(async () => {
      await api.updateProjectMeta(projectId, patch);
    });

  const handleAddTask = (projectId: string, title: string) =>
    wrap(async () => {
      await api.addTask(projectId, title);
    });

  const handleUpdateTask = (projectId: string, taskId: string, patch: any) =>
    wrap(async () => {
      await api.updateTask(projectId, taskId, patch);
    });

  const handleDeleteTask = (projectId: string, taskId: string) =>
    wrap(async () => {
      await api.deleteTask(projectId, taskId);
    });

  const handlePostUpdate = (projectId: string, text: string) =>
    wrap(async () => {
      await api.postUpdate(projectId, text);
    });

  const handleEditUpdate = (projectId: string, id: string, text: string) =>
    wrap(async () => {
      await api.editUpdate(projectId, id, text);
    });

  const handleDeleteUpdate = (projectId: string, id: string) =>
    wrap(async () => {
      await api.deleteUpdate(projectId, id);
    });

  // === Project switcher (admin only) ===
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");

  const addProject = async () => {
    if (!newProjectName.trim() || !isAdmin) return;
    setSaving(true);
    try {
      const id = newProjectName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\-]+/g, "-")
        .replace(/^-+|-+$/g, "");
      if (!id) return;
      const now = Date.now();
      await api.createProject({
        id,
        name: newProjectName.trim(),
        description: newProjectDesc.trim(),
        progress: 0,
        eta: null,
        note: "",
        createdAt: now,
        updatedAt: now,
      });
      setNewProjectName("");
      setNewProjectDesc("");
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteProject = async (projectId: string) => {
    if (!isAdmin) return;
    if (!confirm(`Xoá project "${projectId}"?`)) return;
    setSaving(true);
    try {
      await api.deleteProject(projectId);
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const switchProject = (id: string) => {
    if (!isAdmin || !state) return;
    setSaving(true);
    api
      .saveState({ ...state, activeProjectId: id })
      .then(load)
      .catch((e) => setError(e.message))
      .finally(() => setSaving(false));
  };

  // === Render gates ===
  if (isAdminRoute && checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isAdminRoute && !authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-sm border-card-border bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              Admin Login
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                tryLogin();
              }}
              className="space-y-3"
            >
              <div className="space-y-1.5">
                <Label className="text-xs">Mật khẩu</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                  placeholder="••••••••••••"
                />
              </div>
              {loginError && (
                <p className="text-xs text-destructive">{loginError}</p>
              )}
              <Button type="submit" className="w-full" disabled={loginBusy || !password}>
                {loginBusy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Vào admin"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !state) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center space-y-2">
            <p className="text-destructive text-sm">{error}</p>
            <Button onClick={load} size="sm" variant="outline">
              <RefreshCw className="h-3.5 w-3.5" /> Thử lại
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const projects = Object.values(state.projects);
  const activeProject = state.projects[state.activeProjectId] || projects[0];

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card/40 backdrop-blur-md sticky top-0 z-10">
        <div className="container max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-primary" />
            <h1 className="text-base font-semibold tracking-tight">Khang Board</h1>
            <span className="text-[10px] text-muted-foreground font-mono hidden sm:inline">
              · progress + updates
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <select
                  className="h-8 rounded-md border border-border bg-background px-2 text-xs font-mono"
                  value={state.activeProjectId}
                  onChange={(e) => switchProject(e.target.value)}
                >
                  {projects.map((p) => (
                    <option key={p.meta.id} value={p.meta.id}>
                      {p.meta.name}
                    </option>
                  ))}
                </select>
                <Button size="sm" variant="ghost" onClick={logout}>
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
            {!isAdminRoute && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  window.history.pushState({}, "", "/admin");
                  setPath("/admin");
                }}
                title="Admin"
              >
                <Lock className="h-3.5 w-3.5" />
              </Button>
            )}
            {isAdminRoute && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  window.history.pushState({}, "", "/");
                  setPath("/");
                }}
              >
                Public
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-6 space-y-6">
        {!activeProject ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Chưa có project nào.
            </CardContent>
          </Card>
        ) : (
          <>
            <ProgressCard
              project={activeProject}
              isAdmin={isAdmin}
              saving={saving}
              onUpdateMeta={(patch) => handleUpdateMeta(activeProject.meta.id, patch)}
              onAddTask={(title) => handleAddTask(activeProject.meta.id, title)}
              onUpdateTask={(taskId, patch) =>
                handleUpdateTask(activeProject.meta.id, taskId, patch)
              }
              onDeleteTask={(taskId) =>
                handleDeleteTask(activeProject.meta.id, taskId)
              }
            />

            <UpdatesCard
              updates={activeProject.updates}
              isAdmin={isAdmin}
              onPost={(text) => handlePostUpdate(activeProject.meta.id, text)}
              onEdit={(id, text) =>
                handleEditUpdate(activeProject.meta.id, id, text)
              }
              onDelete={(id) => handleDeleteUpdate(activeProject.meta.id, id)}
            />

            {isAdmin && (
              <Card className="border-card-border bg-card/40 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold tracking-tight flex items-center gap-2">
                    <Plus className="h-3.5 w-3.5 text-primary" />
                    Tạo project mới
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Input
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="Tên project (vd: khang-sword)"
                      className="sm:col-span-1"
                    />
                    <Input
                      value={newProjectDesc}
                      onChange={(e) => setNewProjectDesc(e.target.value)}
                      placeholder="Mô tả ngắn (optional)"
                      className="sm:col-span-1"
                    />
                    <Button onClick={addProject} disabled={!newProjectName.trim() || saving}>
                      <Plus className="h-3.5 w-3.5" /> Tạo
                    </Button>
                  </div>

                  <Separator />

                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                      Tất cả project ({projects.length})
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {projects.map((p) => (
                        <div
                          key={p.meta.id}
                          className="flex items-center gap-2 rounded-md border border-border bg-background/30 px-3 py-1.5"
                        >
                          <button
                            className="flex-1 text-left text-sm hover:text-primary transition-colors"
                            onClick={() => switchProject(p.meta.id)}
                          >
                            <div className="font-medium">{p.meta.name}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              {p.meta.id} · {p.meta.progress}% · {p.tasks.length} tasks ·{" "}
                              {p.updates.length} updates
                            </div>
                          </button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => deleteProject(p.meta.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <footer className="text-center text-[10px] text-muted-foreground font-mono pt-4 pb-2">
              Khang Board · cập nhật {formatDateLong(Date.now())}
            </footer>
          </>
        )}
      </main>
    </div>
  );
}
