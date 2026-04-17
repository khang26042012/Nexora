import { Navigation } from "@/components/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Copy, CheckCircle2, RefreshCw, Shield, ShieldAlert, ShieldCheck, ShieldX, KeyRound, Eye, EyeOff } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";

const FONT = "'Plus Jakarta Sans', sans-serif";

function AnimBorderCard({ children, speed = 4, color = "rgba(255,255,255,0.85)", radius = 16, innerStyle = {}, className = "" }: {
  children: React.ReactNode; speed?: number; color?: string; radius?: number; innerStyle?: React.CSSProperties; className?: string;
}) {
  return (
    <div className={`running-border ${className}`} style={{ "--rb-speed": `${speed}s`, "--rb-color": color, "--rb-radius": `${radius}px`, background: "rgba(255,255,255,0.04)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", ...innerStyle } as React.CSSProperties}>
      {children}
    </div>
  );
}

const CHARS = {
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lower: "abcdefghijklmnopqrstuvwxyz",
  digits: "0123456789",
  symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?",
  ambiguous: "0O1lI",
};

function generatePassword(length: number, opts: { upper: boolean; lower: boolean; digits: boolean; symbols: boolean; noAmbiguous: boolean }) {
  let pool = "";
  if (opts.upper) pool += CHARS.upper;
  if (opts.lower) pool += CHARS.lower;
  if (opts.digits) pool += CHARS.digits;
  if (opts.symbols) pool += CHARS.symbols;
  if (!pool) pool = CHARS.lower + CHARS.digits;
  if (opts.noAmbiguous) pool = pool.split("").filter(c => !CHARS.ambiguous.includes(c)).join("");

  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(n => pool[n % pool.length]).join("");
}

function calcStrength(pw: string): { score: number; label: string; color: string; Icon: typeof Shield } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (pw.length >= 16) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 2) return { score, label: "Yếu", color: "#ef4444", Icon: ShieldX };
  if (score <= 4) return { score, label: "Trung bình", color: "#f59e0b", Icon: ShieldAlert };
  if (score <= 5) return { score, label: "Tốt", color: "#22c55e", Icon: Shield };
  return { score, label: "Rất mạnh", color: "#10b981", Icon: ShieldCheck };
}

