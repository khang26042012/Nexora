import { Navigation } from "@/components/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Copy, Download, Loader2, FileText,
  Type, Sparkles, CheckCircle2, AlertCircle, X, Upload,
} from "lucide-react";
import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";

const FONT = "'Plus Jakarta Sans', sans-serif";
const MAX_CHARS = 2000;
const ACCEPTED = ".txt,.md,.doc,.docx,.csv,.json,.html,.xml";

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

  const [file, setFile]         = useState<{ name: string; size: number; content: string; mimeType: string } | null>(null);
  const [textInput, setTextInput] = useState("");
  const [genPrompt, setGenPrompt] = useState("");

  const [result, setResult]     = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [copied, setCopied]     = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  const readFile = useCallback(async (f: File) => {
    const isText = f.type.startsWith("text/") ||
      [".txt", ".md", ".csv", ".json", ".html", ".xml"].some(ext => f.name.endsWith(ext));

    if (isText) {
      const text = await f.text();
      setFile({ name: f.name, size: f.size, content: text, mimeType: "text/plain" });
    } else {
      const buf = await f.arrayBuffer();
      const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      const mime = f.type || "application/octet-stream";
      setFile({ name: f.name, size: f.size, content: b64, mimeType: mime });
    }
    setError(null);
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
  }, [readFile]);

  const handleSubmit = async () => {
    setError(null);
    setResult("");
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

      await streamFormat(payload, (chunk) => {
        setResult(prev => prev + chunk);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([result], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `formatted_${Date.now()}.txt`;
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
          animate={{ scale: [1, 1.2, 1], opacity: [0.25, 0.4, 0.25] }}
          transition={{ duration: 18, repeat: Infinity }}
          className="absolute top-[-15%] right-[-5%] w-[50vw] h-[50vw] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(255,255,255,0.04) 0%, transparent 70%)" }}
        />
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 14, repeat: Infinity, delay: 5 }}
          className="absolute bottom-[-10%] left-[-5%] w-[40vw] h-[40vw] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(255,255,255,0.03) 0%, transparent 70%)" }}
        />
      </div>

      <div className="relative max-w-2xl mx-auto px-4 pt-24 pb-20" style={{ zIndex: 1 }}>

        {/* Back */}
        <motion.button
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate("/tool")}
          whileHover={{ x: -3 }}
          className="flex items-center gap-2 mb-8 text-sm"
          style={{ color: "rgba(255,255,255,0.35)", background: "none", border: "none", cursor: "pointer", fontFamily: FONT }}
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại
        </motion.button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)" }}>
              <FileText className="w-5 h-5" style={{ color: "rgba(255,255,255,0.75)" }} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Text Formatter</h1>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>AI tự động căn chỉnh và định dạng văn bản</p>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-2 mb-6"
        >
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setResult(""); setError(null); }}
                style={{
                  flex: 1,
                  padding: "10px 8px",
                  borderRadius: 12,
                  border: active ? "1px solid rgba(255,255,255,0.3)" : "1px solid rgba(255,255,255,0.08)",
                  background: active ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.02)",
                  color: active ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)",
                  fontSize: 12,
                  fontWeight: active ? 700 : 500,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  fontFamily: FONT,
                  transition: "all 0.2s",
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </motion.div>

        {/* Input area */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-4"
        >
          <AnimatePresence mode="wait">
            {/* Tab 1: Upload file */}
            {tab === "file" && (
              <motion.div key="file" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <input ref={fileRef} type="file" accept={ACCEPTED} className="hidden" onChange={handleFileInput} />

                {!file ? (
                  <div
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleFileDrop}
                    onClick={() => fileRef.current?.click()}
                    style={{
                      border: `2px dashed ${dragOver ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.12)"}`,
                      borderRadius: 16,
                      padding: "40px 20px",
                      textAlign: "center",
                      cursor: "pointer",
                      background: dragOver ? "rgba(255,255,255,0.04)" : "transparent",
                      transition: "all 0.2s",
                    }}
                  >
                    <Upload className="w-8 h-8 mx-auto mb-3" style={{ color: "rgba(255,255,255,0.25)" }} />
                    <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.55)" }}>
                      Kéo thả file vào đây hoặc click để chọn
                    </p>
                    <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>
                      Hỗ trợ: .txt .md .doc .docx .csv .json .html
                    </p>
                  </div>
                ) : (
                  <AnimBorderCard speed={5} color="rgba(255,255,255,0.4)" radius={14}>
                    <div className="flex items-center gap-3 p-4">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
                        <FileText className="w-5 h-5" style={{ color: "rgba(255,255,255,0.6)" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white/80 truncate">{file.name}</p>
                        <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <button
                        onClick={() => setFile(null)}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
                      >
                        <X className="w-4 h-4" style={{ color: "rgba(255,255,255,0.35)" }} />
                      </button>
                    </div>
                  </AnimBorderCard>
                )}
              </motion.div>
            )}

            {/* Tab 2: Manual text */}
            {tab === "text" && (
              <motion.div key="text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <AnimBorderCard speed={6} color="rgba(255,255,255,0.35)" radius={14}>
                  <div className="relative p-1">
                    <textarea
                      value={textInput}
                      onChange={e => setTextInput(e.target.value.slice(0, MAX_CHARS))}
                      placeholder="Dán hoặc nhập văn bản cần định dạng vào đây..."
                      rows={10}
                      style={{
                        width: "100%",
                        background: "transparent",
                        border: "none",
                        outline: "none",
                        color: "rgba(255,255,255,0.8)",
                        fontSize: 13.5,
                        lineHeight: 1.7,
                        resize: "vertical",
                        padding: "12px 14px",
                        fontFamily: FONT,
                        caretColor: "rgba(255,255,255,0.7)",
                      }}
                    />
                    <div className="flex justify-end px-3 pb-2">
                      <span className="text-xs" style={{ color: textInput.length > MAX_CHARS * 0.9 ? "rgba(255,180,80,0.7)" : "rgba(255,255,255,0.2)" }}>
                        {textInput.length} / {MAX_CHARS}
                      </span>
                    </div>
                  </div>
                </AnimBorderCard>
              </motion.div>
            )}

            {/* Tab 3: Generate */}
            {tab === "generate" && (
              <motion.div key="generate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <AnimBorderCard speed={5} color="rgba(255,255,255,0.45)" radius={14}>
                  <div className="p-1">
                    <div className="flex items-start gap-2 px-3 pt-3 pb-1">
                      <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "rgba(255,255,255,0.4)" }} />
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)", lineHeight: 1.6 }}>
                        Mô tả nội dung bạn muốn tạo — AI sẽ viết và định dạng hoàn chỉnh
                      </p>
                    </div>
                    <textarea
                      value={genPrompt}
                      onChange={e => setGenPrompt(e.target.value)}
                      placeholder="VD: Tạo 20 câu hỏi trắc nghiệm Lịch sử lớp 12 về chiến tranh Việt Nam..."
                      rows={6}
                      style={{
                        width: "100%",
                        background: "transparent",
                        border: "none",
                        outline: "none",
                        color: "rgba(255,255,255,0.8)",
                        fontSize: 13.5,
                        lineHeight: 1.7,
                        resize: "vertical",
                        padding: "8px 14px 12px",
                        fontFamily: FONT,
                        caretColor: "rgba(255,255,255,0.7)",
                      }}
                    />
                  </div>
                </AnimBorderCard>

                {/* Example hints */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    "20 câu hỏi trắc nghiệm Toán lớp 10",
                    "Báo cáo tổng kết tháng",
                    "Kế hoạch học tập 1 tuần",
                    "Outline bài thuyết trình",
                  ].map(hint => (
                    <button
                      key={hint}
                      onClick={() => setGenPrompt(hint)}
                      style={{
                        padding: "5px 12px",
                        borderRadius: 20,
                        border: "1px solid rgba(255,255,255,0.1)",
                        background: "rgba(255,255,255,0.03)",
                        color: "rgba(255,255,255,0.4)",
                        fontSize: 11,
                        cursor: "pointer",
                        fontFamily: FONT,
                        transition: "all 0.15s",
                      }}
                    >
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
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 mb-4 px-4 py-3 rounded-xl"
              style={{ background: "rgba(255,60,60,0.07)", border: "1px solid rgba(255,60,60,0.18)" }}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(255,120,120,0.8)" }} />
              <span className="text-sm" style={{ color: "rgba(255,150,150,0.9)" }}>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit button */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <AnimBorderCard speed={canSubmit ? 3 : 8} color="rgba(255,255,255,0.6)" radius={14}>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              style={{
                width: "100%",
                padding: "14px",
                background: "transparent",
                border: "none",
                cursor: canSubmit ? "pointer" : "not-allowed",
                color: canSubmit ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.25)",
                fontSize: 14,
                fontWeight: 700,
                fontFamily: FONT,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Đang xử lý...</>
              ) : tab === "generate" ? (
                <><Sparkles className="w-4 h-4" /> Tạo & Định dạng</>
              ) : (
                <><FileText className="w-4 h-4" /> Định dạng ngay</>
              )}
            </button>
          </AnimBorderCard>
        </motion.div>

        {/* Output */}
        <AnimatePresence>
          {(result || (loading && result === "")) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {/* Output header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "rgba(255,255,255,0.4)" }} />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "rgba(100,220,150,0.7)" }} />
                  )}
                  <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {loading ? "Đang tạo..." : "Kết quả"}
                  </span>
                </div>
                {result && !loading && (
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopy}
                      style={{
                        display: "flex", alignItems: "center", gap: 5,
                        padding: "5px 12px", borderRadius: 8,
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: "rgba(255,255,255,0.04)",
                        color: copied ? "rgba(100,220,150,0.9)" : "rgba(255,255,255,0.5)",
                        fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: FONT,
                      }}
                    >
                      {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? "Đã copy" : "Copy"}
                    </button>
                    <button
                      onClick={handleDownload}
                      style={{
                        display: "flex", alignItems: "center", gap: 5,
                        padding: "5px 12px", borderRadius: 8,
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: "rgba(255,255,255,0.04)",
                        color: "rgba(255,255,255,0.5)",
                        fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: FONT,
                      }}
                    >
                      <Download className="w-3.5 h-3.5" />
                      Tải .txt
                    </button>
                  </div>
                )}
              </div>

              {/* Output content */}
              <AnimBorderCard speed={loading ? 2 : 8} color={loading ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.2)"} radius={14}>
                <pre
                  style={{
                    padding: "16px",
                    margin: 0,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    fontSize: 13,
                    lineHeight: 1.8,
                    color: "rgba(255,255,255,0.78)",
                    fontFamily: "'Courier New', monospace",
                    maxHeight: 520,
                    overflowY: "auto",
                    minHeight: 60,
                  }}
                >
                  {result}
                  {loading && (
                    <motion.span
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 0.6, repeat: Infinity }}
                      style={{ display: "inline-block", width: 2, height: "1em", background: "rgba(255,255,255,0.7)", verticalAlign: "text-bottom", marginLeft: 1 }}
                    />
                  )}
                </pre>
              </AnimBorderCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
