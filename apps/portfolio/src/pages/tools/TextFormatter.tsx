import { Navigation } from "@/components/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Copy, Download, Loader2, FileText,
  Type, Sparkles, CheckCircle2, AlertCircle, X, Upload, ChevronDown,
} from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";

const FONT = "'Plus Jakarta Sans', sans-serif";
const MAX_CHARS = 2000;
const ACCEPTED = ".txt,.md,.doc,.docx,.csv,.json,.html,.xml,.jpg,.jpeg,.png,.webp,.gif,.bmp";

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

/* ── Render inline: **bold** ── */
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(
      <strong key={match.index} style={{ fontWeight: 700, color: "rgba(255,255,255,0.95)" }}>
        {match[1]}
      </strong>
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

/* ── Render formatted output text ── */
function RenderOutput({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <div style={{ fontFamily: FONT, fontSize: 14, lineHeight: 1.85, color: "rgba(255,255,255,0.82)" }}>
      {lines.map((line, i) => {
        const centerMatch = line.match(/^\[C\](.*?)\[\/C\]$/);
        if (centerMatch) {
          return (
            <div key={i} style={{ textAlign: "center", fontWeight: 800, fontSize: 15.5, color: "rgba(255,255,255,0.97)", marginTop: 18, marginBottom: 6, letterSpacing: 0.3 }}>
              {centerMatch[1].trim()}
            </div>
          );
        }
        if (/^---+$/.test(line.trim())) {
          return <div key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.1)", margin: "14px 0" }} />;
        }
        if (!line.trim()) {
          return <div key={i} style={{ height: 6 }} />;
        }
        if (line.trim().startsWith("✔")) {
          return (
            <div key={i} style={{ paddingLeft: 0, marginTop: 4, color: "rgba(120,220,150,0.9)", fontWeight: 600 }}>
              {renderInline(line)}
            </div>
          );
        }
        if (/^    \+\s/.test(line)) {
          return (
            <div key={i} style={{ display: "flex", gap: 6, paddingLeft: 28, marginTop: 2 }}>
              <span style={{ color: "rgba(255,255,255,0.35)", flexShrink: 0 }}>+</span>
              <span>{renderInline(line.replace(/^\s+\+\s/, ""))}</span>
            </div>
          );
        }
        if (/^- /.test(line) || /^ {0,2}- /.test(line)) {
          return (
            <div key={i} style={{ display: "flex", gap: 8, paddingLeft: 8, marginTop: 2 }}>
              <span style={{ color: "rgba(255,255,255,0.4)", flexShrink: 0, marginTop: 1 }}>–</span>
              <span>{renderInline(line.replace(/^\s*-\s/, ""))}</span>
            </div>
          );
        }
        if (/^[ABCD]\.\s/.test(line.trim())) {
          const letter = line.trim()[0];
          const content = line.trim().slice(3);
          return (
            <div key={i} style={{ display: "flex", gap: 8, paddingLeft: 16, marginTop: 3 }}>
              <span style={{ fontWeight: 700, color: "rgba(255,255,255,0.5)", flexShrink: 0, minWidth: 20 }}>{letter}.</span>
              <span>{renderInline(content)}</span>
            </div>
          );
        }
        if (/^ {4}[^ ]/.test(line)) {
          return (
            <div key={i} style={{ paddingLeft: 16, marginTop: 2 }}>
              {renderInline(line.trimStart())}
            </div>
          );
        }
        return (
          <div key={i} style={{ marginTop: 2 }}>
            {renderInline(line)}
          </div>
        );
      })}
    </div>
  );
}

/* ── Safe base64 (tránh stack overflow với file lớn) ── */
function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const CHUNK = 8192;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + CHUNK, bytes.length)));
  }
  return btoa(binary);
}

/* ── Download helpers ── */
function rawToHtml(raw: string): string {
  const lines = raw.split("\n");
  const body = lines.map(line => {
    const c = line.match(/^\[C\](.*?)\[\/C\]$/);
    if (c) return `<h1 style="text-align:center">${c[1].trim()}</h1>`;
    if (/^---+$/.test(line.trim())) return `<hr/>`;
    if (!line.trim()) return `<br/>`;
    if (line.trim().startsWith("✔")) return `<p style="color:green"><b>${line.trim()}</b></p>`;
    if (/^- /.test(line)) return `<li>${line.replace(/^\s*-\s/, "")}</li>`;
    if (/^[ABCD]\.\s/.test(line.trim())) return `<p style="padding-left:24px">${line.trim()}</p>`;
    const inline = line.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
    return `<p>${inline}</p>`;
  }).join("\n");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>body{font-family:'Segoe UI',sans-serif;line-height:1.8;max-width:800px;margin:40px auto;padding:0 24px}h1{font-size:1.4em}hr{border:0;border-top:1px solid #ccc;margin:16px 0}</style></head><body>${body}</body></html>`;
}

function rawToMarkdown(raw: string): string {
  return raw.replace(/^\[C\](.*?)\[\/C\]$/gm, (_, t) => `# ${t.trim()}`);
}

function rawToJson(raw: string): string {
  return JSON.stringify({ content: raw, generatedAt: new Date().toISOString(), tool: "NexoraAI Text Formatter" }, null, 2);
}

/* Escape ký tự đặc biệt trong RTF + encode UTF-8 thành \uN? */
function escRtf(s: string): string {
  let out = "";
  for (const ch of s) {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp < 128) {
      if (ch === "\\") out += "\\\\";
      else if (ch === "{") out += "\\{";
      else if (ch === "}") out += "\\}";
      else out += ch;
    } else {
      // RTF Unicode escape: \uN? (? = fallback ASCII)
      const n = cp > 32767 ? cp - 65536 : cp;
      out += `\\u${n}?`;
    }
  }
  return out;
}

