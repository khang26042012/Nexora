import { Navigation } from "@/components/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Copy, Download, Loader2, Image as ImageIcon,
  Sparkles, CheckCircle2, AlertCircle, X, ChevronDown,
  Pencil, Eye, ScanText,
} from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";
import { createWorker } from "tesseract.js";
import { ToolVideoBg } from "@/components/ToolVideoBg";

const FONT = "'Plus Jakarta Sans', sans-serif";
const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp"];
const ACCEPTED_EXT  = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"];
const MAX_SIZE_MB   = 10;

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

/* ── Render inline bold ── */
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

/* ── Render output ── */
function RenderOutput({ text }: { text: string }) {
  return (
    <div style={{ fontFamily: FONT, fontSize: 14, lineHeight: 1.85, color: "rgba(255,255,255,0.82)" }}>
      {text.split("\n").map((line, i) => {
        const c = line.match(/^\[C\](.*?)\[\/C\]$/);
        if (c) return (
          <div key={i} style={{ textAlign: "center", fontWeight: 800, fontSize: 15.5, color: "rgba(255,255,255,0.97)", marginTop: 18, marginBottom: 6 }}>{c[1].trim()}</div>
        );
        if (/^---+$/.test(line.trim())) return <div key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.1)", margin: "14px 0" }} />;
        if (!line.trim()) return <div key={i} style={{ height: 6 }} />;
        if (/^\s*-\s/.test(line)) return (
          <div key={i} style={{ display: "flex", gap: 8, paddingLeft: 8, marginTop: 2 }}>
            <span style={{ color: "rgba(255,255,255,0.4)", flexShrink: 0, marginTop: 1 }}>–</span>
            <span>{renderInline(line.replace(/^\s*-\s/, ""))}</span>
          </div>
        );
        return <div key={i} style={{ marginTop: 2 }}>{renderInline(line)}</div>;
      })}
    </div>
  );
}

/* ── Download helpers ── */
function rawToHtml(raw: string): string {
  const body = raw.split("\n").map(line => {
    const c = line.match(/^\[C\](.*?)\[\/C\]$/);
    if (c) return `<h1 style="text-align:center">${c[1].trim()}</h1>`;
    if (/^---+$/.test(line.trim())) return `<hr/>`;
    if (!line.trim()) return `<br/>`;
    if (/^\s*-\s/.test(line)) return `<li>${line.replace(/^\s*-\s/, "")}</li>`;
    return `<p>${line.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")}</p>`;
  }).join("\n");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>body{font-family:'Segoe UI',sans-serif;line-height:1.8;max-width:800px;margin:40px auto;padding:0 24px}</style></head><body>${body}</body></html>`;
}
function rawToMarkdown(raw: string): string {
  return raw.replace(/^\[C\](.*?)\[\/C\]$/gm, (_, t) => `# ${t.trim()}`);
}
function rawToJson(raw: string): string {
  return JSON.stringify({ content: raw, extractedAt: new Date().toISOString(), tool: "NexoraTool Image to Text" }, null, 2);
}
async function rawToDocx(raw: string): Promise<Blob> {
  function parseRuns(text: string) {
    const runs: InstanceType<typeof TextRun>[] = [];
    const regex = /\*\*(.+?)\*\*/g;
    let last = 0, match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > last) runs.push(new TextRun({ text: text.slice(last, match.index), size: 24 }));
      runs.push(new TextRun({ text: match[1], bold: true, size: 24 }));
      last = match.index + match[0].length;
    }
    if (last < text.length) runs.push(new TextRun({ text: text.slice(last), size: 24 }));
    return runs.length ? runs : [new TextRun({ text, size: 24 })];
  }
  const paragraphs = raw.split("\n").map(line => {
    const c = line.match(/^\[C\](.*?)\[\/C\]$/);
    if (c) return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 240, after: 120 }, children: [new TextRun({ text: c[1].trim(), bold: true, size: 32 })] });
    if (/^---+$/.test(line.trim())) return new Paragraph({ border: { bottom: { style: "single" as const, size: 6, color: "CCCCCC", space: 4 } }, spacing: { before: 120, after: 120 }, children: [new TextRun({ text: "" })] });
    if (!line.trim()) return new Paragraph({ children: [new TextRun({ text: "" })] });
    if (/^\s*-\s/.test(line)) return new Paragraph({ bullet: { level: 0 }, spacing: { before: 40 }, children: parseRuns(line.replace(/^\s*-\s/, "")) });
    return new Paragraph({ spacing: { before: 40 }, children: parseRuns(line) });
  });
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

