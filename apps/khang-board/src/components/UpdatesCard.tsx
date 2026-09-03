import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Send, Pencil, Trash2, Save, X, MessageSquare } from "lucide-react";
import type { UpdateMessage } from "@/lib/types";
import { renderMarkdown, formatTime, formatDateLong } from "@/lib/markdown";

interface UpdatesCardProps {
  updates: UpdateMessage[];
  isAdmin: boolean;
  onPost: (text: string) => Promise<void>;
  onEdit: (id: string, text: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function UpdatesCard({
  updates,
  isAdmin,
  onPost,
  onEdit,
  onDelete,
}: UpdatesCardProps) {
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [posting, setPosting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new updates arrive
  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current.querySelector(
        "[data-radix-scroll-area-viewport]",
      ) as HTMLElement | null;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [updates.length]);

  const sorted = [...updates].sort((a, b) => a.createdAt - b.createdAt);

  const submit = async () => {
    if (!draft.trim() || posting) return;
    setPosting(true);
    try {
      await onPost(draft.trim());
      setDraft("");
    } finally {
      setPosting(false);
    }
  };

  const startEdit = (u: UpdateMessage) => {
    setEditingId(u.id);
    setEditText(u.text);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };
  const saveEdit = async () => {
    if (!editingId) return;
    await onEdit(editingId, editText.trim());
    setEditingId(null);
    setEditText("");
  };

  return (
    <Card className="border-card-border bg-card/70 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <CardTitle className="text-base font-semibold tracking-tight">
            Updates gần đây
          </CardTitle>
          <span className="text-xs text-muted-foreground font-mono">
            ({sorted.length})
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isAdmin && (
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Viết update mới… (Markdown: **bold**, `code`, [link](url))"
              className="min-h-[70px] font-mono text-sm"
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground font-mono">
                Cmd/Ctrl + Enter để gửi
              </span>
              <Button
                type="submit"
                size="sm"
                disabled={!draft.trim() || posting}
                onClick={(e) => {
                  e.preventDefault();
                  submit();
                }}
              >
                <Send className="h-3.5 w-3.5" />
                Đăng
              </Button>
            </div>
          </form>
        )}

        <Separator />

        <ScrollArea className="h-[420px] pr-3" ref={scrollRef}>
          {sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-4 text-center">
              (chưa có update nào)
            </p>
          ) : (
            <div className="space-y-3">
              {sorted.map((u) => (
                <div
                  key={u.id}
                  className="group rounded-md border border-border bg-background/30 p-3 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {formatTime(u.createdAt)}
                      {u.edited && <span className="ml-1.5 italic">(đã sửa)</span>}
                    </span>
                    {isAdmin && editingId !== u.id && (
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => startEdit(u)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-destructive hover:text-destructive"
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
                        className="min-h-[60px] text-sm font-mono"
                        autoFocus
                      />
                      <div className="flex gap-1.5 justify-end">
                        <Button size="sm" variant="ghost" onClick={cancelEdit}>
                          <X className="h-3 w-3" /> Hủy
                        </Button>
                        <Button size="sm" onClick={saveEdit}>
                          <Save className="h-3 w-3" /> Lưu
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
  );
}
