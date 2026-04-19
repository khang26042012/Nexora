import { Navigation } from "@/components/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Copy, Loader2, Calculator, CheckCircle2, AlertCircle, X, Image as ImageIcon, Type } from "lucide-react";
import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { ToolVideoBg } from "@/components/ToolVideoBg";

const FONT = "'Plus Jakarta Sans', sans-serif";
const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

function AnimBorderCard({ children, speed = 4, color = "rgba(255,255,255,0.85)", radius = 16, innerStyle = {}, className = "" }: {
  children: React.ReactNode; speed?: number; color?: string; radius?: number; innerStyle?: React.CSSProperties; className?: string;
}) {
  return (
    <div className={`running-border ${className}`} style={{ "--rb-speed": `${speed}s`, "--rb-color": color, "--rb-radius": `${radius}px`, background: "rgba(255,255,255,0.04)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", ...innerStyle } as React.CSSProperties}>
      {children}
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let last = 0, match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(<strong key={match.index} style={{ fontWeight: 700, color: "rgba(255,255,255,0.95)" }}>{match[1]}</strong>);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

function RenderOutput({ text }: { text: string }) {
  return (
    <div style={{ fontFamily: FONT, fontSize: 14, lineHeight: 1.9, color: "rgba(255,255,255,0.82)" }}>
      {text.split("\n").map((line, i) => {
        if (/^---+$/.test(line.trim())) return <div key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.1)", margin: "14px 0" }} />;
        if (!line.trim()) return <div key={i} style={{ height: 6 }} />;
        if (/^\s*-\s/.test(line)) return (
          <div key={i} style={{ display: "flex", gap: 8, paddingLeft: 8, marginTop: 2 }}>
            <span style={{ color: "rgba(255,255,255,0.4)", flexShrink: 0 }}>–</span>
            <span>{renderInline(line.replace(/^\s*-\s/, ""))}</span>
          </div>
        );
        // Numbered steps highlight
        if (/^(Bước \d+|Step \d+):/.test(line)) return (
          <div key={i} style={{ marginTop: 10, paddingLeft: 0, fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>{renderInline(line)}</div>
        );
        return <div key={i} style={{ marginTop: 2 }}>{renderInline(line)}</div>;
      })}
    </div>
  );
}

type InputMode = "text" | "image";

export function AIMathSolver() {
  const [, navigate] = useLocation();
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [text, setText] = useState("");
  const [image, setImage] = useState("");
  const [imgPreview, setImgPreview] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  function handleImage(f: File) {
    if (!f.type.startsWith("image/")) { setError("Chỉ chấp nhận file ảnh"); return; }
    if (f.size > 15 * 1024 * 1024) { setError("Ảnh quá lớn — tối đa 15MB"); return; }
    setError("");
    const reader = new FileReader();
    reader.onload = e => { const b64 = e.target?.result as string; setImage(b64); setImgPreview(b64); };
    reader.readAsDataURL(f);
  }

  const solve = useCallback(async () => {
    if (loading) return;
    if (inputMode === "text" && !text.trim()) return;
    if (inputMode === "image" && !image) return;
    abortRef.current?.abort();
    const ctrl = new AbortController(); abortRef.current = ctrl;
    setLoading(true); setResult(""); setError("");
    try {
      const body: Record<string, string> = {};
      if (inputMode === "text") body.text = text;
      else { body.image = image; if (text.trim()) body.text = text; }

      const res = await fetch(`${BASE}/api/math-solve`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body), signal: ctrl.signal,
      });
      if (!res.ok || !res.body) { setError("Lỗi server"); setLoading(false); return; }
      const reader = res.body.getReader(); const decoder = new TextDecoder(); let buf = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const raw = line.slice(5).trim(); if (raw === "[DONE]") { setLoading(false); return; }
          try { const d = JSON.parse(raw); if (d.error) { setError(d.error); setLoading(false); return; } if (d.text) setResult(p => p + d.text); } catch { /* skip */ }
        }
      }
    } catch (e: unknown) { if ((e as Error).name !== "AbortError") setError("Mất kết nối"); }
    finally { setLoading(false); }
  }, [text, image, inputMode, loading]);

  async function copy() {
    if (!result) return;
    await navigator.clipboard.writeText(result).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  function reset() { setText(""); setImage(""); setImgPreview(""); setResult(""); setError(""); }

  return (
    <div className="min-h-screen" style={{ background: "#050505", fontFamily: FONT }}>
      <ToolVideoBg />
      <Navigation />
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[60vw] h-[40vw] rounded-full" style={{ background: "radial-gradient(ellipse, rgba(255,255,255,0.03) 0%, transparent 70%)" }} />
      </div>
      <div className="relative max-w-2xl mx-auto px-5 pt-28 pb-20" style={{ zIndex: 1 }}>
        <motion.button initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} onClick={() => navigate("/tool")}
          className="flex items-center gap-2 mb-8 text-sm" style={{ color: "rgba(255,255,255,0.35)" }}
          whileHover={{ color: "rgba(255,255,255,0.7)" }}>
          <ArrowLeft size={15} /> Quay lại Tool
        </motion.button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)" }}>
              <Calculator size={20} style={{ color: "rgba(255,255,255,0.8)" }} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Math Solver</h1>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.38)" }}>Giải toán từng bước bằng AI — nhập đề bài hoặc chụp ảnh bài toán</p>
            </div>
          </div>
        </motion.div>

        {/* Mode toggle */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="mb-4">
          <AnimBorderCard speed={8} color="rgba(255,255,255,0.35)" radius={14} innerStyle={{ padding: "0.5rem" }} className="inline-flex">
            <button onClick={() => setInputMode("text")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ background: inputMode === "text" ? "rgba(255,255,255,0.12)" : "transparent", color: inputMode === "text" ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)" }}>
              <Type size={14} /> Nhập đề
            </button>
            <button onClick={() => setInputMode("image")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ background: inputMode === "image" ? "rgba(255,255,255,0.12)" : "transparent", color: inputMode === "image" ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)" }}>
              <ImageIcon size={14} /> Ảnh đề bài
            </button>
          </AnimBorderCard>
        </motion.div>

        {/* Input */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="mb-4 space-y-3">
          {inputMode === "text" ? (
            <AnimBorderCard speed={5} color="rgba(255,255,255,0.6)" radius={16} innerStyle={{ padding: "1rem" }}>
              <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Nhập đề bài toán... (VD: Giải phương trình x² - 5x + 6 = 0)" rows={5}
                className="w-full resize-none text-sm text-white/80 outline-none"
                style={{ background: "transparent", fontFamily: FONT, caretColor: "rgba(255,255,255,0.7)" }} />
              {text && <div className="flex justify-end mt-1"><button onClick={reset} className="text-xs flex items-center gap-1" style={{ color: "rgba(255,255,255,0.3)" }}><X size={11} /> Xoá</button></div>}
            </AnimBorderCard>
          ) : (
            <AnimBorderCard speed={5} color={dragging ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.6)"} radius={16} innerStyle={{ padding: "1rem" }}>
              {!imgPreview ? (
                <div
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleImage(f); }}
                  onClick={() => fileRef.current?.click()}
                  className="flex flex-col items-center gap-3 py-10 cursor-pointer rounded-xl"
                  style={{ border: "1px dashed rgba(255,255,255,0.15)" }}>
                  <ImageIcon size={28} style={{ color: "rgba(255,255,255,0.3)" }} />
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Kéo thả hoặc nhấn để chọn ảnh đề bài</p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>JPG, PNG, WebP — tối đa 15MB</p>
                </div>
              ) : (
                <div className="relative">
                  <img src={imgPreview} alt="Đề bài" className="w-full rounded-xl max-h-64 object-contain" style={{ background: "rgba(255,255,255,0.05)" }} />
                  <button onClick={() => { setImage(""); setImgPreview(""); }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.2)" }}>
                    <X size={13} className="text-white" />
                  </button>
                </div>
              )}
              {/* Optional text hint when image mode */}
              {imgPreview && (
                <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Ghi chú thêm cho đề bài (không bắt buộc)..." rows={2}
                  className="w-full resize-none text-sm text-white/60 outline-none mt-3"
                  style={{ background: "transparent", fontFamily: FONT, caretColor: "rgba(255,255,255,0.5)" }} />
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImage(f); }} />
            </AnimBorderCard>
          )}
        </motion.div>

        {error && <div className="flex items-center gap-2 text-red-400 text-sm mb-3"><AlertCircle size={14} />{error}</div>}

        <motion.button initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
          onClick={solve} disabled={(inputMode === "text" ? !text.trim() : !image) || loading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white mb-6 transition-all disabled:opacity-40"
          style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)" }}>
          {loading ? <><Loader2 size={15} className="animate-spin" /> Đang giải...</> : <><Calculator size={15} /> Giải toán</>}
        </motion.button>

        {(result || loading) && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <AnimBorderCard speed={4} color="rgba(255,255,255,0.75)" radius={18} innerStyle={{ padding: "1.25rem" }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>Lời giải từng bước</span>
                {result && (
                  <button onClick={copy} className="flex items-center gap-1.5 text-xs" style={{ color: copied ? "rgba(34,197,94,0.9)" : "rgba(255,255,255,0.4)" }}>
                    {copied ? <CheckCircle2 size={13} /> : <Copy size={13} />} {copied ? "Đã sao chép" : "Sao chép"}
                  </button>
                )}
              </div>
              {loading && !result && <div className="flex items-center gap-2 text-sm py-4" style={{ color: "rgba(255,255,255,0.35)" }}><Loader2 size={14} className="animate-spin" /> AI đang giải bài toán...</div>}
              {result && <RenderOutput text={result} />}
              {loading && result && <span className="inline-block w-0.5 h-4 ml-0.5 bg-white/50 animate-pulse align-middle" />}
            </AnimBorderCard>
          </motion.div>
        )}
      </div>
    </div>
  );
}
