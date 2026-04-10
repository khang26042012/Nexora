import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Paperclip, X, Bot, Sparkles, FileVideo, FileImage, File } from "lucide-react";
import { Navigation } from "@/components/navigation";

const FONT = "'Plus Jakarta Sans', sans-serif";

/* ── Running border (dùng class giống Home/Tool) ── */
function RunningBorder({
  children, speed = 5, color = "rgba(255,255,255,0.6)", radius = 16, className = "", style: s = {},
}: {
  children: React.ReactNode; speed?: number; color?: string;
  radius?: number; className?: string; style?: React.CSSProperties;
}) {
  return (
    <div
      className={`running-border ${className}`}
      style={{ "--rb-speed": `${speed}s`, "--rb-color": color, "--rb-radius": `${radius}px`, ...s } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

/* ── Placeholder messages ── */
const INIT_MSGS = [
  {
    id: 1, role: "bot" as const,
    text: "Xin chào! Tôi là **NexoraAI** — trợ lý thông minh của Phan Trọng Khang. Tôi có thể giúp bạn về nông nghiệp IoT, lập trình, hoặc bất kỳ câu hỏi nào bạn muốn hỏi.",
    time: "23:40",
  },
  {
    id: 2, role: "bot" as const,
    text: "Hiện tại tôi đang được hoàn thiện. Bạn có thể bắt đầu trò chuyện bên dưới!",
    time: "23:40",
  },
];

/* ── File icon theo type ── */
function FileIcon({ type }: { type: string }) {
  if (type.startsWith("video/")) return <FileVideo className="w-4 h-4 text-white/60" />;
  if (type.startsWith("image/")) return <FileImage className="w-4 h-4 text-white/60" />;
  return <File className="w-4 h-4 text-white/60" />;
}

/* ── Format text đơn giản (bold) ── */
function MsgText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**")
          ? <strong key={i} className="text-white font-semibold">{p.slice(2, -2)}</strong>
          : <span key={i}>{p}</span>
      )}
    </span>
  );
}

