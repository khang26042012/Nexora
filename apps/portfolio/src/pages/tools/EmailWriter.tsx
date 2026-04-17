import { Navigation } from "@/components/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Copy, Loader2, CheckCircle2, AlertCircle, Mail } from "lucide-react";
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

function RenderOutput({ text }: { text: string }) {
  return (
    <div style={{ fontFamily: FONT, fontSize: 14, lineHeight: 1.9, color: "rgba(255,255,255,0.82)", whiteSpace: "pre-wrap" }}>
      {text.split("\n").map((line, i) => {
        if (!line.trim()) return <div key={i} style={{ height: 8 }} />;
        if (line.startsWith("**Subject:**") || line.startsWith("**Tiêu đề:**")) {
          return (
            <div key={i} style={{ marginBottom: 12, padding: "8px 12px", background: "rgba(255,255,255,0.06)", borderRadius: 8, borderLeft: "2px solid rgba(255,255,255,0.3)" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Subject</span>
              <div style={{ fontWeight: 600, color: "rgba(255,255,255,0.92)", marginTop: 2 }}>{line.replace(/\*\*Subject:\*\*|\*\*Tiêu đề:\*\*/g, "").trim()}</div>
            </div>
          );
        }
        if (/^\*\*(.+)\*\*$/.test(line.trim())) {
          return <div key={i} style={{ fontWeight: 700, color: "rgba(255,255,255,0.9)", marginTop: 4 }}>{line.replace(/\*\*/g, "")}</div>;
        }
        return <div key={i}>{line}</div>;
      })}
    </div>
  );
}

const TONES = [
  { id: "formal", label: "Trang trọng" },
  { id: "professional", label: "Chuyên nghiệp" },
  { id: "friendly", label: "Thân thiện" },
  { id: "casual", label: "Thường ngày" },
  { id: "urgent", label: "Khẩn cấp" },
];

const TYPES = [
  { id: "request", label: "📋 Yêu cầu" },
  { id: "followup", label: "🔔 Follow-up" },
  { id: "thankyou", label: "🙏 Cảm ơn" },
  { id: "introduction", label: "👋 Giới thiệu" },
  { id: "complaint", label: "⚠️ Phản ánh" },
  { id: "apology", label: "🙇 Xin lỗi" },
  { id: "invitation", label: "🎉 Mời" },
  { id: "other", label: "✉️ Khác" },
];

export function EmailWriter() {
  const [, navigate] = useLocation();
  const [idea, setIdea] = useState("");
  const [recipient, setRecipient] = useState("");
  const [tone, setTone] = useState("professional");
  const [type, setType] = useState("request");
  const [lang, setLang] = useState<"vi" | "en">("vi");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const write = useCallback(async () => {
    if (!idea.trim() || loading) return;
    abortRef.current?.abort();
    const ctrl = new AbortController(); abortRef.current = ctrl;
    setLoading(true); setResult(""); setError("");
    try {
      const res = await fetch(`${BASE}/api/email-write`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, recipient, tone, type, lang }), signal: ctrl.signal,
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
  }, [idea, recipient, tone, type, lang, loading]);

  async function copy() {
    if (!result) return;
    await navigator.clipboard.writeText(result).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen" style={{ background: "#050505", fontFamily: FONT }}>
      <Navigation />
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[60vw] h-[40vw] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(255,255,255,0.03) 0%, transparent 70%)" }} />
      </div>
      <div className="relative max-w-2xl mx-auto px-5 pt-28 pb-20" style={{ zIndex: 1 }}>
        <motion.button initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} onClick={() => navigate("/tool")}
          className="flex items-center gap-2 mb-8 text-sm" style={{ color: "rgba(255,255,255,0.35)" }}
          whileHover={{ color: "rgba(255,255,255,0.7)" }}>
          <ArrowLeft size={15} /> Quay lại Tool
        </motion.button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)" }}>
              <Mail size={20} style={{ color: "rgba(255,255,255,0.8)" }} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Email Writer</h1>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.38)" }}>Nhập ý tưởng ngắn — AI viết email hoàn chỉnh, chuyên nghiệp</p>
            </div>
          </div>
        </motion.div>

        {/* Loại email + Tone */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }} className="mb-4">
          <AnimBorderCard speed={7} color="rgba(255,255,255,0.4)" radius={14} innerStyle={{ padding: "0.75rem 1rem" }}>
            <label className="text-xs font-semibold block mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>Loại email</label>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {TYPES.map(t => (
                <button key={t.id} onClick={() => setType(t.id)}
                  className="px-3 py-1 rounded-lg text-xs font-medium transition-all border"
                  style={{ background: type === t.id ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)", borderColor: type === t.id ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.08)", color: type === t.id ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)" }}>
                  {t.label}
                </button>
              ))}
            </div>

            <label className="text-xs font-semibold block mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>Phong cách (Tone)</label>
            <div className="flex flex-wrap gap-1.5">
              {TONES.map(t => (
                <button key={t.id} onClick={() => setTone(t.id)}
                  className="px-3 py-1 rounded-lg text-xs font-medium transition-all border"
                  style={{ background: tone === t.id ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)", borderColor: tone === t.id ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.08)", color: tone === t.id ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)" }}>
                  {t.label}
                </button>
              ))}
            </div>
          </AnimBorderCard>
        </motion.div>

        {/* Recipient + Language */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-4">
          <AnimBorderCard speed={7} color="rgba(255,255,255,0.4)" radius={14} innerStyle={{ padding: "0.75rem 1rem" }}>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="text-xs font-semibold block mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>Người nhận (tùy chọn)</label>
                <input value={recipient} onChange={e => setRecipient(e.target.value)}
                  placeholder="VD: Ban giám đốc, Khách hàng ABC..."
                  className="w-full text-sm text-white/80 outline-none px-3 py-2 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", caretColor: "rgba(255,255,255,0.7)" }} />
              </div>
              <div className="flex-shrink-0">
                <label className="text-xs font-semibold block mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>Ngôn ngữ</label>
                <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
                  {(["vi", "en"] as const).map(l => (
                    <button key={l} onClick={() => setLang(l)}
                      className="px-3 py-2 text-xs font-bold transition-all"
                      style={{ background: lang === l ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.03)", color: lang === l ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)" }}>
                      {l === "vi" ? "🇻🇳 VI" : "🇺🇸 EN"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </AnimBorderCard>
        </motion.div>

        {/* Idea input */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }} className="mb-4">
          <AnimBorderCard speed={5} color="rgba(255,255,255,0.6)" radius={16} innerStyle={{ padding: "1rem" }}>
            <label className="text-xs font-semibold block mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>Nội dung / Ý tưởng chính</label>
            <textarea value={idea} onChange={e => setIdea(e.target.value)}
              placeholder={`Mô tả ngắn gọn nội dung email...\nVD: Xin phép nghỉ 3 ngày từ 20-22/4 vì lý do sức khoẻ, đã sắp xếp người trực thay`}
              rows={6}
              className="w-full resize-none text-sm text-white/80 outline-none"
              style={{ background: "transparent", caretColor: "rgba(255,255,255,0.7)", lineHeight: 1.7 }} />
            <div className="flex justify-between mt-1">
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>{idea.length} ký tự</span>
            </div>
          </AnimBorderCard>
        </motion.div>

        <motion.button initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.17 }}
          onClick={write} disabled={!idea.trim() || loading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white mb-6 transition-all disabled:opacity-40"
          style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)" }}>
          {loading ? <><Loader2 size={15} className="animate-spin" /> Đang viết email...</> : <><Mail size={15} /> Viết email</>}
        </motion.button>

        {error && <div className="flex items-center gap-2 text-red-400 text-sm mb-4"><AlertCircle size={14} />{error}</div>}
        {(result || loading) && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <AnimBorderCard speed={4} color="rgba(255,255,255,0.75)" radius={18} innerStyle={{ padding: "1.25rem" }}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>Email đã viết</span>
                {result && (
                  <button onClick={copy} className="flex items-center gap-1.5 text-xs" style={{ color: copied ? "rgba(34,197,94,0.9)" : "rgba(255,255,255,0.4)" }}>
                    {copied ? <CheckCircle2 size={13} /> : <Copy size={13} />} {copied ? "Đã sao chép" : "Sao chép toàn bộ"}
                  </button>
                )}
              </div>
              {loading && !result && <div className="flex items-center gap-2 text-sm py-4" style={{ color: "rgba(255,255,255,0.35)" }}><Loader2 size={14} className="animate-spin" /> AI đang soạn email...</div>}
              {result && <RenderOutput text={result} />}
              {loading && result && <span className="inline-block w-0.5 h-4 ml-0.5 bg-white/50 animate-pulse align-middle" />}
            </AnimBorderCard>
          </motion.div>
        )}
      </div>
    </div>
  );
}
