import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Paperclip, X, FileVideo, FileImage, File } from "lucide-react";
import { Navigation } from "@/components/navigation";

const FONT = "'Plus Jakarta Sans', sans-serif";

/* ── Running border — giống Home ── */
function RunningBorder({
  children, speed = 5, color = "rgba(255,255,255,0.55)", radius = 20,
  className = "", style: s = {},
}: {
  children: React.ReactNode; speed?: number; color?: string;
  radius?: number; className?: string; style?: React.CSSProperties;
}) {
  return (
    <div
      className={`running-border ${className}`}
      style={{
        "--rb-speed": `${speed}s`,
        "--rb-color": color,
        "--rb-radius": `${radius}px`,
        ...s,
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

/* ── File icon theo mime type ── */
function FileIcon({ type }: { type: string }) {
  if (type.startsWith("video/")) return <FileVideo className="w-3.5 h-3.5 text-white/50" />;
  if (type.startsWith("image/")) return <FileImage className="w-3.5 h-3.5 text-white/50" />;
  return <File className="w-3.5 h-3.5 text-white/50" />;
}

type Msg = {
  id: number;
  role: "user" | "bot";
  text: string;
  time: string;
  file?: { name: string; type: string; size: number };
};

export function Chat() {
  const [msgs, setMsgs]       = useState<Msg[]>([]);
  const [input, setInput]     = useState("");
  const [file, setFile]       = useState<File | null>(null);
  const [focused, setFocused] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const fileRef     = useRef<HTMLInputElement>(null);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, isTyping]);

  /* Auto-resize textarea */
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [input]);

  const now = () =>
    new Date().toLocaleTimeString("vi", { hour: "2-digit", minute: "2-digit" });

  const sendMsg = () => {
    const text = input.trim();
    if (!text && !file) return;

    setMsgs(prev => [
      ...prev,
      {
        id: Date.now(), role: "user",
        text: text || `[File: ${file!.name}]`,
        time: now(),
        file: file ? { name: file.name, type: file.type, size: file.size } : undefined,
      },
    ]);
    setInput("");
    setFile(null);
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      setMsgs(prev => [
        ...prev,
        {
          id: Date.now() + 1, role: "bot",
          text: "Tính năng đang được phát triển. Tôi sẽ sớm có thể trả lời bạn!",
          time: now(),
        },
      ]);
    }, 1400);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); }
  };

  const isEmpty = msgs.length === 0 && !isTyping;

  return (
    <div
      style={{
        minHeight: "100dvh", background: "#050505",
        fontFamily: FONT, display: "flex", flexDirection: "column",
      }}
    >
      <Navigation />

      {/* Subtle background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div style={{
          position: "absolute", top: "15%", left: "15%", width: 320, height: 320,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.013) 0%, transparent 70%)",
          filter: "blur(50px)",
        }} />
        <div style={{
          position: "absolute", bottom: "25%", right: "10%", width: 260, height: 260,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.01) 0%, transparent 70%)",
          filter: "blur(40px)",
        }} />
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", zIndex: 1, paddingTop: 64 }}>

        {/* Messages — hoặc empty state */}
        <div style={{
          flex: 1, overflowY: "auto",
          padding: isEmpty ? "0" : "24px 16px 12px",
          display: "flex", flexDirection: "column",
          justifyContent: isEmpty ? "center" : "flex-start",
          alignItems: isEmpty ? "center" : "stretch",
          gap: 10,
        }}>
          {isEmpty ? (
            /* Empty state — center screen */
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{ textAlign: "center", padding: "0 32px" }}
            >
              {/* Animated orb ring */}
              <div style={{ position: "relative", width: 72, height: 72, margin: "0 auto 20px" }}>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  style={{
                    position: "absolute", inset: 0, borderRadius: "50%",
                    border: "1.5px solid transparent",
                    borderTopColor: "rgba(255,255,255,0.5)",
                    borderRightColor: "rgba(255,255,255,0.15)",
                  }}
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                  style={{
                    position: "absolute", inset: 6, borderRadius: "50%",
                    border: "1px dashed rgba(255,255,255,0.15)",
                  }}
                />
                <motion.div
                  animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.7, 0.4] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  style={{
                    position: "absolute", inset: 14, borderRadius: "50%",
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5">
                    <path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2z" opacity="0.3"/>
                    <path d="M8 12h8M12 8v8" strokeLinecap="round"/>
                  </svg>
                </motion.div>
              </div>

              <p style={{ fontSize: 17, fontWeight: 600, color: "rgba(255,255,255,0.75)", marginBottom: 8 }}>
                NexoraAI
              </p>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", lineHeight: 1.6, maxWidth: 260, margin: "0 auto" }}>
                Trợ lý thông minh đang trong giai đoạn phát triển. Hãy bắt đầu cuộc trò chuyện!
              </p>

              {/* Gợi ý prompt */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 28 }}>
                {[
                  "NexoraGarden là gì?",
                  "Giới thiệu về bản thân",
                  "Các dự án đang làm",
                ].map((hint, i) => (
                  <motion.button
                    key={hint}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.08 }}
                    onClick={() => { setInput(hint); textareaRef.current?.focus(); }}
                    whileHover={{ scale: 1.02, x: 3 }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 14, padding: "10px 16px",
                      color: "rgba(255,255,255,0.5)", fontSize: 13,
                      cursor: "pointer", textAlign: "left",
                      fontFamily: FONT,
                    }}
                  >
                    {hint}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <AnimatePresence initial={false}>
              {msgs.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 340, damping: 26 }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                    gap: 3,
                  }}
                >
                  {/* Timestamp */}
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", marginBottom: 2,
                    marginLeft: msg.role === "bot" ? 4 : 0,
                    marginRight: msg.role === "user" ? 4 : 0,
                  }}>
                    {msg.role === "bot" ? `NexoraAI · ` : ""}{msg.time}
                  </span>

                  {/* Bubble */}
                  <div style={{
                    maxWidth: "78%",
                    padding: "10px 14px",
                    borderRadius: msg.role === "user"
                      ? "20px 20px 5px 20px"
                      : "20px 20px 20px 5px",
                    background: msg.role === "user"
                      ? "rgba(255,255,255,0.09)"
                      : "rgba(255,255,255,0.04)",
                    border: msg.role === "user"
                      ? "1px solid rgba(255,255,255,0.15)"
                      : "1px solid rgba(255,255,255,0.08)",
                    fontSize: 13.5, lineHeight: 1.65,
                    color: "rgba(255,255,255,0.8)",
                    backdropFilter: "blur(12px)",
                  }}>
                    {msg.file && (
                      <div style={{
                        display: "flex", alignItems: "center", gap: 7, marginBottom: 7,
                        padding: "6px 10px", borderRadius: 10,
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.09)",
                      }}>
                        <FileIcon type={msg.file.type} />
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {msg.file.name}
                        </span>
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", flexShrink: 0 }}>
                          {(msg.file.size / 1024 / 1024).toFixed(1)} MB
                        </span>
                      </div>
                    )}
                    {msg.text}
                  </div>
                </motion.div>
              ))}

              {/* Typing dots */}
              {isTyping && (
                <motion.div
                  key="typing"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 3 }}
                >
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", marginLeft: 4 }}>NexoraAI</span>
                  <div style={{
                    padding: "11px 18px", borderRadius: "20px 20px 20px 5px",
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                    display: "flex", gap: 5, alignItems: "center",
                  }}>
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        animate={{ y: [0, -5, 0], opacity: [0.35, 1, 0.35] }}
                        transition={{ duration: 0.75, repeat: Infinity, delay: i * 0.16 }}
                        style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(255,255,255,0.45)" }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div style={{
          padding: "10px 16px 22px",
          background: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(24px)",
          borderTop: msgs.length > 0 ? "1px solid rgba(255,255,255,0.06)" : "none",
        }}>
          {/* File preview chip */}
          <AnimatePresence>
            {file && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden", marginBottom: 8 }}
              >
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  padding: "5px 10px", borderRadius: 10,
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                }}>
                  <FileIcon type={file.type} />
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {file.name}
                  </span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.28)" }}>
                    {(file.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                  <button onClick={() => setFile(null)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", lineHeight: 0, marginLeft: 2 }}>
                    <X className="w-3.5 h-3.5 text-white/35" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input bar — running border như Home elements */}
          <div
            className="running-border"
            style={{
              "--rb-speed": focused ? "4s" : "9s",
              "--rb-color": focused ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.2)",
              "--rb-radius": "22px",
            } as React.CSSProperties}
          >
            <div style={{
              display: "flex", alignItems: "flex-end",
              background: "rgba(255,255,255,0.04)",
              borderRadius: 21,
              padding: "8px 8px 8px 14px",
              gap: 6, minHeight: 52,
            }}>
              {/* Attach */}
              <input ref={fileRef} type="file" accept="*/*" style={{ display: "none" }}
                onChange={e => setFile(e.target.files?.[0] ?? null)} />
              <motion.button
                onClick={() => fileRef.current?.click()}
                whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }}
                style={{
                  flexShrink: 0, width: 34, height: 34, borderRadius: 11,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.09)", marginBottom: 1,
                }}
              >
                <Paperclip className="w-4 h-4 text-white/40" />
              </motion.button>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Nhắn tin với NexoraAI…"
                rows={1}
                style={{
                  flex: 1, background: "none", border: "none", outline: "none",
                  resize: "none", color: "rgba(255,255,255,0.82)", fontSize: 13.5,
                  fontFamily: FONT, lineHeight: 1.6, padding: "7px 0",
                  maxHeight: 120, overflowY: "auto",
                }}
              />

              {/* Send */}
              <motion.button
                onClick={sendMsg}
                whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }}
                animate={input.trim() || file
                  ? { opacity: 1 }
                  : { opacity: 0.3 }}
                transition={{ duration: 0.18 }}
                style={{
                  flexShrink: 0, width: 36, height: 36, borderRadius: 12,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", marginBottom: 1,
                  background: input.trim() || file ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.13)",
                  transition: "background 0.2s",
                }}
              >
                <Send className="w-4 h-4 text-white/65" />
              </motion.button>
            </div>
          </div>

          <p style={{
            textAlign: "center", fontSize: 10,
            color: "rgba(255,255,255,0.15)", marginTop: 7, fontFamily: FONT,
          }}>
            Enter để gửi · Shift+Enter xuống dòng
          </p>
        </div>
      </div>
    </div>
  );
}