export function Chat() {
  const [msgs, setMsgs] = useState(INIT_MSGS);
  const [input, setInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [focused, setFocused] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
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

  const sendMsg = () => {
    const text = input.trim();
    if (!text && !file) return;

    const userMsg = {
      id: Date.now(), role: "user" as const,
      text: text || (file ? `[Đã gửi file: ${file.name}]` : ""),
      time: new Date().toLocaleTimeString("vi", { hour: "2-digit", minute: "2-digit" }),
      file: file ? { name: file.name, type: file.type, size: file.size } : undefined,
    };
    setMsgs(prev => [...prev, userMsg]);
    setInput("");
    setFile(null);
    setIsTyping(true);

    /* Giả lập bot reply */
    setTimeout(() => {
      setIsTyping(false);
      setMsgs(prev => [...prev, {
        id: Date.now() + 1, role: "bot" as const,
        text: "Tính năng chat bot đang được phát triển. Tôi sẽ sớm có thể trả lời bạn!",
        time: new Date().toLocaleTimeString("vi", { hour: "2-digit", minute: "2-digit" }),
      }]);
    }, 1500);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); }
  };

  return (
    <div style={{ minHeight: "100dvh", background: "#050505", fontFamily: FONT, display: "flex", flexDirection: "column" }}>
      <Navigation />

      {/* Background subtle orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div style={{
          position: "absolute", top: "10%", left: "20%", width: 300, height: 300, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.015) 0%, transparent 70%)",
          filter: "blur(40px)",
        }} />
        <div style={{
          position: "absolute", bottom: "20%", right: "10%", width: 250, height: 250, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.012) 0%, transparent 70%)",
          filter: "blur(40px)",
        }} />
      </div>

      {/* Chat container */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", zIndex: 1, paddingTop: 64 }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(0,0,0,0.4)",
            backdropFilter: "blur(20px)",
            display: "flex", alignItems: "center", gap: 12,
          }}
        >
          {/* Bot avatar */}
          <RunningBorder speed={6} color="rgba(255,255,255,0.4)" radius={999} style={{ borderRadius: "50%" }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center",
              justifyContent: "center", background: "rgba(255,255,255,0.06)",
            }}>
              <Bot className="w-5 h-5 text-white/70" />
            </div>
          </RunningBorder>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="text-white font-semibold text-sm">NexoraAI</span>
              <span style={{
                fontSize: 10, color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 6, padding: "1px 6px",
              }}>BETA</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
              <motion.div
                animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 2, repeat: Infinity }}
                style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399" }}
              />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Đang hoạt động</span>
            </div>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
            <Sparkles className="w-4 h-4 text-white/20" />
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>Gemini 2.5 Flash</span>
          </div>
        </motion.div>

        {/* Messages area */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          <AnimatePresence initial={false}>
            {msgs.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 350, damping: 28 }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                  gap: 4,
                }}
              >
                {/* Bot icon */}
                {msg.role === "bot" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center",
                      justifyContent: "center", background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.12)",
                    }}>
                      <Bot className="w-3 h-3 text-white/60" />
                    </div>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>NexoraAI · {msg.time}</span>
                  </div>
                )}

                {/* Bubble */}
                <div
                  style={{
                    maxWidth: "82%",
                    padding: "10px 14px",
                    borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    background: msg.role === "user"
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(255,255,255,0.05)",
                    border: msg.role === "user"
                      ? "1px solid rgba(255,255,255,0.18)"
                      : "1px solid rgba(255,255,255,0.09)",
                    fontSize: 13.5,
                    lineHeight: 1.6,
                    color: "rgba(255,255,255,0.82)",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  {(msg as any).file && (
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8, marginBottom: 6,
                      padding: "6px 10px", borderRadius: 8,
                      background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                    }}>
                      <FileIcon type={(msg as any).file.type} />
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {(msg as any).file.name}
                      </span>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>
                        {((msg as any).file.size / 1024 / 1024).toFixed(1)} MB
                      </span>
                    </div>
                  )}
                  <MsgText text={msg.text} />
                </div>

                {msg.role === "user" && (
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginRight: 4 }}>{msg.time}</span>
                )}
              </motion.div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <motion.div
                key="typing"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center",
                  justifyContent: "center", background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}>
                  <Bot className="w-3 h-3 text-white/60" />
                </div>
                <div style={{
                  padding: "10px 16px", borderRadius: "18px 18px 18px 4px",
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)",
                  display: "flex", gap: 4, alignItems: "center",
                }}>
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.18 }}
                      style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(255,255,255,0.5)" }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div style={{
          padding: "12px 16px 20px",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(20px)",
        }}>
          {/* File preview */}
          <AnimatePresence>
            {file && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                style={{ marginBottom: 10, overflow: "hidden" }}
              >
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "6px 10px", borderRadius: 10,
                  background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
                }}>
                  <FileIcon type={file.type} />
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {file.name}
                  </span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                    {(file.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                  <button onClick={() => setFile(null)} style={{ marginLeft: 4, cursor: "pointer", background: "none", border: "none", padding: 0 }}>
                    <X className="w-3.5 h-3.5 text-white/40" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input bar với running border giống các elements khác */}
          <RunningBorder
            speed={focused ? 4 : 8}
            color={focused ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)"}
            radius={20}
          >
            <div style={{
              display: "flex", alignItems: "flex-end", gap: 0,
              background: "rgba(255,255,255,0.04)",
              borderRadius: 19,
              padding: "8px 8px 8px 14px",
              minHeight: 50,
            }}>
              {/* Attach file */}
              <input ref={fileRef} type="file" accept="*/*" style={{ display: "none" }}
                onChange={e => setFile(e.target.files?.[0] ?? null)} />
              <motion.button
                onClick={() => fileRef.current?.click()}
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.92 }}
                style={{
                  flexShrink: 0, width: 34, height: 34, borderRadius: 10, display: "flex",
                  alignItems: "center", justifyContent: "center", cursor: "pointer",
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                  marginRight: 8, marginBottom: 2,
                }}
                title="Gửi file"
              >
                <Paperclip className="w-4 h-4 text-white/45" />
              </motion.button>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Nhắn tin với NexoraAI... (Enter để gửi)"
                rows={1}
                style={{
                  flex: 1, background: "none", border: "none", outline: "none", resize: "none",
                  color: "rgba(255,255,255,0.85)", fontSize: 13.5, fontFamily: FONT, lineHeight: 1.6,
                  padding: "6px 0", maxHeight: 120, overflowY: "auto",
                }}
              />

              {/* Send button */}
              <motion.button
                onClick={sendMsg}
                whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                animate={input.trim() || file ? { opacity: 1, scale: 1 } : { opacity: 0.35, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                style={{
                  flexShrink: 0, width: 36, height: 36, borderRadius: 12, display: "flex",
                  alignItems: "center", justifyContent: "center", cursor: "pointer",
                  background: input.trim() || file ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.15)", marginBottom: 1, marginLeft: 6,
                  transition: "background 0.2s",
                }}
              >
                <Send className="w-4 h-4 text-white/70" />
              </motion.button>
            </div>
          </RunningBorder>

          <p style={{ textAlign: "center", fontSize: 10, color: "rgba(255,255,255,0.18)", marginTop: 8, fontFamily: FONT }}>
            NexoraAI đang trong giai đoạn phát triển · Shift+Enter để xuống dòng
          </p>
        </div>
      </div>
    </div>
  );
}
