import { Navigation } from "@/components/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Copy, Download, Loader2, Wand2,
  Settings2, Sparkles, CheckCircle2, AlertCircle, ChevronDown,
  Pencil, Eye,
} from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { Document, Packer, Paragraph, TextRun } from "docx";

const FONT = "'Plus Jakarta Sans', sans-serif";

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[\s]*[-*+]\s+/gm, "- ")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

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
function rawToHtml(raw: string): string {
  const body = raw.split("\n").map(line => {
    if (!line.trim()) return "<br/>";
    const inline = line.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
    return `<p>${inline}</p>`;
  }).join("\n");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>body{font-family:'Segoe UI',sans-serif;line-height:1.8;max-width:800px;margin:40px auto;padding:0 24px}</style></head><body>${body}</body></html>`;
}

function rawToMarkdown(raw: string): string { return raw; }

function rawToJson(raw: string): string {
  return JSON.stringify({ prompt: raw, generatedAt: new Date().toISOString(), tool: "NexoraAI Prompt Builder" }, null, 2);
}

async function rawToDocx(raw: string): Promise<Blob> {
  const paragraphs = raw.split("\n").map(line =>
    new Paragraph({ spacing: { before: 40 }, children: [new TextRun({ text: line, size: 24 })] })
  );
  const doc = new Document({ sections: [{ properties: {}, children: paragraphs }] });
  return await Packer.toBlob(doc);
}

const DOWNLOAD_FORMATS = [
  { id: "txt",  label: ".txt  — Văn bản thuần",  ext: "txt",  mime: "text/plain" },
  { id: "md",   label: ".md   — Markdown",         ext: "md",   mime: "text/markdown" },
  { id: "html", label: ".html — Trang web",        ext: "html", mime: "text/html" },
  { id: "json", label: ".json — Dữ liệu JSON",     ext: "json", mime: "application/json" },
  { id: "docx", label: ".docx — Microsoft Word",   ext: "docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
] as const;
type DownloadFmt = typeof DOWNLOAD_FORMATS[number]["id"];

type Mode = "manual" | "ai";
const TABS: { id: Mode; label: string; icon: React.ElementType }[] = [
  { id: "manual", label: "Tự set",  icon: Settings2 },
  { id: "ai",     label: "AI viết", icon: Sparkles  },
];

const TONES = ["Chuyên nghiệp", "Thân thiện", "Sáng tạo", "Ngắn gọn", "Học thuật"];
const OUT_FMTS = ["Đoạn văn", "Danh sách", "Từng bước", "Bảng", "Code"];

/* ── Stream from API ── */
async function streamPrompt(
  payload: Record<string, string>,
  onChunk: (chunk: string) => void
): Promise<void> {
  const res = await fetch("/api/prompt-gen", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err?.error ?? `HTTP ${res.status}`);
  }
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (!data || data === "[DONE]") continue;
      if (data.startsWith("[ERROR]")) {
        throw new Error(data.slice(7).trim());
      }
      try {
        const parsed = JSON.parse(data);
        if (parsed?.error) throw new Error(parsed.error);
        const chunk = parsed?.text ?? "";
        if (chunk) onChunk(chunk);
      } catch (e) {
        if (e instanceof Error && !(e instanceof SyntaxError)) throw e;
      }
    }
  }
}

export function PromptBuilder() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<Mode>("manual");

  /* Manual fields */
  const [role,      setRole]      = useState("");
  const [task,      setTask]      = useState("");
  const [context,   setContext]   = useState("");
  const [tone,      setTone]      = useState("Chuyên nghiệp");
  const [outFmt,    setOutFmt]    = useState("Đoạn văn");
  const [extra,     setExtra]     = useState("");

  /* AI mode */
  const [description, setDescription] = useState("");

  /* Output */
  const [result,    setResult]    = useState("");
  const [rawResult, setRawResult] = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [copied,    setCopied]    = useState(false);
  const [showDlMenu, setShowDlMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText,  setEditText]  = useState("");

  const dlMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showDlMenu) return;
    const handler = (e: MouseEvent) => {
      if (dlMenuRef.current && !dlMenuRef.current.contains(e.target as Node)) setShowDlMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDlMenu]);

  const handleEditChange = (val: string) => {
    setEditText(val);
    setRawResult(val);
    setResult(val);
  };

  const handleSubmit = useCallback(async () => {
    setError(null); setResult(""); setRawResult(""); setEditText(""); setIsEditing(false); setLoading(true);
    const payload: Record<string, string> = { mode };
    if (mode === "manual") {
      Object.assign(payload, { role, task, context, tone, outputFormat: outFmt, extra });
    } else {
      payload.description = description;
    }
    try {
      let raw = "";
      await streamPrompt(payload, chunk => {
        raw += chunk;
        setResult(raw);
      });
      const cleaned = stripMarkdown(raw);
      setRawResult(cleaned);
      setResult(cleaned);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định");
    } finally {
      setLoading(false);
    }
  }, [mode, role, task, context, tone, outFmt, extra, description]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(rawResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async (fmt: DownloadFmt) => {
    setShowDlMenu(false);
    let blob: Blob;
    const filename = `prompt_${Date.now()}`;
    if (fmt === "docx") {
      blob = await rawToDocx(rawResult);
    } else {
      let content = rawResult;
      let mime = "text/plain;charset=utf-8";
      if (fmt === "md")   { content = rawToMarkdown(rawResult); mime = "text/markdown;charset=utf-8"; }
      if (fmt === "html") { content = rawToHtml(rawResult);     mime = "text/html;charset=utf-8"; }
      if (fmt === "json") { content = rawToJson(rawResult);     mime = "application/json;charset=utf-8"; }
      blob = new Blob([content], { type: mime });
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${filename}.${fmt}`; a.click();
    URL.revokeObjectURL(url);
  };

  const canSubmit = !loading && (
    mode === "manual" ? task.trim().length > 0 : description.trim().length > 0
  );

  return (
    <div style={{ minHeight: "100dvh", background: "#050505", fontFamily: FONT }}>
      <Navigation />

      {/* Background orbs */}
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
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", flexShrink: 0 }}>
              <Wand2 className="w-5 h-5" style={{ color: "rgba(255,255,255,0.75)" }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "rgba(255,255,255,0.95)", margin: 0 }}>Prompt Builder</h1>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.32)", margin: 0, marginTop: 2 }}>Tạo prompt AI chuẩn — tự điền hoặc để AI viết lại</p>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.22)", margin: 0, marginTop: 4 }}>Mô tả yêu cầu đơn giản — AI tự viết lại thành prompt chuẩn</p>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {TABS.map(t => {
            const Icon = t.icon;
            const active = mode === t.id;
            return (
              <button key={t.id} onClick={() => { setMode(t.id); setResult(""); setRawResult(""); setError(null); setIsEditing(false); }}
                style={{ flex: 1, padding: "11px 8px", borderRadius: 12, border: active ? "1px solid rgba(255,255,255,0.28)" : "1px solid rgba(255,255,255,0.07)", background: active ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.02)", color: active ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.35)", fontSize: 12, fontWeight: active ? 700 : 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontFamily: FONT, transition: "all 0.2s" }}>
                <Icon style={{ width: 13, height: 13 }} />
                {t.label}
              </button>
            );
          })}
        </motion.div>

        {/* Input area */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} style={{ marginBottom: 14 }}>
          <AnimatePresence mode="wait">

            {/* Manual mode */}
            {mode === "manual" && (
              <motion.div key="manual" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <AnimBorderCard speed={5} color="rgba(255,255,255,0.4)" radius={14}>
                  <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 16 }}>

                    {/* Đóng vai */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.45)", letterSpacing: "0.04em", textTransform: "uppercase" }}>Đóng vai</span>
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>tuỳ chọn</span>
                      </div>
                      <textarea rows={2} value={role} onChange={e => setRole(e.target.value)}
                        placeholder="VD: Bạn là chuyên gia Marketing 10 năm kinh nghiệm..."
                        style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 10, outline: "none", color: "rgba(255,255,255,0.78)", fontSize: 13.5, lineHeight: 1.65, resize: "none", padding: "10px 13px", fontFamily: FONT, caretColor: "rgba(255,255,255,0.7)", boxSizing: "border-box" }}
                      />
                    </div>

                    {/* Nhiệm vụ */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.45)", letterSpacing: "0.04em", textTransform: "uppercase" }}>Nhiệm vụ</span>
                        <span style={{ fontSize: 10, color: "rgba(255,200,100,0.5)" }}>bắt buộc</span>
                      </div>
                      <textarea rows={3} value={task} onChange={e => setTask(e.target.value)}
                        placeholder="VD: Viết bài quảng cáo sản phẩm X ngắn gọn, hấp dẫn..."
                        style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${task.trim() ? "rgba(255,255,255,0.09)" : "rgba(255,200,100,0.15)"}`, borderRadius: 10, outline: "none", color: "rgba(255,255,255,0.78)", fontSize: 13.5, lineHeight: 1.65, resize: "none", padding: "10px 13px", fontFamily: FONT, caretColor: "rgba(255,255,255,0.7)", boxSizing: "border-box" }}
                      />
                    </div>

                    {/* Ngữ cảnh */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.45)", letterSpacing: "0.04em", textTransform: "uppercase" }}>Ngữ cảnh</span>
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>tuỳ chọn</span>
                      </div>
                      <textarea rows={2} value={context} onChange={e => setContext(e.target.value)}
                        placeholder="VD: Đối tượng là học sinh lớp 10, sản phẩm là..."
                        style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 10, outline: "none", color: "rgba(255,255,255,0.78)", fontSize: 13.5, lineHeight: 1.65, resize: "none", padding: "10px 13px", fontFamily: FONT, caretColor: "rgba(255,255,255,0.7)", boxSizing: "border-box" }}
                      />
                    </div>

                    {/* Tone */}
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.45)", letterSpacing: "0.04em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Phong cách</span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {TONES.map(t => (
                          <button key={t} onClick={() => setTone(t)}
                            style={{ padding: "5px 13px", borderRadius: 20, border: tone === t ? "1px solid rgba(255,255,255,0.3)" : "1px solid rgba(255,255,255,0.09)", background: tone === t ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)", color: tone === t ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.38)", fontSize: 11, fontFamily: FONT, cursor: "pointer", transition: "all 0.15s" }}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Output format */}
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.45)", letterSpacing: "0.04em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Định dạng output</span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {OUT_FMTS.map(f => (
                          <button key={f} onClick={() => setOutFmt(f)}
                            style={{ padding: "5px 13px", borderRadius: 20, border: outFmt === f ? "1px solid rgba(255,255,255,0.3)" : "1px solid rgba(255,255,255,0.09)", background: outFmt === f ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)", color: outFmt === f ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.38)", fontSize: 11, fontFamily: FONT, cursor: "pointer", transition: "all 0.15s" }}>
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Extra */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.45)", letterSpacing: "0.04em", textTransform: "uppercase" }}>Yêu cầu thêm</span>
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>tuỳ chọn</span>
                      </div>
                      <input type="text" value={extra} onChange={e => setExtra(e.target.value)}
                        placeholder="VD: Tối đa 200 từ, không dùng từ ngữ kỹ thuật..."
                        style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 10, outline: "none", color: "rgba(255,255,255,0.78)", fontSize: 13.5, padding: "10px 13px", fontFamily: FONT, caretColor: "rgba(255,255,255,0.7)", boxSizing: "border-box" }}
                      />
                    </div>

                  </div>
                </AnimBorderCard>
              </motion.div>
            )}

            {/* AI mode */}
            {mode === "ai" && (
              <motion.div key="ai" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <AnimBorderCard speed={5} color="rgba(255,255,255,0.4)" radius={14}>
                  <div style={{ padding: "14px 16px 12px" }}>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value.slice(0, 500))}
                      placeholder={"VD: Viết email cảm ơn khách hàng sau khi mua hàng\nHoặc: Tạo button React có animation gradient khi hover\nHoặc: Giải thích machine learning cho học sinh lớp 10..."}
                      rows={6}
                      style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: "rgba(255,255,255,0.82)", fontSize: 13.5, lineHeight: 1.75, resize: "vertical", padding: "0 0 4px", fontFamily: FONT, caretColor: "rgba(255,255,255,0.7)", boxSizing: "border-box" }}
                    />
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>{description.length} / 500</span>
                    </div>
                  </div>
                </AnimBorderCard>

                {/* Gợi ý */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 10 }}>
                  {["Viết email xin việc", "Giải thích khái niệm khó", "Tạo component React đẹp", "Phân tích đoạn văn"].map(hint => (
                    <button key={hint} onClick={() => setDescription(hint)}
                      style={{ padding: "5px 12px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.09)", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.38)", fontSize: 11, cursor: "pointer", fontFamily: FONT }}>
                      {hint}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
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

        {/* Submit */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} style={{ marginBottom: 28 }}>
          <AnimBorderCard speed={canSubmit ? 3 : 8} color={canSubmit ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.15)"} radius={14}>
            <button onClick={handleSubmit} disabled={!canSubmit}
              style={{ width: "100%", padding: "15px", background: "transparent", border: "none", cursor: canSubmit ? "pointer" : "not-allowed", color: canSubmit ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.22)", fontSize: 14, fontWeight: 700, fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {loading
                ? <><Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> Đang tạo...</>
                : <><Wand2 style={{ width: 16, height: 16 }} /> {mode === "ai" ? "Viết Prompt" : "Tạo Prompt"}</>}
            </button>
          </AnimBorderCard>
        </motion.div>

        {/* Output */}
        <AnimatePresence>
          {(result || loading) && (
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {/* Output header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  {loading
                    ? <Loader2 style={{ width: 13, height: 13, color: "rgba(255,255,255,0.4)" }} className="animate-spin" />
                    : <CheckCircle2 style={{ width: 13, height: 13, color: "rgba(100,220,150,0.75)" }} />}
                  <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.38)" }}>
                    {loading ? "Đang tạo..." : "Prompt của bạn"}
                  </span>
                </div>

                {result && !loading && (
                  <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                    {/* Edit toggle */}
                    <button
                      onClick={() => { if (!isEditing) setEditText(rawResult); setIsEditing(v => !v); }}
                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, border: `1px solid ${isEditing ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.11)"}`, background: isEditing ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)", color: isEditing ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: FONT, transition: "all 0.15s" }}>
                      {isEditing ? <Eye style={{ width: 13, height: 13 }} /> : <Pencil style={{ width: 13, height: 13 }} />}
                      {isEditing ? "Xem trước" : "Chỉnh sửa"}
                    </button>

                    {/* Copy */}
                    <button onClick={handleCopy}
                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.11)", background: "rgba(255,255,255,0.03)", color: copied ? "rgba(100,220,150,0.9)" : "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>
                      {copied ? <CheckCircle2 style={{ width: 13, height: 13 }} /> : <Copy style={{ width: 13, height: 13 }} />}
                      {copied ? "Đã copy" : "Copy"}
                    </button>

                    {/* Download dropdown */}
                    <div ref={dlMenuRef} style={{ position: "relative" }}>
                      <button
                        onClick={() => setShowDlMenu(v => !v)}
                        style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.11)", background: showDlMenu ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: FONT, transition: "background 0.15s" }}
                      >
                        <Download style={{ width: 13, height: 13 }} />
                        Tải về
                        <ChevronDown style={{ width: 11, height: 11, transition: "transform 0.2s", transform: showDlMenu ? "rotate(180deg)" : "rotate(0deg)" }} />
                      </button>

                      <AnimatePresence>
                        {showDlMenu && (
                          <motion.div
                            initial={{ opacity: 0, y: -4, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -4, scale: 0.97 }}
                            transition={{ duration: 0.12 }}
                            style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: "rgba(18,18,18,0.97)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, overflow: "hidden", zIndex: 50, minWidth: 210, backdropFilter: "blur(12px)" }}
                          >
                            {DOWNLOAD_FORMATS.map(fmt => (
                              <button
                                key={fmt.id}
                                onClick={() => handleDownload(fmt.id)}
                                style={{ width: "100%", display: "block", textAlign: "left", padding: "10px 16px", background: "none", border: "none", color: "rgba(255,255,255,0.65)", fontSize: 12, fontFamily: FONT, cursor: "pointer", transition: "background 0.12s", fontWeight: 500 }}
                                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                                onMouseLeave={e => (e.currentTarget.style.background = "none")}
                              >
                                {fmt.label}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                )}
              </div>

              {/* Output content */}
              <AnimBorderCard
                speed={loading ? 2 : isEditing ? 4 : 9}
                color={loading ? "rgba(255,255,255,0.45)" : isEditing ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.15)"}
                radius={14}
                innerStyle={isEditing ? { padding: "4px" } : { padding: "18px 20px", maxHeight: 560, overflowY: "auto" }}
              >
                {isEditing ? (
                  <textarea
                    value={editText}
                    onChange={e => handleEditChange(e.target.value)}
                    spellCheck={false}
                    style={{ width: "100%", minHeight: 300, background: "transparent", border: "none", outline: "none", color: "rgba(255,255,255,0.82)", fontSize: 13, lineHeight: 1.75, resize: "vertical", padding: "16px 18px", fontFamily: "monospace", caretColor: "rgba(255,255,255,0.7)", boxSizing: "border-box" }}
                  />
                ) : result ? (
                  <div style={{ fontSize: 13.5, lineHeight: 1.85, color: "rgba(255,255,255,0.82)", whiteSpace: "pre-wrap", fontFamily: FONT }}>
                    {result}
                  </div>
                ) : (
                  <div style={{ height: 40 }} />
                )}
                {loading && (
                  <motion.span
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 0.55, repeat: Infinity }}
                    style={{ display: "inline-block", width: 2, height: "1em", background: "rgba(255,255,255,0.65)", verticalAlign: "text-bottom", marginLeft: 2 }}
                  />
                )}
              </AnimBorderCard>

              {isEditing && (
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.22)", marginTop: 8, textAlign: "center" }}>
                  Đang chỉnh sửa — Copy / Tải về sẽ dùng nội dung đã sửa
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
