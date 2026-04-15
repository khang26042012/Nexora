import { Navigation } from "@/components/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Copy, Loader2, Sparkles, CheckCircle2,
  Wand2, Settings2, Globe, ChevronDown, RotateCcw,
} from "lucide-react";
import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";

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

/* ── Types ── */
type Mode   = "manual" | "ai";
type Lang   = "vi" | "en";
type Tone   = "professional" | "friendly" | "creative" | "concise" | "academic";
type OutFmt = "paragraph" | "list" | "table" | "json" | "code" | "step-by-step";

const TONES: { id: Tone; label: string; emoji: string }[] = [
  { id: "professional", label: "Chuyên nghiệp", emoji: "💼" },
  { id: "friendly",     label: "Thân thiện",    emoji: "😊" },
  { id: "creative",     label: "Sáng tạo",       emoji: "🎨" },
  { id: "concise",      label: "Ngắn gọn",        emoji: "⚡" },
  { id: "academic",     label: "Học thuật",       emoji: "📚" },
];

const OUT_FMTS: { id: OutFmt; label: string }[] = [
  { id: "paragraph",    label: "Đoạn văn" },
  { id: "list",         label: "Danh sách" },
  { id: "step-by-step", label: "Từng bước" },
  { id: "table",        label: "Bảng" },
  { id: "json",         label: "JSON" },
  { id: "code",         label: "Code" },
];

/* ── Field input ── */
function Field({
  label, hint, value, onChange, multiline = false, placeholder = "",
}: {
  label: string; hint?: string; value: string;
  onChange: (v: string) => void;
  multiline?: boolean; placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold tracking-wide" style={{ color: "rgba(255,255,255,0.6)" }}>
          {label}
        </label>
        {hint && (
          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>{hint}</span>
        )}
      </div>
      {multiline ? (
        <textarea
          rows={3}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white/80 outline-none resize-none"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            caretColor: "rgba(255,255,255,0.7)",
            fontFamily: "inherit",
          }}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white/80 outline-none"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            caretColor: "rgba(255,255,255,0.7)",
          }}
        />
      )}
    </div>
  );
}

