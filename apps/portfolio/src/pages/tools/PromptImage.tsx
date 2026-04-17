import { Navigation } from "@/components/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Copy, CheckCircle2, AlertCircle, ImageIcon, Upload, X, Settings2 } from "lucide-react";
import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";

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
  const combined = /`([^`]+)`|\*\*(.+?)\*\*/g;
  let last = 0; let match: RegExpExecArray | null;
  while ((match = combined.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[1] !== undefined) {
      parts.push(<code key={match.index} style={{ fontFamily: "monospace", fontSize: 12, background: "rgba(255,255,255,0.1)", padding: "1px 5px", borderRadius: 4, color: "rgba(255,255,255,0.85)" }}>{match[1]}</code>);
    } else {
      parts.push(<strong key={match.index} style={{ fontWeight: 700, color: "rgba(255,255,255,0.95)" }}>{match[2]}</strong>);
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

function RenderOutput({ text }: { text: string }) {
  return (
    <div style={{ fontFamily: FONT, fontSize: 14, lineHeight: 1.85, color: "rgba(255,255,255,0.82)" }}>
      {text.split("\n").map((line, i) => {
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

const STYLES = [
  { id: "general", label: "🎨 Tổng hợp" },
  { id: "photorealistic", label: "📷 Photorealistic" },
  { id: "anime", label: "🌸 Anime / Manga" },
  { id: "digital art", label: "🖌️ Digital Art" },
  { id: "3d render", label: "🧊 3D Render" },
  { id: "oil painting", label: "🎭 Oil Painting" },
];

export function PromptImage() {
  const [, navigate] = useLocation();
  const [imgFile, setImgFile] = useState<{ base64: string; mime: string; preview: string; name: string } | null>(null);
  const [style, setStyle] = useState("general");
  const [result, setResult] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<"all" | "prompt" | null>(null);
  const [dragging, setDragging] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadImage = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) { setError("Chỉ hỗ trợ file ảnh (JPG, PNG, WEBP, GIF)"); return; }
    if (file.size > 15 * 1024 * 1024) { setError("Ảnh tối đa 15MB"); return; }
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target?.result as string;
      const base64 = dataUrl.split(",")[1];
      setImgFile({ base64, mime: file.type, preview: dataUrl, name: file.name });
      setResult(""); setError("");
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) loadImage(file);
  }, [loadImage]);

  const analyze = useCallback(async () => {
    if (!imgFile || loading) return;
    abortRef.current?.abort();
    const ctrl = new AbortController(); abortRef.current = ctrl;
    setLoading(true); setResult(""); setError(""); setIsThinking(false);

    try {
      const res = await fetch(`${BASE}/api/prompt-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: imgFile.base64, mimeType: imgFile.mime, style }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) { setError("Lỗi server"); setLoading(false); return; }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const raw = line.slice(5).trim();
          if (raw === "[DONE]") { setLoading(false); setIsThinking(false); return; }
          try {
            const d = JSON.parse(raw) as { type?: string; active?: boolean; text?: string; error?: string };
            if (d.error) { setError(d.error); setLoading(false); return; }
            if (d.type === "thinking") { setIsThinking(d.active ?? false); continue; }
            if (d.text) setResult(p => p + d.text);
          } catch { /* skip */ }
        }
      }
    } catch (e: unknown) {
      if ((e as Error).name !== "AbortError") setError("Mất kết nối");
    } finally {
      setLoading(false); setIsThinking(false);
    }
  }, [imgFile, style, loading]);

  // Extract just the main prompt block for quick copy
  const mainPrompt = (() => {
    const match = result.match(/\*\*🎯 MAIN PROMPT\*\*\s*\n+([\s\S]+?)(?:\n+---|\n+\*\*📐|$)/);
    return match?.[1]?.trim() ?? "";
  })();

  async function copy(text: string, key: "all" | "prompt") {
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(key); setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="min-h-screen" style={{ background: "#050505", fontFamily: FONT }}>
      <Navigation />
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[60vw] h-[40vw] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(255,255,255,0.03) 0%, transparent 70%)" }} />
      </div>

      <div className="relative max-w-2xl mx-auto px-5 pt-28 pb-20" style={{ zIndex: 1 }}>
        <motion.button initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate("/tool")} className="flex items-center gap-2 mb-8 text-sm"
          style={{ color: "rgba(255,255,255,0.35)" }} whileHover={{ color: "rgba(255,255,255,0.7)" }}>
          <ArrowLeft size={15} /> Quay lại Tool
        </motion.button>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)" }}>
              <ImageIcon size={20} style={{ color: "rgba(255,255,255,0.8)" }} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Prompt Image</h1>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.38)" }}>Upload ảnh — AI suy nghĩ sâu và viết prompt tái tạo ảnh với độ giống 98–100%</p>
            </div>
          </div>
        </motion.div>

        {/* Style selector */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }} className="mb-4">
          <AnimBorderCard speed={7} color="rgba(255,255,255,0.4)" radius={14} innerStyle={{ padding: "0.75rem 1rem" }}>
            <label className="text-xs font-semibold block mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>Phong cách tái tạo</label>
            <div className="flex flex-wrap gap-1.5">
              {STYLES.map(s => (
                <button key={s.id} onClick={() => setStyle(s.id)}
                  className="px-3 py-1 rounded-lg text-xs font-medium transition-all border"
                  style={{
                    background: style === s.id ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
                    borderColor: style === s.id ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.08)",
                    color: style === s.id ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)",
                  }}>
                  {s.label}
                </button>
              ))}
            </div>
          </AnimBorderCard>
        </motion.div>

        {/* Upload zone */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-4">
          <input ref={inputRef} type="file" accept="image/*" className="hidden"
            onChange={e => e.target.files?.[0] && loadImage(e.target.files[0])} />

          {!imgFile ? (
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className="cursor-pointer"
            >
              <AnimBorderCard speed={dragging ? 2 : 6} color={dragging ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.35)"} radius={16}
                innerStyle={{ padding: "2.5rem 1.5rem", textAlign: "center" }}>
                <motion.div animate={{ scale: dragging ? 1.05 : 1 }} transition={{ type: "spring", stiffness: 300 }}>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
                    <Upload size={24} style={{ color: "rgba(255,255,255,0.5)" }} />
                  </div>
                  <p className="text-sm font-semibold mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>
                    {dragging ? "Thả ảnh vào đây" : "Kéo thả hoặc click để chọn ảnh"}
                  </p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>JPG, PNG, WEBP, GIF · Tối đa 15MB</p>
                </motion.div>
              </AnimBorderCard>
            </div>
          ) : (
            <AnimBorderCard speed={5} color="rgba(255,255,255,0.55)" radius={16} innerStyle={{ padding: "1rem" }}>
              <div className="flex items-start gap-3">
                <div className="relative flex-shrink-0 cursor-pointer group" onClick={() => inputRef.current?.click()}>
                  <img src={imgFile.preview} alt="preview"
                    className="rounded-xl object-cover"
                    style={{ width: 96, height: 96, border: "1px solid rgba(255,255,255,0.1)" }} />
                  <div className="absolute inset-0 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: "rgba(0,0,0,0.5)" }}>
                    <Upload size={18} style={{ color: "rgba(255,255,255,0.8)" }} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white/80 truncate mb-0.5">{imgFile.name}</p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{imgFile.mime}</p>
                  <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.25)" }}>Click ảnh để đổi</p>
                </div>
                <button onClick={() => { setImgFile(null); setResult(""); }}
                  className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.8)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}>
                  <X size={14} />
                </button>
              </div>
            </AnimBorderCard>
          )}
        </motion.div>

        {/* Analyze button */}
        <motion.button initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
          onClick={analyze} disabled={!imgFile || loading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white mb-6 transition-all disabled:opacity-40"
          style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)" }}
          whileHover={imgFile && !loading ? { background: "rgba(255,255,255,0.15)" } : {}}
          whileTap={imgFile && !loading ? { scale: 0.98 } : {}}>
          {loading
            ? isThinking
              ? <><Settings2 size={15} className="animate-spin" style={{ animationDuration: "2s" }} /> <span style={{ animation: "pulse 1.5s ease-in-out infinite" }}>⚙️ Đang suy nghĩ sâu...</span></>
              : <><Settings2 size={15} className="animate-spin" /> Đang tạo prompt...</>
            : <><ImageIcon size={15} /> Phân tích & Tạo prompt</>
          }
        </motion.button>

        {error && <div className="flex items-center gap-2 text-red-400 text-sm mb-4"><AlertCircle size={14} />{error}</div>}

        {/* Result */}
        <AnimatePresence>
          {(result || (loading && isThinking)) && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {/* Quick copy main prompt */}
              {mainPrompt && (
                <div className="mb-3">
                  <AnimBorderCard speed={3} color="rgba(255,255,255,0.9)" radius={14}
                    innerStyle={{ padding: "1rem" }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.6)" }}>🎯 MAIN PROMPT — Dán thẳng vào AI</span>
                      <button onClick={() => copy(mainPrompt, "prompt")}
                        className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-all"
                        style={{ color: copied === "prompt" ? "rgba(34,197,94,0.9)" : "rgba(255,255,255,0.6)", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>
                        {copied === "prompt" ? <><CheckCircle2 size={12} /> Đã copy!</> : <><Copy size={12} /> Copy prompt</>}
                      </button>
                    </div>
                    <p className="text-sm font-mono leading-relaxed" style={{ color: "rgba(255,255,255,0.75)", background: "rgba(255,255,255,0.04)", padding: "10px 12px", borderRadius: 8, userSelect: "text" }}>
                      {mainPrompt}
                    </p>
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {["Midjourney", "DALL-E 3", "Stable Diffusion", "Flux"].map(p => (
                        <span key={p} className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                          style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.1)" }}>
                          {p}
                        </span>
                      ))}
                    </div>
                  </AnimBorderCard>
                </div>
              )}

              {/* Full analysis */}
              <AnimBorderCard speed={4} color="rgba(255,255,255,0.6)" radius={18} innerStyle={{ padding: "1.25rem" }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>Phân tích chi tiết</span>
                  {result && (
                    <button onClick={() => copy(result, "all")}
                      className="flex items-center gap-1.5 text-xs"
                      style={{ color: copied === "all" ? "rgba(34,197,94,0.9)" : "rgba(255,255,255,0.4)" }}>
                      {copied === "all" ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                      {copied === "all" ? "Đã copy" : "Copy tất cả"}
                    </button>
                  )}
                </div>

                {/* Thinking state */}
                {loading && isThinking && !result && (
                  <div className="flex items-center gap-2.5 py-3">
                    <div className="flex gap-1">
                      {[0, 1, 2].map(i => (
                        <motion.div key={i} className="w-1.5 h-1.5 rounded-full"
                          style={{ background: "rgba(255,255,255,0.5)" }}
                          animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }} />
                      ))}
                    </div>
                    <span className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>⚙️ AI đang suy nghĩ sâu để phân tích ảnh...</span>
                  </div>
                )}

                {result && <RenderOutput text={result} />}
                {loading && result && <span className="inline-block w-0.5 h-4 ml-0.5 bg-white/50 animate-pulse align-middle" />}
              </AnimBorderCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