/* ── Stream format helper (text mode) ── */
async function streamFormat(
  rawText: string,
  onChunk: (chunk: string) => void
): Promise<void> {
  const res = await fetch("/api/format", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "text", content: rawText }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
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

/* ── Main component ── */
export function ImageToText() {
  const [, navigate] = useLocation();

  type ImageInfo = { file: File; previewUrl: string };
  const [image, setImage]     = useState<ImageInfo | null>(null);
  const [result, setResult]   = useState("");
  const [rawResult, setRawResult] = useState("");

  type Phase = "idle" | "ocr" | "format" | "done";
  const [phase, setPhase]     = useState<Phase>("idle");
  const [ocrProgress, setOcrProgress] = useState(0);
  const [error, setError]     = useState<string | null>(null);
  const [copied, setCopied]   = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showDlMenu, setShowDlMenu] = useState(false);
  const [isEditing, setIsEditing]   = useState(false);
  const [editText, setEditText]     = useState("");

  const fileRef   = useRef<HTMLInputElement>(null);
  const dlMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showDlMenu) return;
    const handler = (e: MouseEvent) => {
      if (dlMenuRef.current && !dlMenuRef.current.contains(e.target as Node)) setShowDlMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDlMenu]);

  useEffect(() => {
    return () => { if (image?.previewUrl) URL.revokeObjectURL(image.previewUrl); };
  }, [image]);

  const readImage = useCallback((f: File) => {
    setError(null);
    const name = f.name.toLowerCase();
    const isImg = ACCEPTED_MIME.includes(f.type) || ACCEPTED_EXT.some(e => name.endsWith(e));
    if (!isImg) { setError("Chỉ hỗ trợ ảnh: JPG, PNG, WEBP, GIF, BMP."); return; }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) { setError(`Ảnh quá lớn. Tối đa ${MAX_SIZE_MB}MB.`); return; }
    const previewUrl = URL.createObjectURL(f);
    setImage({ file: f, previewUrl });
    setResult(""); setRawResult(""); setEditText(""); setIsEditing(false); setPhase("idle");
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) readImage(f);
  }, [readImage]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) readImage(f);
    e.target.value = "";
  }, [readImage]);

  const handleEditChange = (val: string) => {
    setEditText(val); setRawResult(val); setResult(val);
  };

  const handleSubmit = async () => {
    if (!image) return;
    setError(null); setResult(""); setRawResult(""); setEditText("");
    setIsEditing(false); setOcrProgress(0); setPhase("ocr");

    try {
      /* ── Phase 1: Tesseract OCR ── */
      const worker = await createWorker("vie+eng", 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") {
            setOcrProgress(Math.round(m.progress * 100));
          }
        },
      });

      const { data: { text } } = await worker.recognize(image.file);
      await worker.terminate();

      const cleanRaw = text.trim();
      if (!cleanRaw) {
        setError("Không tìm thấy văn bản trong ảnh.");
        setPhase("idle");
        return;
      }

      /* ── Phase 2: AI format via /api/format (text mode) ── */
      setPhase("format");
      let formatted = "";
      try {
        await streamFormat(cleanRaw, (chunk) => {
          formatted += chunk;
          setResult(formatted);
          setRawResult(formatted);
        });
      } catch {
        // Nếu format fail → dùng text thô
        formatted = cleanRaw;
        setResult(cleanRaw);
        setRawResult(cleanRaw);
      }

      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định");
      setPhase("idle");
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(rawResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async (fmt: DownloadFmt) => {
    setShowDlMenu(false);
    let blob: Blob;
    const filename = `ocr_${Date.now()}`;
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

  const loading  = phase === "ocr" || phase === "format";
  const canSubmit = !!image && !loading;

  const phaseLabel =
    phase === "ocr"    ? `Đang đọc ảnh... ${ocrProgress}%` :
    phase === "format" ? "Đang định dạng văn bản..." : "";

  return (
    <div style={{ minHeight: "100dvh", background: "#050505", fontFamily: FONT }}>
      <ToolVideoBg />
      <Navigation />

      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <motion.div animate={{ scale: [1,1.2,1], opacity: [0.2,0.35,0.2] }} transition={{ duration: 18, repeat: Infinity }}
          className="absolute top-[-15%] right-[-5%] w-[50vw] h-[50vw] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(255,255,255,0.04) 0%, transparent 70%)" }} />
        <motion.div animate={{ scale: [1,1.15,1], opacity: [0.12,0.25,0.12] }} transition={{ duration: 14, repeat: Infinity, delay: 5 }}
          className="absolute bottom-[-10%] left-[-5%] w-[40vw] h-[40vw] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(255,255,255,0.03) 0%, transparent 70%)" }} />
      </div>

      <div className="relative max-w-2xl mx-auto px-4 pt-24 pb-20" style={{ zIndex: 1 }}>

        {/* Back */}
        <motion.button initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate("/tool")} whileHover={{ x: -3 }}
          style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 28, color: "rgba(255,255,255,0.35)", background: "none", border: "none", cursor: "pointer", fontFamily: FONT, fontSize: 13 }}>
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </motion.button>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", flexShrink: 0 }}>
              <ScanText className="w-5 h-5" style={{ color: "rgba(255,255,255,0.75)" }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "rgba(255,255,255,0.95)", margin: 0 }}>Image to Text</h1>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.32)", margin: 0, marginTop: 2 }}>Chuyển ảnh / scan tài liệu thành văn bản chỉnh sửa được</p>
            </div>
          </div>
        </motion.div>

        {/* Upload zone */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} style={{ marginBottom: 14 }}>
          <input ref={fileRef} type="file" accept={ACCEPTED_EXT.join(",")} style={{ display: "none" }} onChange={handleFileInput} />

          {!image ? (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              style={{ border: `2px dashed ${dragOver ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.11)"}`, borderRadius: 16, padding: "52px 20px", textAlign: "center", cursor: "pointer", background: dragOver ? "rgba(255,255,255,0.04)" : "transparent", transition: "all 0.2s" }}
            >
              <ImageIcon style={{ width: 36, height: 36, margin: "0 auto 14px", color: "rgba(255,255,255,0.18)" }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>Kéo thả ảnh hoặc click để chọn</p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.22)" }}>JPG · PNG · WEBP · GIF · BMP · tối đa {MAX_SIZE_MB}MB</p>
            </div>
          ) : (
            <AnimBorderCard speed={5} color="rgba(255,255,255,0.4)" radius={14}>
              <div style={{ display: "flex", gap: 14, padding: "14px 16px", alignItems: "flex-start" }}>
                <div style={{ width: 72, height: 72, borderRadius: 10, overflow: "hidden", flexShrink: 0, border: "1px solid rgba(255,255,255,0.1)" }}>
                  <img src={image.previewUrl} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.8)", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{image.file.name}</p>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>{(image.file.size / 1024).toFixed(1)} KB</p>
                  <button onClick={() => fileRef.current?.click()}
                    style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontFamily: FONT }}>
                    Đổi ảnh
                  </button>
                </div>
                <button onClick={() => setImage(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, flexShrink: 0 }}>
                  <X style={{ width: 16, height: 16, color: "rgba(255,255,255,0.3)" }} />
                </button>
              </div>
            </AnimBorderCard>
          )}
        </motion.div>

        {/* Tags */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {["Ảnh chụp tài liệu", "Scan trang sách", "Ảnh bảng trắng", "Chữ viết tay", "Đề thi photo"].map(hint => (
              <span key={hint} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.02)" }}>{hint}</span>
            ))}
          </div>
        </motion.div>

        {/* OCR progress bar */}
        <AnimatePresence>
          {phase === "ocr" && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ marginBottom: 12 }}>
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 8, overflow: "hidden", height: 6, marginBottom: 6 }}>
                <motion.div
                  style={{ height: "100%", background: "rgba(255,255,255,0.5)", borderRadius: 8 }}
                  animate={{ width: `${ocrProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textAlign: "right" }}>{ocrProgress}%</p>
            </motion.div>
          )}
        </AnimatePresence>

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
                ? <><Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> {phaseLabel}</>
                : <><Sparkles style={{ width: 16, height: 16 }} /> Trích xuất văn bản</>
              }
            </button>
          </AnimBorderCard>
        </motion.div>

        {/* Output */}
        <AnimatePresence>
          {(result || phase === "format") && (
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

              {/* Output header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  {phase === "format"
                    ? <Loader2 style={{ width: 13, height: 13, color: "rgba(255,255,255,0.4)" }} className="animate-spin" />
                    : <CheckCircle2 style={{ width: 13, height: 13, color: "rgba(100,220,150,0.75)" }} />}
                  <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.38)" }}>
                    {phase === "format" ? "Đang định dạng..." : "Kết quả"}
                  </span>
                </div>

                {result && phase === "done" && (
                  <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                    <button onClick={() => { if (!isEditing) setEditText(rawResult); setIsEditing(v => !v); }}
                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, border: `1px solid ${isEditing ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.11)"}`, background: isEditing ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)", color: isEditing ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: FONT, transition: "all 0.15s" }}>
                      {isEditing ? <Eye style={{ width: 13, height: 13 }} /> : <Pencil style={{ width: 13, height: 13 }} />}
                      {isEditing ? "Xem trước" : "Chỉnh sửa"}
                    </button>

                    <button onClick={handleCopy}
                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.11)", background: "rgba(255,255,255,0.03)", color: copied ? "rgba(100,220,150,0.9)" : "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>
                      {copied ? <CheckCircle2 style={{ width: 13, height: 13 }} /> : <Copy style={{ width: 13, height: 13 }} />}
                      {copied ? "Đã copy" : "Copy"}
                    </button>

                    <div ref={dlMenuRef} style={{ position: "relative" }}>
                      <button onClick={() => setShowDlMenu(v => !v)}
                        style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.11)", background: showDlMenu ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: FONT, transition: "background 0.15s" }}>
                        <Download style={{ width: 13, height: 13 }} /> Tải về
                        <ChevronDown style={{ width: 11, height: 11, transition: "transform 0.2s", transform: showDlMenu ? "rotate(180deg)" : "rotate(0deg)" }} />
                      </button>
                      <AnimatePresence>
                        {showDlMenu && (
                          <motion.div initial={{ opacity: 0, y: -4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.97 }} transition={{ duration: 0.12 }}
                            style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: "rgba(18,18,18,0.97)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, overflow: "hidden", zIndex: 50, minWidth: 210, backdropFilter: "blur(12px)" }}>
                            {DOWNLOAD_FORMATS.map(fmt => (
                              <button key={fmt.id} onClick={() => handleDownload(fmt.id)}
                                style={{ width: "100%", display: "block", textAlign: "left", padding: "10px 16px", background: "none", border: "none", color: "rgba(255,255,255,0.65)", fontSize: 12, fontFamily: FONT, cursor: "pointer", fontWeight: 500 }}
                                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                                onMouseLeave={e => (e.currentTarget.style.background = "none")}>
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
                speed={phase === "format" ? 2 : isEditing ? 4 : 9}
                color={phase === "format" ? "rgba(255,255,255,0.45)" : isEditing ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.15)"}
                radius={14}
                innerStyle={isEditing ? { padding: "4px" } : { padding: "18px 20px", maxHeight: 560, overflowY: "auto" }}
              >
                {isEditing ? (
                  <textarea value={editText} onChange={e => handleEditChange(e.target.value)} spellCheck={false}
                    style={{ width: "100%", minHeight: 360, background: "transparent", border: "none", outline: "none", color: "rgba(255,255,255,0.82)", fontSize: 13, lineHeight: 1.75, resize: "vertical", padding: "16px 18px", fontFamily: "monospace", caretColor: "rgba(255,255,255,0.7)", boxSizing: "border-box" }} />
                ) : result ? (
                  <RenderOutput text={result} />
                ) : (
                  <div style={{ height: 40 }} />
                )}
                {phase === "format" && (
                  <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.55, repeat: Infinity }}
                    style={{ display: "inline-block", width: 2, height: "1em", background: "rgba(255,255,255,0.65)", verticalAlign: "text-bottom", marginLeft: 2 }} />
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
