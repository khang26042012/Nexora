import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarDays, Pencil, Save, X, Trash2, Plus, Loader2 } from "lucide-react";
import type { ProjectState } from "@/lib/types";
import { renderMarkdown, formatDateLong } from "@/lib/markdown";

interface ProgressCardProps {
  project: ProjectState;
  isAdmin: boolean;
  onUpdateMeta: (patch: Partial<ProjectState["meta"]>) => Promise<void>;
  onAddTask: (title: string) => Promise<void>;
  onUpdateTask: (taskId: string, patch: any) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  saving: boolean;
}

export function ProgressCard({
  project,
  isAdmin,
  onUpdateMeta,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  saving,
}: ProgressCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(project.meta);
  const [newTask, setNewTask] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const startEdit = () => {
    setDraft(project.meta);
    setEditing(true);
  };
  const cancelEdit = () => setEditing(false);
  const save = async () => {
    setSubmitting(true);
    try {
      await onUpdateMeta(draft);
      setEditing(false);
    } finally {
      setSubmitting(false);
    }
  };

  const etaText = project.meta.eta
    ? new Date(project.meta.eta).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";

  const etaRemaining = project.meta.eta
    ? Math.ceil(
        (new Date(project.meta.eta).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      )
    : null;

  const inProgressTasks = project.tasks.filter((t) => t.status === "in_progress");
  const todoTasks = project.tasks.filter((t) => t.status === "todo");

  return (
    <Card className="border-card-border bg-card/70 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-xl font-semibold tracking-tight">
              {editing ? (
                <Input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="max-w-xs"
                />
              ) : (
                project.meta.name
              )}
            </CardTitle>
            <Badge variant="secondary" className="font-mono text-xs">
              {project.meta.id}
            </Badge>
            {saving && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                đang lưu…
              </span>
            )}
          </div>
          {editing ? (
            <Input
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="Mô tả ngắn"
              className="max-w-md"
            />
          ) : (
            project.meta.description && (
              <p className="text-sm text-muted-foreground">{project.meta.description}</p>
            )
          )}
        </div>
        {isAdmin && (
          <div className="flex gap-1.5">
            {editing ? (
              <>
                <Button size="sm" onClick={save} disabled={submitting}>
                  <Save className="h-3.5 w-3.5" />
                  Lưu
                </Button>
                <Button size="sm" variant="ghost" onClick={cancelEdit}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={startEdit}>
                <Pencil className="h-3.5 w-3.5" />
                Sửa
              </Button>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress + ETA row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex items-end justify-between">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Tiến độ
              </Label>
              <span className="text-2xl font-bold text-primary font-mono">
                {editing ? (
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={draft.progress}
                    onChange={(e) =>
                      setDraft({ ...draft, progress: Number(e.target.value) || 0 })
                    }
                    className="w-20 h-7 text-right font-mono"
                  />
                ) : (
                  `${project.meta.progress}%`
                )}
              </span>
            </div>
            <Progress
              value={editing ? draft.progress : project.meta.progress}
              className="h-2"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              ETA
            </Label>
            {editing ? (
              <Input
                type="date"
                value={draft.eta || ""}
                onChange={(e) => setDraft({ ...draft, eta: e.target.value || null })}
                className="max-w-xs"
              />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-medium">{etaText}</span>
                {etaRemaining !== null && (
                  <span
                    className={
                      etaRemaining < 0
                        ? "text-xs text-destructive font-mono"
                        : etaRemaining <= 3
                        ? "text-xs text-amber-400 font-mono"
                        : "text-xs text-muted-foreground font-mono"
                    }
                  >
                    {etaRemaining < 0
                      ? `trễ ${-etaRemaining}d`
                      : `còn ${etaRemaining}d`}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Note (markdown) */}
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Note
          </Label>
          {editing ? (
            <Textarea
              value={draft.note}
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
              placeholder="Markdown: **bold**, *italic*, `code`, [link](url)"
              className="font-mono text-sm min-h-[80px]"
            />
          ) : project.meta.note ? (
            <div className="rounded-md border border-border bg-background/40 p-3 text-sm leading-relaxed">
              {renderMarkdown(project.meta.note)}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">(trống)</p>
          )}
        </div>

        {/* Tasks in progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Tasks đang làm ({inProgressTasks.length})
            </Label>
          </div>
          <div className="space-y-1.5">
            {inProgressTasks.length === 0 && todoTasks.length === 0 && (
              <p className="text-sm text-muted-foreground italic">(chưa có task)</p>
            )}
            {[...inProgressTasks, ...todoTasks].slice(0, 8).map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2 rounded-md border border-border bg-background/30 px-3 py-1.5"
              >
                {isAdmin ? (
                  <Checkbox
                    checked={t.status === "done"}
                    onCheckedChange={(c) =>
                      onUpdateTask(t.id, { status: c ? "done" : "in_progress" })
                    }
                  />
                ) : (
                  <span className="h-4 w-4 rounded-sm border border-border inline-block" />
                )}
                <span
                  className={
                    t.status === "done"
                      ? "text-sm line-through text-muted-foreground"
                      : "text-sm"
                  }
                >
                  {t.title}
                </span>
                <Badge
                  variant={
                    t.status === "in_progress"
                      ? "default"
                      : t.status === "blocked"
                      ? "destructive"
                      : "secondary"
                  }
                  className="ml-auto text-[10px]"
                >
                  {t.status}
                </Badge>
                {isAdmin && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
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
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newTask.trim()) return;
                await onAddTask(newTask.trim());
                setNewTask("");
              }}
            >
              <Input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="+ thêm task mới…"
                className="text-sm"
              />
              <Button type="submit" size="sm" variant="outline">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </form>
          )}
        </div>

        <div className="text-[10px] text-muted-foreground font-mono pt-1">
          cập nhật lúc {formatDateLong(project.meta.updatedAt)}
        </div>
      </CardContent>
    </Card>
  );
}