export function PasswordGenerator() {
  const [, navigate] = useLocation();
  const [length, setLength] = useState(16);
  const [opts, setOpts] = useState({ upper: true, lower: true, digits: true, symbols: false, noAmbiguous: false });
  const [passwords, setPasswords] = useState<string[]>([]);
  const [count, setCount] = useState(1);
  const [copied, setCopied] = useState<number | null>(null);
  const [shown, setShown] = useState<Record<number, boolean>>({});

  const generate = useCallback(() => {
    setPasswords(Array.from({ length: count }, () => generatePassword(length, opts)));
    setShown({});
  }, [length, count, opts]);

  useEffect(() => { generate(); }, []);

  async function copy(pw: string, i: number) {
    await navigator.clipboard.writeText(pw).catch(() => {});
    setCopied(i); setTimeout(() => setCopied(null), 2000);
  }

  function toggle(key: keyof typeof opts) {
    setOpts(p => {
      const next = { ...p, [key]: !p[key] };
      const anyChar = next.upper || next.lower || next.digits || next.symbols;
      if (!anyChar) return p;
      return next;
    });
  }

  const optDefs: { key: keyof typeof opts; label: string; example: string }[] = [
    { key: "upper", label: "Chữ hoa", example: "A–Z" },
    { key: "lower", label: "Chữ thường", example: "a–z" },
    { key: "digits", label: "Số", example: "0–9" },
    { key: "symbols", label: "Ký tự đặc biệt", example: "!@#$" },
    { key: "noAmbiguous", label: "Bỏ ký tự dễ nhầm", example: "0 O 1 l I" },
  ];

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

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)" }}>
              <KeyRound size={20} style={{ color: "rgba(255,255,255,0.8)" }} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Password Generator</h1>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.38)" }}>Tạo mật khẩu mạnh, ngẫu nhiên — chạy hoàn toàn trên trình duyệt</p>
            </div>
          </div>
        </motion.div>

        {/* Options */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="mb-4">
          <AnimBorderCard speed={7} color="rgba(255,255,255,0.4)" radius={14} innerStyle={{ padding: "1rem" }}>
            {/* Length */}
            <div className="mb-5">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.45)" }}>Độ dài mật khẩu</label>
                <span className="text-sm font-bold text-white">{length}</span>
              </div>
              <input type="range" min={6} max={64} value={length} onChange={e => setLength(+e.target.value)}
                className="w-full accent-white h-1.5 rounded-full cursor-pointer" style={{ background: "rgba(255,255,255,0.15)" }} />
              <div className="flex justify-between mt-1">
                {[8, 12, 16, 24, 32].map(n => (
                  <button key={n} onClick={() => setLength(n)}
                    className="text-[10px] px-2 py-0.5 rounded transition-all"
                    style={{ color: length === n ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.3)", background: length === n ? "rgba(255,255,255,0.1)" : "transparent" }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Character options */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {optDefs.map(({ key, label, example }) => (
                <button key={key} onClick={() => toggle(key)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all"
                  style={{
                    background: opts[key] ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)",
                    borderColor: opts[key] ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.08)",
                  }}>
                  <div className="w-3.5 h-3.5 rounded flex-shrink-0 flex items-center justify-center"
                    style={{ background: opts[key] ? "rgba(255,255,255,0.85)" : "transparent", border: `1.5px solid ${opts[key] ? "transparent" : "rgba(255,255,255,0.2)"}` }}>
                    {opts[key] && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3.5 6L6.5 2" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </div>
                  <div>
                    <div className="text-xs font-medium" style={{ color: opts[key] ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.4)" }}>{label}</div>
                    <div className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>{example}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Count */}
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.45)" }}>Số lượng tạo</label>
              <div className="flex items-center gap-1">
                {[1, 3, 5, 10].map(n => (
                  <button key={n} onClick={() => setCount(n)}
                    className="w-8 h-7 rounded text-xs font-bold transition-all"
                    style={{ background: count === n ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)", color: count === n ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)", border: `1px solid ${count === n ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)"}` }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </AnimBorderCard>
        </motion.div>

        {/* Generate button */}
        <motion.button initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
          onClick={generate}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white mb-6 transition-all"
          style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)" }}
          whileHover={{ background: "rgba(255,255,255,0.15)" }} whileTap={{ scale: 0.98 }}>
          <RefreshCw size={15} /> Tạo mật khẩu
        </motion.button>

        {/* Results */}
        <AnimatePresence>
          {passwords.map((pw, i) => {
            const { label, color, Icon } = calcStrength(pw);
            const isShown = shown[i] ?? false;
            const displayPw = isShown ? pw : "•".repeat(pw.length);
            return (
              <motion.div key={`${pw}-${i}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ delay: i * 0.05 }} className="mb-3">
                <AnimBorderCard speed={5} color="rgba(255,255,255,0.55)" radius={16} innerStyle={{ padding: "1rem" }}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Icon size={13} style={{ color }} />
                      <span className="text-xs font-semibold" style={{ color }}>{label}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setShown(p => ({ ...p, [i]: !p[i] }))}
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
                        style={{ color: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.05)" }}>
                        {isShown ? <EyeOff size={12} /> : <Eye size={12} />}
                      </button>
                      <button onClick={() => copy(pw, i)}
                        className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-all"
                        style={{ color: copied === i ? "rgba(34,197,94,0.9)" : "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                        {copied === i ? <><CheckCircle2 size={12} /> Đã copy</> : <><Copy size={12} /> Copy</>}
                      </button>
                    </div>
                  </div>
                  <div className="font-mono text-sm break-all py-2 px-3 rounded-lg"
                    style={{ background: "rgba(255,255,255,0.04)", color: isShown ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)", letterSpacing: isShown ? "0.05em" : "0.1em", userSelect: isShown ? "text" : "none" }}>
                    {displayPw}
                  </div>
                  {/* Strength bar */}
                  <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                    <motion.div className="h-full rounded-full" initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (calcStrength(pw).score / 7) * 100)}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      style={{ background: color }} />
                  </div>
                </AnimBorderCard>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {passwords.length > 0 && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="text-center text-xs mt-4" style={{ color: "rgba(255,255,255,0.2)" }}>
            Mật khẩu được tạo ngẫu nhiên bằng Web Crypto API — không lưu trữ, không gửi lên server
          </motion.p>
        )}
      </div>
    </div>
  );
}