/* Bold inline **text** → RTF bold */
function rtfInline(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, (_, t) => `{\\b ${escRtf(t)}}`);
}

function rawToRtf(raw: string): string {
  const lines = raw.split("\n");
  const body = lines.map(line => {
    const c = line.match(/^\[C\](.*?)\[\/C\]$/);
    if (c) {
      return `\\pard\\qc\\sb120\\sa80{\\b\\fs28 ${escRtf(c[1].trim())}}\\par`;
    }
    if (/^---+$/.test(line.trim())) {
      return `\\pard\\brdrb\\brdrs\\brdrw10\\brsp60\\sb60\\sa60 \\par`;
    }
    if (!line.trim()) return `\\pard\\sb0\\sa0 \\par`;
    if (line.trim().startsWith("✔")) {
      return `\\pard\\sb40\\sa0{\\cf1\\b ${rtfInline(escRtf(line.trim()))}}\\par`;
    }
    if (/^    \+\s/.test(line)) {
      return `\\pard\\fi-180\\li720\\sb20\\sa0 + ${rtfInline(escRtf(line.replace(/^\s+\+\s/, "")))}\\par`;
    }
    if (/^\s*-\s/.test(line)) {
      return `\\pard\\fi-240\\li480\\sb20\\sa0 \\bullet  ${rtfInline(escRtf(line.replace(/^\s*-\s/, "")))}\\par`;
    }
    if (/^[ABCD]\.\s/.test(line.trim())) {
      return `\\pard\\li480\\sb20\\sa0 ${rtfInline(escRtf(line.trim()))}\\par`;
    }
    if (/^ {4}[^ ]/.test(line)) {
      return `\\pard\\li320\\sb20\\sa0 ${rtfInline(escRtf(line.trimStart()))}\\par`;
    }
    return `\\pard\\sb20\\sa0 ${rtfInline(escRtf(line))}\\par`;
  }).join("\n");

  return `{\\rtf1\\ansi\\ansicpg1252\\deff0\n{\\fonttbl{\\f0\\froman\\fcharset0 Times New Roman;}}\n{\\colortbl ;\\red34\\green139\\blue34;}\n\\f0\\fs24\\sl360\\slmult1\n${body}\n}`;
}

const DOWNLOAD_FORMATS = [
  { id: "txt",  label: ".txt  — Văn bản thuần",   ext: "txt",  mime: "text/plain" },
  { id: "md",   label: ".md   — Markdown",          ext: "md",   mime: "text/markdown" },
  { id: "html", label: ".html — Trang web",         ext: "html", mime: "text/html" },
  { id: "json", label: ".json — Dữ liệu JSON",      ext: "json", mime: "application/json" },
  { id: "rtf",  label: ".rtf  — Microsoft Word",    ext: "rtf",  mime: "application/rtf" },
] as const;
type DownloadFmt = typeof DOWNLOAD_FORMATS[number]["id"];

type Tab = "file" | "text" | "generate";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "file",     label: "Upload File",  icon: Upload   },
  { id: "text",     label: "Nhập text",    icon: Type     },
  { id: "generate", label: "Tạo bằng AI",  icon: Sparkles },
];

async function streamFormat(
  payload: { mode: Tab; content?: string; mimeType?: string; prompt?: string },
  onChunk: (chunk: string) => void
): Promise<void> {
  const res = await fetch("/api/format", {
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
      try {
        const parsed = JSON.parse(data);
        if (parsed?.error) throw new Error(parsed.error);
        const chunk = parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        if (chunk) onChunk(chunk);
      } catch (e) {
        if (e instanceof Error && e.message) throw e;
      }
    }
  }
}