/* ── Pill selector ── */
function PillSelect<T extends string>({
  options, value, onChange,
}: {
  options: { id: T; label: string; emoji?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
          style={{
            background: value === opt.id ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.04)",
            color: value === opt.id ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.4)",
            border: value === opt.id ? "1px solid rgba(255,255,255,0.3)" : "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {opt.emoji && <span className="mr-1">{opt.emoji}</span>}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ── Stream prompt from API ── */
async function streamPrompt(
  payload: Record<string, string>,
  onChunk: (c: string) => void,
): Promise<void> {
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const res = await fetch(`${base}/api/prompt-gen`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const raw = line.slice(5).trim();
      if (raw === "[DONE]") continue;
      try {
        const json = JSON.parse(raw);
        if (json.text) onChunk(json.text);
        if (json.error) throw new Error(json.error);
      } catch { /* skip */ }
    }
  }
}

/* ── Main Page ── */
export function PromptBuilder() {
  const [, navigate] = useLocation();

  /* Mode & lang */
  const [mode, setMode] = useState<Mode>("manual");
  const [lang, setLang] = useState<Lang>("vi");

  /* Manual fields */
  const [role,       setRole]       = useState("");
  const [task,       setTask]       = useState("");
  const [context,    setContext]    = useState("");
  const [tone,       setTone]       = useState<Tone>("professional");
  const [outputFmt,  setOutputFmt]  = useState<OutFmt>("paragraph");
  const [extra,      setExtra]      = useState("");

  /* AI mode */
  const [description, setDescription] = useState("");

  /* Output */
  const [result,   setResult]   = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [copied,   setCopied]   = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const reset = useCallback(() => {
    setResult(""); setError("");
    setRole(""); setTask(""); setContext(""); setExtra(""); setDescription("");
    setTone("professional"); setOutputFmt("paragraph");
  }, []);

  const handleGenerate = useCallback(async () => {
    setLoading(true); setError(""); setResult("");

    const payload: Record<string, string> = { mode, lang };
    if (mode === "manual") {
      Object.assign(payload, { role, task, context, tone, outputFormat: outputFmt, extra });
    } else {
      payload.description = description;
    }

    try {
      await streamPrompt(payload, chunk => {
        setResult(prev => prev + chunk);
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Lỗi không xác định");
    } finally {
      setLoading(false);
    }
  }, [mode, lang, role, task, context, tone, outputFmt, extra, description]);

  const handleCopy = useCallback(() => {
    if (!result) return;
    navigator.clipboard.writeText(result).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [result]);

  const canGenerate = mode === "manual"
    ? (task.trim().length > 0)
    : (description.trim().length > 0);

  return (
    <div className="min-h-screen" style={{ background: "#050505" }}>
      <Navigation />

      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.25, 0.4, 0.25] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-20%] left-[-10%] w-[55vw] h-[55vw] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(255,255,255,0.04) 0%, transparent 70%)" }}
        />
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 5 }}
          className="absolute bottom-0 right-[-10%] w-[40vw] h-[40vw] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(255,255,255,0.03) 0%, transparent 70%)" }}
        />
      </div>

      <div className="relative max-w-2xl mx-auto px-5 pt-28 pb-24">

        {/* Back */}
        <motion.button
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          onClick={() => navigate("/tool")}
          className="flex items-center gap-2 mb-8 text-sm transition-colors"
          style={{ color: "rgba(255,255,255,0.35)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại Tool Box
        </motion.button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-3">
            <motion.div animate={{ rotate: [0, 15, -10, 15, 0] }} transition={{ duration: 3, repeat: Infinity, repeatDelay: 4 }}>
              <Sparkles className="w-4 h-4" style={{ color: "rgba(255,255,255,0.5)" }} />
            </motion.div>
            <span className="text-xs font-mono tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>
              AI Tool
            </span>
          </div>
          <h1 className="text-3xl font-black text-white mb-2">Prompt Builder</h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            Tạo prompt AI chuẩn — tự điền form hoặc để AI viết lại từ mô tả của bạn.
          </p>
        </motion.div>

        {/* ── Mode tabs + Language toggle ── */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center justify-between mb-6 gap-3 flex-wrap"
        >
          {/* Mode switcher */}
          <AnimBorderCard speed={5} color="rgba(255,255,255,0.3)" radius={12}
            innerStyle={{ padding: 0 }} className="flex-1 min-w-[200px]">
            <div className="flex rounded-[11px] overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
              {([
                { id: "manual" as Mode, icon: Settings2, label: "Tự set" },
                { id: "ai"     as Mode, icon: Wand2,     label: "AI viết" },
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setMode(tab.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-all duration-250"
                  style={{
                    background: mode === tab.id ? "rgba(255,255,255,0.1)" : "transparent",
                    color: mode === tab.id ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)",
                    borderBottom: mode === tab.id ? "1px solid rgba(255,255,255,0.2)" : "1px solid transparent",
                  }}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>
          </AnimBorderCard>

          {/* Language toggle */}
          <AnimBorderCard speed={7} color="rgba(255,255,255,0.2)" radius={12}
            innerStyle={{ padding: 0 }}>
            <div className="flex rounded-[11px] overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
              {([
                { id: "vi" as Lang, label: "🇻🇳 VI" },
                { id: "en" as Lang, label: "🇺🇸 EN" },
              ] as const).map(l => (
                <button
                  key={l.id}
                  onClick={() => setLang(l.id)}
                  className="px-4 py-2.5 text-xs font-bold transition-all duration-200"
                  style={{
                    background: lang === l.id ? "rgba(255,255,255,0.1)" : "transparent",
                    color: lang === l.id ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)",
                  }}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </AnimBorderCard>
        </motion.div>

        {/* ── Form area ── */}
        <AnimatePresence mode="wait">
          {mode === "manual" ? (
            <motion.div
              key="manual"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <AnimBorderCard speed={4} color="rgba(255,255,255,0.4)" radius={18}
                innerStyle={{ padding: "24px" }}>
                <div className="flex flex-col gap-5">

                  {/* Row 1 */}
                  <Field
                    label="🎭 Đóng vai / Persona"
                    hint="tuỳ chọn"
                    placeholder={lang === "vi" ? "VD: Bạn là chuyên gia Marketing 10 năm kinh nghiệm..." : "E.g. You are a senior software engineer..."}
                    value={role}
                    onChange={setRole}
                    multiline
                  />

                  {/* Row 2 */}
                  <Field
                    label="🎯 Nhiệm vụ / Task"
                    hint="bắt buộc"
                    placeholder={lang === "vi" ? "VD: Viết bài quảng cáo sản phẩm X ngắn gọn, hấp dẫn..." : "E.g. Write a compelling product description for..."}
                    value={task}
                    onChange={setTask}
                    multiline
                  />

                  {/* Row 3 */}
                  <Field
                    label="📌 Ngữ cảnh / Context"
                    hint="tuỳ chọn"
                    placeholder={lang === "vi" ? "VD: Đối tượng là học sinh lớp 10, sản phẩm là..." : "E.g. Target audience is students aged 15-18..."}
                    value={context}
                    onChange={setContext}
                    multiline
                  />

                  {/* Tone */}
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold tracking-wide" style={{ color: "rgba(255,255,255,0.6)" }}>
                      🎨 Phong cách / Tone
                    </span>
                    <PillSelect options={TONES} value={tone} onChange={setTone} />
                  </div>

                  {/* Output format */}
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold tracking-wide" style={{ color: "rgba(255,255,255,0.6)" }}>
                      📄 Định dạng output
                    </span>
                    <PillSelect options={OUT_FMTS} value={outputFmt} onChange={setOutputFmt} />
                  </div>

                  {/* Extra */}
                  <Field
                    label="➕ Yêu cầu thêm"
                    hint="tuỳ chọn"
                    placeholder={lang === "vi" ? "VD: Tối đa 200 chữ, không dùng từ ngữ kỹ thuật..." : "E.g. Max 200 words, avoid jargon..."}
                    value={extra}
                    onChange={setExtra}
                  />
                </div>
              </AnimBorderCard>
            </motion.div>
          ) : (
            <motion.div
              key="ai"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <AnimBorderCard speed={4} color="rgba(255,255,255,0.4)" radius={18}
                innerStyle={{ padding: "24px" }}>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold tracking-wide" style={{ color: "rgba(255,255,255,0.6)" }}>
                        ✍️ Mô tả yêu cầu của bạn
                      </label>
                      <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                        {description.length}/500
                      </span>
                    </div>
                    <textarea
                      rows={6}
                      maxLength={500}
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder={lang === "vi"
                        ? "VD: Tạo một button React có animation gradient đẹp khi hover\nHoặc: Viết email cảm ơn khách hàng sau khi mua hàng\nHoặc: Giải thích khái niệm machine learning cho trẻ em..."
                        : "E.g. Create a React button with beautiful gradient hover animation\nOr: Write a customer thank-you email after purchase\nOr: Explain machine learning to a 10-year-old..."}
                      className="w-full rounded-xl px-3.5 py-3 text-sm text-white/80 outline-none resize-none leading-relaxed"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        caretColor: "rgba(255,255,255,0.7)",
                        fontFamily: "inherit",
                      }}
                    />
                  </div>
                  <div className="flex items-start gap-3 px-1">
                    <Globe className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "rgba(255,255,255,0.25)" }} />
                    <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.3)" }}>
                      {lang === "vi"
                        ? "AI sẽ viết lại yêu cầu của bạn thành prompt hoàn chỉnh — không cần đóng vai, không cần format phức tạp."
                        : "AI will rewrite your idea into a complete, ready-to-use prompt — no role-play setup needed."}
                    </p>
                  </div>
                </div>
              </AnimBorderCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Action buttons ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="flex gap-3 mt-5"
        >
          <button
            onClick={handleGenerate}
            disabled={loading || !canGenerate}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-200"
            style={{
              background: canGenerate && !loading
                ? "rgba(255,255,255,0.12)"
                : "rgba(255,255,255,0.04)",
              color: canGenerate && !loading
                ? "rgba(255,255,255,0.9)"
                : "rgba(255,255,255,0.25)",
              border: "1px solid rgba(255,255,255,0.12)",
              cursor: canGenerate && !loading ? "pointer" : "not-allowed",
            }}
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang tạo...</>
              : <><Wand2 className="w-4 h-4" /> {mode === "manual" ? "Tạo Prompt" : "Viết Prompt"}</>}
          </button>

          {(result || error) && (
            <button
              onClick={reset}
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm transition-all duration-200"
              style={{
                background: "rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.35)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </motion.div>

        {/* ── Error ── */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mt-4 px-4 py-3 rounded-xl text-sm"
              style={{ background: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.2)", color: "rgba(255,120,120,0.9)" }}
            >
              ⚠️ {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Result ── */}
        <AnimatePresence>
          {(result || loading) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="mt-6"
              ref={resultRef}
            >
              <AnimBorderCard
                speed={loading ? 2 : 6}
                color={loading ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.35)"}
                radius={18}
                innerStyle={{ padding: "20px" }}
              >
                {/* Result header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        background: loading ? "rgba(255,255,255,0.6)" : "rgba(120,220,150,0.8)",
                        boxShadow: loading ? "0 0 6px rgba(255,255,255,0.4)" : "0 0 6px rgba(120,220,150,0.5)",
                      }}
                    />
                    <span className="text-xs font-semibold tracking-wide" style={{ color: "rgba(255,255,255,0.5)" }}>
                      {loading ? "Đang tạo prompt..." : "Prompt của bạn"}
                    </span>
                  </div>

                  {result && !loading && (
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
                      style={{
                        background: copied ? "rgba(120,220,150,0.12)" : "rgba(255,255,255,0.06)",
                        color: copied ? "rgba(120,220,150,0.9)" : "rgba(255,255,255,0.5)",
                        border: copied ? "1px solid rgba(120,220,150,0.25)" : "1px solid rgba(255,255,255,0.1)",
                      }}
                    >
                      {copied
                        ? <><CheckCircle2 className="w-3.5 h-3.5" /> Đã copy</>
                        : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                    </button>
                  )}
                </div>

                {/* Result content */}
                <div
                  className="text-sm leading-relaxed whitespace-pre-wrap rounded-xl p-4 select-text"
                  style={{
                    color: "rgba(255,255,255,0.82)",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    fontFamily: "'Plus Jakarta Sans', monospace",
                    minHeight: 80,
                  }}
                >
                  {result}
                  {loading && (
                    <span
                      className="inline-block w-0.5 h-4 ml-0.5 align-text-bottom"
                      style={{
                        background: "rgba(255,255,255,0.7)",
                        animation: "blink 0.9s step-end infinite",
                      }}
                    />
                  )}
                </div>

                {/* Tip */}
                {result && !loading && (
                  <motion.p
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                    className="mt-3 text-xs text-center"
                    style={{ color: "rgba(255,255,255,0.2)" }}
                  >
                    Copy prompt và paste vào ChatGPT, Claude, Gemini,... là dùng ngay 🚀
                  </motion.p>
                )}
              </AnimBorderCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Empty state hint ── */}
        {!result && !loading && !error && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="mt-10 text-center"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <Wand2 className="w-5 h-5" style={{ color: "rgba(255,255,255,0.2)" }} />
              </div>
              <div>
                <p className="text-sm font-medium mb-1" style={{ color: "rgba(255,255,255,0.25)" }}>
                  Chưa có prompt nào
                </p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.15)" }}>
                  {mode === "manual"
                    ? "Điền ít nhất mục Nhiệm vụ rồi nhấn Tạo Prompt"
                    : "Mô tả yêu cầu của bạn rồi nhấn Viết Prompt"}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </div>
  );
}
