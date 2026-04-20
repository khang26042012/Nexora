import { Navigation } from "@/components/navigation";
import { ToolVideoBg } from "@/components/ToolVideoBg";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Copy, CheckCircle2, RefreshCw, Inbox, Mail,
  Clock, User, ChevronRight, AlertTriangle, Loader2, X, RotateCcw,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";

const API = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const FONT = "'Plus Jakarta Sans', sans-serif";
const DOMAIN = "nexorax.cloud";

function AnimBorderCard({ children, speed = 4, color = "rgba(255,255,255,0.85)", radius = 16, innerStyle = {}, className = "" }: {
  children: React.ReactNode; speed?: number; color?: string; radius?: number; innerStyle?: React.CSSProperties; className?: string;
}) {
  return (
    <div className={`running-border ${className}`} style={{ "--rb-speed": `${speed}s`, "--rb-color": color, "--rb-radius": `${radius}px`, background: "rgba(255,255,255,0.04)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", ...innerStyle } as React.CSSProperties}>
      {children}
    </div>
  );
}

function useCopy(timeout = 1600) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), timeout);
    });
  }, [timeout]);
  return { copied, copy };
}

function extractOtp(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const patterns = [
    /OTP[:\s]+(\d{4,8})/gi, /code[:\s]+(\d{4,8})/gi,
    /verification[:\s]+(\d{4,8})/gi, /mã[:\s]+(\d{4,8})/gi,
    /\b(\d{4,8})\b/g,
  ];
  for (const pat of patterns) {
    let m; const re = new RegExp(pat.source, pat.flags);
    while ((m = re.exec(text)) !== null) {
      const v = m[1] ?? m[0];
      if (!seen.has(v)) { seen.add(v); out.push(v); }
    }
  }
  return out.slice(0, 3);
}