export function TextFormatter() {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("file");

  const [file, setFile] = useState<{ name: string; size: number; content: string; mimeType: string } | null>(null);
  const [textInput, setTextInput] = useState("");
  const [genPrompt, setGenPrompt] = useState("");

  const [result, setResult]       = useState("");
  const [rawResult, setRawResult] = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [copied, setCopied]       = useState(false);
  const [dragOver, setDragOver]   = useState(false);
  const [showDlMenu, setShowDlMenu] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const dlMenuRef = useRef<HTMLDivElement>(null);

  /* Đóng dropdown khi click ngoài */
  useEffect(() => {
    if (!showDlMenu) return;
    const handler = (e: MouseEvent) => {
      if (dlMenuRef.current && !dlMenuRef.current.contains(e.target as Node)) setShowDlMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDlMenu]);

  const readFile = useCallback(async (f: File) => {
    setError(null);
    const name = f.name.toLowerCase();
    const isImage = f.type.startsWith("image/") || [".jpg",".jpeg",".png",".webp",".gif",".bmp"].some(e => name.endsWith(e));
    const isDocx  = f.type.includes("wordprocessingml") || f.type.includes("msword") || name.endsWith(".docx") || name.endsWith(".doc");
    const isText  = !isImage && !isDocx && (
      f.type.startsWith("text/") ||
      [".txt",".md",".csv",".json",".html",".xml"].some(e => name.endsWith(e))
    );

    try {
      if (isText) {
        const text = await f.text();
        setFile({ name: f.name, size: f.size, content: text, mimeType: "text/plain" });
      } else {
        /* Binary (ảnh, docx) → base64 an toàn (không dùng spread lớn) */
        const buf = await f.arrayBuffer();
        const b64 = arrayBufferToBase64(buf);
        const mime = isImage
          ? (f.type || `image/${name.split(".").pop()}`)
          : (f.type || "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        setFile({ name: f.name, size: f.size, content: b64, mimeType: mime });
      }
    } catch {
      setError("Không đọc được file.");
    }
  }, []);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) readFile(f);
  }, [readFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) readFile(f);
    e.target.value = "";
  }, [readFile]);

  const handleSubmit = async () => {
    setError(null);
    setResult("");
    setRawResult("");
    setLoading(true);
    try {
      let payload: Parameters<typeof streamFormat>[0];
      if (tab === "file") {
        if (!file) throw new Error("Chưa chọn file");
        payload = { mode: "file", content: file.content, mimeType: file.mimeType };
      } else if (tab === "text") {
        if (!textInput.trim()) throw new Error("Chưa nhập nội dung");
        payload = { mode: "text", content: textInput };
      } else {
        if (!genPrompt.trim()) throw new Error("Chưa nhập yêu cầu");
        payload = { mode: "generate", prompt: genPrompt };
      }
      let raw = "";
      await streamFormat(payload, (chunk) => {
        raw += chunk;
        setRawResult(raw);
        setResult(raw);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(rawResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (fmt: DownloadFmt) => {
    setShowDlMenu(false);
    let content = rawResult;
    let mime = "text/plain;charset=utf-8";
    let ext = "txt";

    if (fmt === "txt")  { content = rawResult;               mime = "text/plain;charset=utf-8";       ext = "txt"; }
    if (fmt === "md")   { content = rawToMarkdown(rawResult); mime = "text/markdown;charset=utf-8";    ext = "md"; }
    if (fmt === "html") { content = rawToHtml(rawResult);     mime = "text/html;charset=utf-8";        ext = "html"; }
    if (fmt === "json") { content = rawToJson(rawResult);     mime = "application/json;charset=utf-8"; ext = "json"; }
    if (fmt === "rtf")  { content = rawToRtf(rawResult);      mime = "application/rtf";                ext = "rtf"; }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `formatted_${Date.now()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const canSubmit = !loading && (
    (tab === "file" && !!file) ||
    (tab === "text" && textInput.trim().length > 0) ||
    (tab === "generate" && genPrompt.trim().length > 0)
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
              <FileText className="w-5 h-5" style={{ color: "rgba(255,255,255,0.75)" }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "rgba(255,255,255,0.95)", margin: 0 }}>Text Formatter</h1>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.32)", margin: 0, marginTop: 2 }}>AI tự động căn chỉnh và định dạng văn bản</p>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => { setTab(t.id); setResult(""); setRawResult(""); setError(null); }}
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

            {/* Tab 1: Upload file */}
            {tab === "file" && (
              <motion.div key="file" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <input ref={fileRef} type="file" accept={ACCEPTED} style={{ display: "none" }} onChange={handleFileInput} />
                {!file ? (
                  <div
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleFileDrop}
                    onClick={() => fileRef.current?.click()}
                    style={{ border: `2px dashed ${dragOver ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.11)"}`, borderRadius: 16, padding: "44px 20px", textAlign: "center", cursor: "pointer", background: dragOver ? "rgba(255,255,255,0.04)" : "transparent", transition: "all 0.2s" }}
                  >
                    <Upload style={{ width: 32, height: 32, margin: "0 auto 12px", color: "rgba(255,255,255,0.2)" }} />
                    <p style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>Kéo thả hoặc click để chọn file</p>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.22)" }}>Hỗ trợ: .txt .md .doc .docx .csv .json .html .jpg .png .webp</p>
                  </div>
                ) : (
                  <AnimBorderCard speed={5} color="rgba(255,255,255,0.4)" radius={14}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", flexShrink: 0 }}>
                        <FileText style={{ width: 18, height: 18, color: "rgba(255,255,255,0.6)" }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.8)", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</p>
                        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button onClick={() => setFile(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                        <X style={{ width: 16, height: 16, color: "rgba(255,255,255,0.3)" }} />
                      </button>
                    </div>
                  </AnimBorderCard>
                )}
              </motion.div>
            )}

            {/* Tab 2: Manual text */}
            {tab === "text" && (
              <motion.div key="text" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <AnimBorderCard speed={6} color="rgba(255,255,255,0.3)" radius={14}>
                  <div style={{ padding: "4px 4px 0" }}>
                    <textarea
                      value={textInput}
                      onChange={e => setTextInput(e.target.value.slice(0, MAX_CHARS))}
                      placeholder="Dán hoặc nhập văn bản cần định dạng vào đây..."
                      rows={10}
                      style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: "rgba(255,255,255,0.82)", fontSize: 13.5, lineHeight: 1.75, resize: "vertical", padding: "12px 14px", fontFamily: FONT, caretColor: "rgba(255,255,255,0.7)", boxSizing: "border-box" }}
                    />
                    <div style={{ display: "flex", justifyContent: "flex-end", padding: "0 14px 10px" }}>
                      <span style={{ fontSize: 11, color: textInput.length > MAX_CHARS * 0.9 ? "rgba(255,180,80,0.7)" : "rgba(255,255,255,0.2)" }}>
                        {textInput.length} / {MAX_CHARS}
                      </span>
                    </div>
                  </div>
                </AnimBorderCard>
              </motion.div>
            )}

            {/* Tab 3: Generate */}
            {tab === "generate" && (
              <motion.div key="generate" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <AnimBorderCard speed={5} color="rgba(255,255,255,0.4)" radius={14}>
                  <div style={{ padding: "14px 16px 12px" }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 10 }}>
                      <Sparkles style={{ width: 14, height: 14, color: "rgba(255,255,255,0.35)", flexShrink: 0, marginTop: 2 }} />
                      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.32)", lineHeight: 1.6, margin: 0 }}>
                        Mô tả nội dung bạn muốn — AI sẽ tạo và định dạng hoàn chỉnh
                      </p>
                    </div>
                    <textarea
                      value={genPrompt}
                      onChange={e => setGenPrompt(e.target.value)}
                      placeholder="VD: Tạo 20 câu hỏi trắc nghiệm Lịch sử lớp 12 về chiến tranh Việt Nam..."
                      rows={5}
                      style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: "rgba(255,255,255,0.82)", fontSize: 13.5, lineHeight: 1.75, resize: "vertical", padding: "0 0 4px", fontFamily: FONT, caretColor: "rgba(255,255,255,0.7)", boxSizing: "border-box" }}
                    />
                  </div>
                </AnimBorderCard>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 10 }}>
                  {["20 câu trắc nghiệm Toán lớp 10", "Báo cáo tổng kết tháng", "Kế hoạch học tập 1 tuần", "Outline bài thuyết trình"].map(hint => (
                    <button key={hint} onClick={() => setGenPrompt(hint)}
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

        {/* Submit button */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} style={{ marginBottom: 28 }}>
          <AnimBorderCard speed={canSubmit ? 3 : 8} color={canSubmit ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.15)"} radius={14}>
            <button onClick={handleSubmit} disabled={!canSubmit}
              style={{ width: "100%", padding: "15px", background: "transparent", border: "none", cursor: canSubmit ? "pointer" : "not-allowed", color: canSubmit ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.22)", fontSize: 14, fontWeight: 700, fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {loading ? (
                <><Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> Đang xử lý...</>
              ) : tab === "generate" ? (
                <><Sparkles style={{ width: 16, height: 16 }} /> Tạo &amp; Định dạng</>
              ) : (
                <><FileText style={{ width: 16, height: 16 }} /> Định dạng ngay</>
              )}
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
                    {loading ? "Đang tạo..." : "Kết quả"}
                  </span>
                </div>

                {result && !loading && (
                  <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
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
              <AnimBorderCard speed={loading ? 2 : 9} color={loading ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.15)"} radius={14} innerStyle={{ padding: "18px 20px", maxHeight: 560, overflowY: "auto" }}>
                {result ? (
                  <RenderOutput text={result} />
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
