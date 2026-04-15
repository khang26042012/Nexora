import { Navigation } from "@/components/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Copy, Loader2, Languages, CheckCircle2, AlertCircle, X, ArrowRightLeft } from "lucide-react";
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
    <div style={{ fontFamily: FONT, fontSize: 14, lineHeight: 1.85, color: "rgba(255,255,255,0.82)" }}>
      {text.split("\n").map((line, i) => {
        if (/^---+$/.test(line.trim())) return <div key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.1)", margin: "12px 0" }} />;
        if (!line.trim()) return <div key={i} style={{ height: 6 }} />;
        return <div key={i} style={{ marginTop: 2 }}>{renderInline(line)}</div>;
      })}
    </div>
  );
}

const LANGS = [
  { id: "auto", label: "Tự động" },
  { id: "vi", label: "🇻🇳 Việt" },
  { id: "en", label: "🇺🇸 Anh" },
  { id: "zh", label: "🇨🇳 Trung" },
  { id: "ja", label: "🇯🇵 Nhật" },
  { id: "ko", label: "🇰🇷 Hàn" },
  { id: "fr", label: "🇫🇷 Pháp" },
  { id: "de", label: "🇩🇪 Đức" },
  { id: "es", label: "🇪🇸 Tây Ban Nha" },
  { id: "th", label: "🇹🇭 Thái" },
  { id: "ru", label: "🇷🇺 Nga" },
];

type Mode = "normal" | "formal" | "natural";
const MODES: { id: Mode; label: string; desc: string }[] = [
  { id: "normal", label: "Chuẩn", desc: "Trung tính, chuẩn mực" },
  { id: "formal", label: "Trang trọng", desc: "Lịch sự, văn phong công sở" },
  { id: "natural", label: "Tự nhiên", desc: "Như người bản ngữ" },
];

export function AITranslator() {
  const [, navigate] = useLocation();
  const [text, setText] = useState("");
  const [from, setFrom] = useState("auto");
  const [to, setTo] = useState("vi");
  const [mode, setMode] = useState<Mode>("normal");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  function swap() {
    if (from === "auto") return;
    const tmp = from; setFrom(to); setTo(tmp);
    setText(result); setResult("");
  }

  const translate = useCallback(async () => {
    if (!text.trim() || loading) return;
    abortRef.current?.abort();
    const ctrl = new AbortController(); abortRef.current = ctrl;
    setLoading(true); setResult(""); setError("");
    try {
      const res = await fetch(`${BASE}/api/translate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, from, to, mode }), signal: ctrl.signal,
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
  }, [text, from, to, mode, loading]);

  async function copy() {
    if (!result) return;
    await navigator.clipboard.writeText(result).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  const toLangs = LANGS.filter(l => l.id !== "auto");

  return (
    <div className="min-h-screen" style={{ background: "#050505", fontFamily: FONT }}>
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
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)" }}>
              <Languages size={20} style={{ color: "rgba(255,255,255,0.8)" }} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">AI Translator</h1>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.38)" }}>Dịch văn bản sang 10 ngôn ngữ — chọn phong cách và nhận ghi chú thuật ngữ</p>
            </div>
          </div>
        </motion.div>

        {/* Language picker */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <AnimBorderCard speed={7} color="rgba(255,255,255,0.4)" radius={16} innerStyle={{ padding: "1rem" }} className="mb-4">
            <div className="flex items-center gap-3">
              {/* From */}
              <div className="flex-1">
                <label className="text-xs font-semibold block mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>Từ ngôn ngữ</label>
                <select value={from} onChange={e => setFrom(e.target.value)}
                  className="w-full rounded-xl px-3 py-2 text-sm text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  {LANGS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                </select>
              </div>
              {/* Swap */}
              <button onClick={swap} disabled={from === "auto"} className="mt-5 p-2 rounded-xl transition-all disabled:opacity-30"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <ArrowRightLeft size={16} style={{ color: "rgba(255,255,255,0.6)" }} />
              </button>
              {/* To */}
              <div className="flex-1">
                <label className="text-xs font-semibold block mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>Sang ngôn ngữ</label>
                <select value={to} onChange={e => setTo(e.target.value)}
                  className="w-full rounded-xl px-3 py-2 text-sm text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  {toLangs.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                </select>
              </div>
            </div>
            {/* Mode */}
            <div className="mt-3 flex gap-2">
              {MODES.map(m => (
                <button key={m.id} onClick={() => setMode(m.id)} title={m.desc}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all border"
                  style={{ background: mode === m.id ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)", borderColor: mode === m.id ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.08)", color: mode === m.id ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)" }}>
                  {m.label}
                </button>
              ))}
            </div>
          </AnimBorderCard>
        </motion.div>

        {/* Input */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="mb-4">
          <AnimBorderCard speed={5} color="rgba(255,255,255,0.6)" radius={16} innerStyle={{ padding: "1rem" }}>
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Nhập văn bản cần dịch..." rows={6}
              className="w-full resize-none text-sm text-white/80 outline-none"
              style={{ background: "transparent", fontFamily: FONT, caretColor: "rgba(255,255,255,0.7)" }} />
            <div className="flex justify-between mt-2">
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>{text.length.toLocaleString()} ký tự</span>
              {text && <button onClick={() => { setText(""); setResult(""); }} className="text-xs flex items-center gap-1" style={{ color: "rgba(255,255,255,0.3)" }}><X size={11} /> Xoá</button>}
            </div>
          </AnimBorderCard>
        </motion.div>

        <motion.button initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
          onClick={translate} disabled={!text.trim() || loading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white mb-6 transition-all disabled:opacity-40"
          style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)" }}>
          {loading ? <><Loader2 size={15} className="animate-spin" /> Đang dịch...</> : <><Languages size={15} /> Dịch ngay</>}
        </motion.button>

        {error && <div className="flex items-center gap-2 text-red-400 text-sm mb-4"><AlertCircle size={14} />{error}</div>}
        {(result || loading) && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <AnimBorderCard speed={4} color="rgba(255,255,255,0.75)" radius={18} innerStyle={{ padding: "1.25rem" }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>Bản dịch</span>
                {result && (
                  <button onClick={copy} className="flex items-center gap-1.5 text-xs" style={{ color: copied ? "rgba(34,197,94,0.9)" : "rgba(255,255,255,0.4)" }}>
                    {copied ? <CheckCircle2 size={13} /> : <Copy size={13} />} {copied ? "Đã sao chép" : "Sao chép"}
                  </button>
                )}
              </div>
              {loading && !result && <div className="flex items-center gap-2 text-sm py-4" style={{ color: "rgba(255,255,255,0.35)" }}><Loader2 size={14} className="animate-spin" /> Đang dịch...</div>}
              {result && <RenderOutput text={result} />}
              {loading && result && <span className="inline-block w-0.5 h-4 ml-0.5 bg-white/50 animate-pulse align-middle" />}
            </AnimBorderCard>
          </motion.div>
        )}
      </div>
    </div>
  );
}