function highlightLinks(text: string): React.ReactNode[] {
  const urlRe = /https?:\/\/[^\s"<>]+/g;
  const parts: React.ReactNode[] = [];
  let last = 0; let m;
  while ((m = urlRe.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const url = m[0];
    parts.push(<a key={m.index} href={url} target="_blank" rel="noopener noreferrer" className="underline break-all" style={{ color: "rgba(147,197,253,0.85)" }}>{url.length > 60 ? url.slice(0, 57) + "…" : url}</a>);
    last = m.index + url.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s trước`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h trước`;
  return d.toLocaleDateString("vi-VN");
}

interface MailMeta { id: number; from: string; subject: string; date: string; }
interface MailFull extends MailMeta { body: string; textBody: string; htmlBody: string; }

export function TempMail() {
  const [, navigate] = useLocation();
  const { copied: copiedEmail, copy: copyEmail } = useCopy();
  const { copied: copiedOtp, copy: copyOtp } = useCopy();

  const [login, setLogin] = useState("");
  const [activeEmail, setActiveEmail] = useState("");

  const [inbox, setInbox] = useState<MailMeta[]>([]);
  const [selected, setSelected] = useState<MailFull | null>(null);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [error, setError] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(10);

  /* Restore section */
  const [showRestore, setShowRestore] = useState(false);
  const [restoreInput, setRestoreInput] = useState("");
  const [restoreError, setRestoreError] = useState("");

  const randomLogin = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    const len = 8 + Math.floor(Math.random() * 6);
    return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  };

  const fetchInbox = useCallback(async (lg: string) => {
    if (!lg) return;
    setLoadingInbox(true);
    setError("");
    try {
      const r = await fetch(`${API}/tempmail/inbox?login=${encodeURIComponent(lg)}&domain=${encodeURIComponent(DOMAIN)}`);
      const d = await r.json();
      if (d.messages) {
        setInbox(d.messages.sort((a: MailMeta, b: MailMeta) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      }
      setLastRefresh(new Date());
      setCountdown(10);
    } catch {
      setError("Không thể kết nối tới mail server.");
    } finally {
      setLoadingInbox(false);
    }
  }, []);

  const startEmail = (lg = login) => {
    const finalLogin = (lg.trim() || randomLogin()).toLowerCase().replace(/[^a-z0-9._-]/g, "");
    setLogin(finalLogin);
    setActiveEmail(`${finalLogin}@${DOMAIN}`);
    setInbox([]);
    setSelected(null);
    fetchInbox(finalLogin);
  };

  const restoreEmail = () => {
    setRestoreError("");
    const raw = restoreInput.trim().toLowerCase();
    let lg = raw;
    if (raw.includes("@")) {
      const [before, after] = raw.split("@");
      if (after !== DOMAIN) { setRestoreError(`Chỉ hỗ trợ domain @${DOMAIN}`); return; }
      lg = before;
    }
    if (!lg || !/^[a-z0-9._-]+$/.test(lg)) { setRestoreError("Địa chỉ không hợp lệ."); return; }
    setLogin(lg);
    setActiveEmail(`${lg}@${DOMAIN}`);
    setInbox([]);
    setSelected(null);
    fetchInbox(lg);
    setShowRestore(false);
    setRestoreInput("");
  };

  useEffect(() => {
    if (!activeEmail) return;
    const lg = activeEmail.split("@")[0];
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => fetchInbox(lg), 10000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [activeEmail, fetchInbox]);

  useEffect(() => {
    if (!activeEmail) return;
    const t = setInterval(() => setCountdown(c => c <= 1 ? 10 : c - 1), 1000);
    return () => clearInterval(t);
  }, [activeEmail, lastRefresh]);

  const openMessage = async (msg: MailMeta) => {
    if (!activeEmail) return;
    const lg = activeEmail.split("@")[0];
    setLoadingMsg(true);
    try {
      const r = await fetch(`${API}/tempmail/message?login=${encodeURIComponent(lg)}&domain=${encodeURIComponent(DOMAIN)}&id=${msg.id}`);
      setSelected(await r.json());
    } catch {
      setError("Không thể tải nội dung email.");
    } finally {
      setLoadingMsg(false);
    }
  };

  const bodyText = selected?.textBody || selected?.body || "";
  const otps = extractOtp(bodyText);

  return (
    <div className="min-h-screen" style={{ background: "#050505", fontFamily: FONT }}>
      <Navigation />
      <ToolVideoBg />

      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.35, 0.2] }} transition={{ duration: 18, repeat: Infinity }}
          className="absolute top-[-15%] left-[-10%] w-[50vw] h-[50vw] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(255,255,255,0.03) 0%, transparent 70%)" }} />
      </div>

      <div className="relative max-w-2xl mx-auto px-5 pt-28 pb-24">
        {/* Back */}
        <motion.button initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45 }}
          onClick={() => navigate("/tool")}
          className="flex items-center gap-2 mb-8 text-sm hover:opacity-80 transition-opacity"
          style={{ color: "rgba(255,255,255,0.4)" }}>
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </motion.button>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
              <Mail className="w-5 h-5" style={{ color: "rgba(255,255,255,0.75)" }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-white">Temp Mail</h1>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wide uppercase"
                  style={{ background: "rgba(251,191,36,0.12)", color: "rgba(251,191,36,0.8)", border: "1px solid rgba(251,191,36,0.2)" }}>Beta</span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>Email tạm thời — nhận OTP, link xác minh, chặn spam.</p>
            </div>
          </div>
          <div className="mt-3 px-3 py-2 rounded-lg flex items-start gap-2"
            style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)" }}>
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "rgba(251,191,36,0.7)" }} />
            <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
              Đây là email công khai — bất kỳ ai biết địa chỉ đều đọc được. Không dùng cho thông tin nhạy cảm.
            </p>
          </div>
        </motion.div>

        {/* Email generator */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="mb-4">
          <AnimBorderCard speed={5} color="rgba(255,255,255,0.3)" radius={16}>
            <div className="p-5">
              <p className="text-xs font-semibold mb-3 tracking-wide uppercase" style={{ color: "rgba(255,255,255,0.35)" }}>Tạo địa chỉ email</p>
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="text"
                  value={login}
                  onChange={e => setLogin(e.target.value.replace(/[^a-z0-9._-]/gi, "").toLowerCase())}
                  placeholder="username (để trống = ngẫu nhiên)"
                  className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none text-white/80"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", caretColor: "rgba(255,255,255,0.7)" }}
                  onKeyDown={e => e.key === "Enter" && startEmail()}
                />
                <span className="text-sm flex-shrink-0" style={{ color: "rgba(255,255,255,0.4)" }}>@</span>
                <span className="px-3 py-2.5 rounded-xl text-sm font-semibold flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.9)" }}>
                  {DOMAIN}
                </span>
              </div>
              <button onClick={() => startEmail()}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
                style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.9)" }}>
                <Inbox className="w-4 h-4" /> Tạo & Mở hộp thư
              </button>
            </div>
          </AnimBorderCard>
        </motion.div>

        {/* Restore section */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.45 }} className="mb-5">
          <button onClick={() => setShowRestore(v => !v)}
            className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm transition-all hover:opacity-80"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)" }}>
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Khôi phục hộp thư cũ</span>
            <motion.span animate={{ rotate: showRestore ? 180 : 0 }} transition={{ duration: 0.2 }} className="ml-auto text-xs">▾</motion.span>
          </button>

          <AnimatePresence>
            {showRestore && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }} className="overflow-hidden">
                <div className="pt-2">
                  <AnimBorderCard speed={6} color="rgba(255,255,255,0.2)" radius={14}>
                    <div className="p-4">
                      <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.4)" }}>
                        Nhập username hoặc địa chỉ đầy đủ đã tạo trước đó để mở lại hộp thư.
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={restoreInput}
                          onChange={e => { setRestoreInput(e.target.value); setRestoreError(""); }}
                          placeholder={`username hoặc username@${DOMAIN}`}
                          className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none text-white/80"
                          style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${restoreError ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.1)"}`, caretColor: "rgba(255,255,255,0.7)" }}
                          onKeyDown={e => e.key === "Enter" && restoreEmail()}
                        />
                        <button onClick={restoreEmail}
                          className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-95 flex-shrink-0"
                          style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.9)" }}>
                          Mở
                        </button>
                      </div>
                      {restoreError && (
                        <p className="text-xs mt-2" style={{ color: "rgba(239,68,68,0.8)" }}>{restoreError}</p>
                      )}
                    </div>
                  </AnimBorderCard>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Active email display */}
        <AnimatePresence>
          {activeEmail && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4 }} className="mb-5">
              <AnimBorderCard speed={3} color="rgba(255,255,255,0.4)" radius={16}>
                <div className="p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs mb-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>Địa chỉ email của bạn</p>
                    <p className="text-base font-bold text-white truncate">{activeEmail}</p>
                  </div>
                  <button onClick={() => copyEmail(activeEmail)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90 active:scale-95 flex-shrink-0"
                    style={{ background: copiedEmail ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.08)", border: `1px solid ${copiedEmail ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.12)"}`, color: copiedEmail ? "rgba(34,197,94,0.9)" : "rgba(255,255,255,0.7)" }}>
                    {copiedEmail ? <><CheckCircle2 className="w-3.5 h-3.5" /> Đã copy</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                  </button>
                </div>
              </AnimBorderCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "rgba(239,68,68,0.8)" }}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
              <button onClick={() => setError("")} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Inbox */}
        <AnimatePresence>
          {activeEmail && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: 0.05, duration: 0.45 }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Inbox className="w-4 h-4" style={{ color: "rgba(255,255,255,0.4)" }} />
                  <span className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.6)" }}>Hộp thư</span>
                  {inbox.length > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                      style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>{inbox.length}</span>
                  )}
                </div>
                <button onClick={() => fetchInbox(activeEmail.split("@")[0])}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-all hover:opacity-80 active:scale-95"
                  style={{ color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
                  {loadingInbox ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  <span>Làm mới <span className="opacity-60">({countdown}s)</span></span>
                </button>
              </div>

              <AnimBorderCard speed={6} color="rgba(255,255,255,0.2)" radius={16}>
                <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  {loadingInbox && inbox.length === 0 ? (
                    <div className="py-12 flex flex-col items-center gap-3">
                      <Loader2 className="w-6 h-6 animate-spin" style={{ color: "rgba(255,255,255,0.3)" }} />
                      <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Đang kiểm tra hộp thư…</p>
                    </div>
                  ) : inbox.length === 0 ? (
                    <div className="py-12 flex flex-col items-center gap-3">
                      <Inbox className="w-8 h-8" style={{ color: "rgba(255,255,255,0.1)" }} />
                      <p className="text-sm" style={{ color: "rgba(255,255,255,0.25)" }}>Chưa có email nào</p>
                      <p className="text-xs text-center" style={{ color: "rgba(255,255,255,0.18)" }}>
                        Tự động làm mới mỗi 10 giây.<br />Đăng ký bằng địa chỉ trên để nhận email.
                      </p>
                    </div>
                  ) : (
                    inbox.map((msg, i) => (
                      <motion.button key={msg.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => openMessage(msg)}
                        className="w-full text-left px-5 py-4 flex items-start gap-3 transition-colors hover:bg-white/[0.03] group">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                          <User className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.4)" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <p className="text-xs font-semibold truncate" style={{ color: "rgba(255,255,255,0.6)" }}>
                              {msg.from.replace(/<.*>/, "").trim() || msg.from}
                            </p>
                            <span className="text-[10px] flex-shrink-0 flex items-center gap-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                              <Clock className="w-2.5 h-2.5" />{timeAgo(msg.date)}
                            </span>
                          </div>
                          <p className="text-sm font-medium truncate" style={{ color: "rgba(255,255,255,0.85)" }}>{msg.subject}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 flex-shrink-0 mt-1 opacity-0 group-hover:opacity-40 transition-opacity" style={{ color: "rgba(255,255,255,0.5)" }} />
                      </motion.button>
                    ))
                  )}
                </div>
              </AnimBorderCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Message detail overlay */}
        <AnimatePresence>
          {(selected || loadingMsg) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
              style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
              onClick={(e) => e.target === e.currentTarget && setSelected(null)}>
              <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="w-full sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col rounded-t-3xl sm:rounded-2xl"
                style={{ background: "#0e0e0e", border: "1px solid rgba(255,255,255,0.1)" }}>
                {loadingMsg ? (
                  <div className="flex-1 flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin" style={{ color: "rgba(255,255,255,0.3)" }} />
                  </div>
                ) : selected && (
                  <>
                    <div className="px-5 py-4 border-b flex items-start gap-3" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-white/90 mb-1">{selected.subject}</h3>
                        <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                          Từ: <span style={{ color: "rgba(255,255,255,0.65)" }}>{selected.from}</span>
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                          {new Date(selected.date).toLocaleString("vi-VN")}
                        </p>
                      </div>
                      <button onClick={() => setSelected(null)}
                        className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"
                        style={{ color: "rgba(255,255,255,0.4)" }}>
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {otps.length > 0 && (
                      <div className="px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(34,197,94,0.04)" }}>
                        <p className="text-xs mb-2 font-semibold" style={{ color: "rgba(34,197,94,0.7)" }}>Mã OTP phát hiện:</p>
                        <div className="flex flex-wrap gap-2">
                          {otps.map((otp, i) => (
                            <button key={i} onClick={() => copyOtp(otp)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-mono font-bold transition-all hover:opacity-90 active:scale-95"
                              style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", color: "rgba(34,197,94,0.9)" }}>
                              {copiedOtp ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              {otp}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex-1 overflow-y-auto px-5 py-4">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words" style={{ color: "rgba(255,255,255,0.65)" }}>
                        {highlightLinks(bodyText || "(Không có nội dung)")}
                      </p>
                    </div>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
