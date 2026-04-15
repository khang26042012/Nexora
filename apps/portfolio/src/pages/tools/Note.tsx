import { Navigation } from "@/components/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Copy, Download, NotebookPen, Link2,
  CheckCircle2, AlertCircle, ChevronDown, Loader2, Eye,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { Document, Packer, Paragraph, TextRun } from "docx";

const FONT = "'Plus Jakarta Sans', sans-serif";
const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

/* ── AnimBorderCard ── */
function AnimBorderCard({
  children, speed = 4, color = "rgba(255,255,255,0.85)",
  radius = 16, innerStyle = {}, className = "",
}: {
  children: React.ReactNode; speed?: number; color?: string;
  radius?: number; innerStyle?: React.CSSProperties; className?: string;
}) {
  return (
    <div
      className={`running-border ${className}`}
      style={{
        "--rb-speed": `${speed}s`,
        "--rb-color": color,
        "--rb-radius": `${radius}px`,
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        ...innerStyle,
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

/* ── Download helpers ── */
function rawToHtml(raw: string, title: string): string {
  const body = raw.split("\n").map(line => {
    if (!line.trim()) return "<br/>";
    return `<p>${line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`;
  }).join("\n");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title || "Note"}</title><style>body{font-family:'Segoe UI',sans-serif;line-height:1.8;max-width:800px;margin:40px auto;padding:0 24px}</style></head><body><h1>${title || "Note"}</h1>${body}</body></html>`;
}

function rawToJson(raw: string, title: string): string {
  return JSON.stringify({ title, content: raw, exportedAt: new Date().toISOString(), tool: "NexoraAI Note" }, null, 2);
}

async function rawToDocx(raw: string, title: string): Promise<Blob> {
  const children = [];
  if (title) children.push(new Paragraph({ children: [new TextRun({ text: title, bold: true, size: 32 })] }));
  raw.split("\n").forEach(line =>
    children.push(new Paragraph({ spacing: { before: 40 }, children: [new TextRun({ text: line, size: 24 })] }))
  );
  const doc = new Document({ sections: [{ properties: {}, children }] });
  return await Packer.toBlob(doc);
}

const DOWNLOAD_FORMATS = [
  { id: "txt",  label: ".txt  — Văn bản thuần",  ext: "txt" },
  { id: "md",   label: ".md   — Markdown",         ext: "md" },
  { id: "html", label: ".html — Trang web",        ext: "html" },
  { id: "json", label: ".json — Dữ liệu JSON",     ext: "json" },
  { id: "docx", label: ".docx — Microsoft Word",   ext: "docx" },
] as const;
type DlFmt = typeof DOWNLOAD_FORMATS[number]["id"];

/* ── Background orbs ── */
function Orbs() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.35, 0.2] }}
        transition={{ duration: 18, repeat: Infinity }}
        className="absolute top-[-15%] right-[-5%] w-[50vw] h-[50vw] rounded-full"
        style={{ background: "radial-gradient(ellipse, rgba(255,255,255,0.04) 0%, transparent 70%)" }}
      />
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.12, 0.25, 0.12] }}
        transition={{ duration: 14, repeat: Infinity, delay: 5 }}
        className="absolute bottom-[-10%] left-[-5%] w-[40vw] h-[40vw] rounded-full"
        style={{ background: "radial-gradient(ellipse, rgba(255,255,255,0.03) 0%, transparent 70%)" }}
      />
    </div>
  );
}

/* ── Shared download + copy action bar ── */
function ActionBar({ content, title }: { content: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const [showDl, setShowDl] = useState(false);
  const dlRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showDl) return;
    const h = (e: MouseEvent) => {
      if (dlRef.current && !dlRef.current.contains(e.target as Node)) setShowDl(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showDl]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async (fmt: DlFmt) => {
    setShowDl(false);
    const filename = `note_${Date.now()}`;
    let blob: Blob;
    if (fmt === "txt") blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    else if (fmt === "md") blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    else if (fmt === "html") blob = new Blob([rawToHtml(content, title)], { type: "text/html;charset=utf-8" });
    else if (fmt === "json") blob = new Blob([rawToJson(content, title)], { type: "application/json;charset=utf-8" });
    else blob = await rawToDocx(content, title);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${filename}.${fmt}`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      {/* Copy nội dung */}
      <button onClick={handleCopy}
        style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.13)", background: "rgba(255,255,255,0.05)", color: copied ? "rgba(100,220,150,0.9)" : "rgba(255,255,255,0.55)", fontSize: 12, cursor: "pointer", fontFamily: FONT, transition: "all 0.2s" }}>
        {copied ? <CheckCircle2 style={{ width: 13, height: 13 }} /> : <Copy style={{ width: 13, height: 13 }} />}
        {copied ? "Đã sao chép" : "Copy"}
      </button>

      {/* Download dropdown */}
      <div style={{ position: "relative" }} ref={dlRef}>
        <button onClick={() => setShowDl(v => !v)}
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.13)", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.55)", fontSize: 12, cursor: "pointer", fontFamily: FONT, transition: "all 0.2s" }}>
          <Download style={{ width: 13, height: 13 }} />
          Tải về
          <ChevronDown style={{ width: 11, height: 11, transform: showDl ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
        </button>

        <AnimatePresence>
          {showDl && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 50, minWidth: 210, background: "rgba(18,18,20,0.97)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
            >
              {DOWNLOAD_FORMATS.map(f => (
                <button key={f.id} onClick={() => handleDownload(f.id)}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 16px", background: "none", border: "none", color: "rgba(255,255,255,0.7)", fontSize: 12.5, cursor: "pointer", fontFamily: FONT, transition: "background 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "none")}
                >
                  {f.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   NOTE EDITOR — /tool/note
══════════════════════════════════════════════ */
export function NoteEditor() {
  const [, navigate] = useLocation();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCreate = useCallback(async () => {
    if (!content.trim()) return;
    setLoading(true);
    setError(null);
    setShareLink(null);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), content: content.trim() }),
      });
      const data = await res.json() as { id?: string; error?: string };
      if (!res.ok || !data.id) throw new Error(data.error ?? "Lỗi tạo note");
      const link = `${window.location.origin}${BASE}/tool/note/${data.id}`;
      setShareLink(link);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi không xác định");
    } finally {
      setLoading(false);
    }
  }, [title, content]);

  const handleCopyLink = async () => {
    if (!shareLink) return;
    await navigator.clipboard.writeText(shareLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const canCreate = content.trim().length > 0 && !loading;

  return (
    <div style={{ minHeight: "100dvh", background: "#050505", fontFamily: FONT }}>
      <Navigation />
      <Orbs />

      <div className="relative max-w-2xl mx-auto px-4 pt-24 pb-20" style={{ zIndex: 1 }}>

        {/* Back */}
        <motion.button
          initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate("/tool")}
          whileHover={{ x: -3 }}
          style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 28, color: "rgba(255,255,255,0.35)", background: "none", border: "none", cursor: "pointer", fontFamily: FONT, fontSize: 13 }}
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </motion.button>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", flexShrink: 0 }}>
              <NotebookPen className="w-5 h-5" style={{ color: "rgba(255,255,255,0.75)" }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "rgba(255,255,255,0.95)", margin: 0 }}>Note</h1>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.32)", margin: 0, marginTop: 2 }}>Viết ghi chú — tạo link chia sẻ cho bất kỳ ai</p>
            </div>
          </div>
        </motion.div>

        {/* Title input */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} style={{ marginBottom: 12 }}>
          <AnimBorderCard speed={6} color="rgba(255,255,255,0.3)" radius={12}>
            <input
              type="text"
              placeholder="Tiêu đề (tuỳ chọn)..."
              value={title}
              onChange={e => setTitle(e.target.value.slice(0, 200))}
              style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: "rgba(255,255,255,0.82)", fontSize: 14, fontWeight: 600, padding: "12px 16px", fontFamily: FONT, caretColor: "rgba(255,255,255,0.7)", boxSizing: "border-box" }}
            />
          </AnimBorderCard>
        </motion.div>

        {/* Content textarea */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} style={{ marginBottom: 14 }}>
          <AnimBorderCard speed={5} color="rgba(255,255,255,0.4)" radius={14}>
            <div style={{ padding: "14px 16px 12px" }}>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder={"Viết nội dung ghi chú của bạn ở đây...\n\nSau khi viết xong, bấm 'Tạo liên kết' để chia sẻ với mọi người."}
                rows={12}
                style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: "rgba(255,255,255,0.82)", fontSize: 13.5, lineHeight: 1.75, resize: "vertical", padding: 0, fontFamily: FONT, caretColor: "rgba(255,255,255,0.7)", boxSizing: "border-box" }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>{content.length.toLocaleString()} ký tự</span>
              </div>
            </div>
          </AnimBorderCard>
        </motion.div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "10px 14px", borderRadius: 12, background: "rgba(255,60,60,0.07)", border: "1px solid rgba(255,60,60,0.18)" }}>
              <AlertCircle style={{ width: 15, height: 15, color: "rgba(255,120,120,0.8)", flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: "rgba(255,150,150,0.9)" }}>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Create link button */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} style={{ marginBottom: 20 }}>
          <AnimBorderCard speed={canCreate ? 3 : 8} color={canCreate ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.15)"} radius={14}>
            <button onClick={handleCreate} disabled={!canCreate}
              style={{ width: "100%", padding: "15px", background: "transparent", border: "none", cursor: canCreate ? "pointer" : "not-allowed", color: canCreate ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.22)", fontSize: 14, fontWeight: 700, fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {loading
                ? <><Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> Đang tạo...</>
                : <><Link2 style={{ width: 16, height: 16 }} /> Tạo liên kết chia sẻ</>}
            </button>
          </AnimBorderCard>
        </motion.div>

        {/* Share link result */}
        <AnimatePresence>
          {shareLink && (
            <motion.div
              initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ marginBottom: 24 }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <CheckCircle2 style={{ width: 13, height: 13, color: "rgba(100,220,150,0.75)" }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.38)" }}>Liên kết chia sẻ</span>
                </div>
                <ActionBar content={content} title={title} />
              </div>

              <AnimBorderCard speed={3} color="rgba(100,220,150,0.5)" radius={12}>
                <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                  <Link2 style={{ width: 14, height: 14, color: "rgba(100,220,150,0.6)", flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12.5, color: "rgba(255,255,255,0.6)", wordBreak: "break-all", fontFamily: "monospace" }}>{shareLink}</span>
                  <button onClick={handleCopyLink}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(100,220,150,0.25)", background: "rgba(100,220,150,0.07)", color: copiedLink ? "rgba(100,220,150,0.9)" : "rgba(100,220,150,0.6)", fontSize: 11.5, cursor: "pointer", fontFamily: FONT, flexShrink: 0, transition: "all 0.2s" }}>
                    {copiedLink ? <CheckCircle2 style={{ width: 11, height: 11 }} /> : <Copy style={{ width: 11, height: 11 }} />}
                    {copiedLink ? "Đã copy" : "Copy link"}
                  </button>
                </div>
              </AnimBorderCard>

              {/* Quick view link */}
              <div style={{ marginTop: 10, textAlign: "center" }}>
                <a href={shareLink} target="_blank" rel="noreferrer"
                  style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <Eye style={{ width: 12, height: 12 }} /> Xem trước note →
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   NOTE VIEWER — /tool/note/:id
══════════════════════════════════════════════ */
interface NoteData {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export function NoteViewer() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [note, setNote] = useState<NoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    fetch(`/api/notes/${id}`)
      .then(r => {
        if (!r.ok) throw new Error("Không tìm thấy note này");
        return r.json() as Promise<NoteData>;
      })
      .then(data => { setNote(data); setLoading(false); })
      .catch(e => { setError(e instanceof Error ? e.message : "Lỗi tải note"); setLoading(false); });
  }, [id]);

  const shareLink = `${window.location.origin}${BASE}/tool/note/${id}`;

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const createdDate = note
    ? new Date(note.created_at).toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short" })
    : "";

  return (
    <div style={{ minHeight: "100dvh", background: "#050505", fontFamily: FONT }}>
      <Navigation />
      <Orbs />

      <div className="relative max-w-2xl mx-auto px-4 pt-24 pb-20" style={{ zIndex: 1 }}>

        {/* Back */}
        <motion.button
          initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate("/tool/note")}
          whileHover={{ x: -3 }}
          style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 28, color: "rgba(255,255,255,0.35)", background: "none", border: "none", cursor: "pointer", fontFamily: FONT, fontSize: 13 }}
        >
          <ArrowLeft className="w-4 h-4" /> Tạo note mới
        </motion.button>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", paddingTop: 80 }}>
            <Loader2 style={{ width: 28, height: 28, color: "rgba(255,255,255,0.3)" }} className="animate-spin mx-auto" />
            <p style={{ marginTop: 12, fontSize: 13, color: "rgba(255,255,255,0.3)" }}>Đang tải note...</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: "center", paddingTop: 60 }}>
            <AlertCircle style={{ width: 32, height: 32, color: "rgba(255,100,100,0.4)" }} className="mx-auto mb-4" />
            <p style={{ fontSize: 15, color: "rgba(255,150,150,0.7)", marginBottom: 8 }}>{error}</p>
            <button onClick={() => navigate("/tool/note")}
              style={{ marginTop: 16, padding: "8px 18px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.45)", fontSize: 13, cursor: "pointer", fontFamily: FONT }}>
              Tạo note mới
            </button>
          </motion.div>
        )}

        {/* Note content */}
        {!loading && note && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

            {/* Header */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", flexShrink: 0 }}>
                  <NotebookPen className="w-5 h-5" style={{ color: "rgba(255,255,255,0.75)" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {note.title ? (
                    <h1 style={{ fontSize: 22, fontWeight: 800, color: "rgba(255,255,255,0.95)", margin: 0, wordBreak: "break-word" }}>{note.title}</h1>
                  ) : (
                    <h1 style={{ fontSize: 22, fontWeight: 800, color: "rgba(255,255,255,0.3)", margin: 0, fontStyle: "italic" }}>Không có tiêu đề</h1>
                  )}
                  <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.22)", margin: 0, marginTop: 4 }}>Tạo lúc {createdDate}</p>
                </div>
              </div>
            </div>

            {/* Action bar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <CheckCircle2 style={{ width: 13, height: 13, color: "rgba(100,220,150,0.75)" }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.38)" }}>Nội dung note</span>
              </div>
              <ActionBar content={note.content} title={note.title} />
            </div>

            {/* Note body */}
            <AnimBorderCard speed={4} color="rgba(255,255,255,0.4)" radius={14} innerStyle={{ marginBottom: 20 }}>
              <div style={{ padding: "20px 22px", minHeight: 200 }}>
                <pre style={{ margin: 0, fontFamily: FONT, fontSize: 14, lineHeight: 1.8, color: "rgba(255,255,255,0.78)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {note.content}
                </pre>
              </div>
            </AnimBorderCard>

            {/* Share link */}
            <div style={{ marginTop: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                <Link2 style={{ width: 12, height: 12, color: "rgba(255,255,255,0.3)" }} />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>Link chia sẻ</span>
              </div>
              <AnimBorderCard speed={6} color="rgba(255,255,255,0.2)" radius={10}>
                <div style={{ padding: "11px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ flex: 1, fontSize: 11.5, color: "rgba(255,255,255,0.4)", wordBreak: "break-all", fontFamily: "monospace" }}>{shareLink}</span>
                  <button onClick={handleCopyLink}
                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: copiedLink ? "rgba(100,220,150,0.8)" : "rgba(255,255,255,0.4)", fontSize: 11, cursor: "pointer", fontFamily: FONT, flexShrink: 0, transition: "all 0.2s" }}>
                    {copiedLink ? <CheckCircle2 style={{ width: 10, height: 10 }} /> : <Copy style={{ width: 10, height: 10 }} />}
                    {copiedLink ? "Đã copy" : "Copy"}
                  </button>
                </div>
              </AnimBorderCard>
            </div>

          </motion.div>
        )}

      </div>
    </div>
  );
}
