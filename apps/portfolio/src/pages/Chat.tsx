import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Paperclip, X, FileVideo, FileImage, File, AlertCircle } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { NEXORA_SYSTEM_DATA } from "@/lib/nexoraData";

const FONT = "'Plus Jakarta Sans', sans-serif";
const CHAT_API_URL = "/api/chat";
const MAX_FILE_MB = 15;

const SYSTEM_PROMPT = `Bạn là NexoraAI — trợ lý thông minh được tích hợp trong portfolio của Phan Trọng Khang.
Xưng "mình", gọi người dùng thân mật tùy ngữ cảnh.
Trả lời tiếng Việt trừ khi người dùng viết bằng ngôn ngữ khác.
Thân thiện, ngắn gọn, thực tế. Dùng emoji hợp lý.
Nếu người dùng hỏi về kỹ thuật, hãy giải thích rõ ràng và cụ thể.

QUY TẮC BẮT BUỘC VỀ LINK:
- Khi cần đề cập link hoặc hướng dẫn đến tool/trang nào đó, chỉ đưa ra ĐÚNG MỘT đường link duy nhất quan trọng nhất.
- LUÔN dùng định dạng markdown: [tên hiển thị](https://nexorax.cloud/đường-dẫn)
- Ví dụ đúng: Bạn vào [Background Remover](https://nexorax.cloud/tool/bg-remover) để tách nền nhé!
- KHÔNG liệt kê nhiều link cùng lúc trong một câu trả lời.

Dưới đây là toàn bộ tài liệu kỹ thuật hệ thống NexoraGarden mà bạn cần nắm rõ:

${NEXORA_SYSTEM_DATA}`;

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

type GeminiMessage = {
  role: "user" | "model";
  parts: GeminiPart[];
};

type AttachedFile = {
  name: string;
  type: string;
  size: number;
  base64: string;
  previewUrl?: string;
};

type Msg = {
  id: number;
  role: "user" | "bot";
  text: string;
  time: string;
  file?: { name: string; type: string; size: number; previewUrl?: string };
  error?: boolean;
};

function FileIcon({ type }: { type: string }) {
  if (type.startsWith("video/")) return <FileVideo className="w-3.5 h-3.5 text-white/50" />;
  if (type.startsWith("image/")) return <FileImage className="w-3.5 h-3.5 text-white/50" />;
  return <File className="w-3.5 h-3.5 text-white/50" />;
}

function renderLine(line: string, key: number) {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*|`(.+?)`|\*(.+?)\*|\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(line)) !== null) {
    if (match.index > last) parts.push(line.slice(last, match.index));
    if (match[1] !== undefined)
      parts.push(<strong key={match.index} style={{ color: "rgba(255,255,255,0.95)", fontWeight: 700 }}>{match[1]}</strong>);
    else if (match[2] !== undefined)
      parts.push(<code key={match.index} style={{ background: "rgba(255,255,255,0.1)", borderRadius: 4, padding: "1px 5px", fontSize: "0.88em", fontFamily: "monospace" }}>{match[2]}</code>);
    else if (match[3] !== undefined)
      parts.push(<em key={match.index}>{match[3]}</em>);
    else if (match[4] !== undefined && match[5] !== undefined)
      parts.push(
        <a
          key={match.index}
          href={match[5]}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#60a5fa", textDecoration: "underline", textUnderlineOffset: 3, cursor: "pointer" }}
        >
          {match[4]}
        </a>
      );
    last = match.index + match[0].length;
  }
  if (last < line.length) parts.push(line.slice(last));
  return <span key={key}>{parts}</span>;
}

function renderText(text: string) {
  const lines = text.split("\n");
  return lines.map((line, i) => (
    <span key={i}>
      {renderLine(line, i)}
      {i < lines.length - 1 && <br />}
    </span>
  ));
}

const TYPING_FULL = "NexoraAI";

function useTypingText(full: string, delay = 80, startDelay = 400) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    let i = 0;
    const start = setTimeout(() => {
      const interval = setInterval(() => {
        i++;
        setDisplayed(full.slice(0, i));
        if (i >= full.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, delay);
      return () => clearInterval(interval);
    }, startDelay);
    return () => clearTimeout(start);
  }, [full, delay, startDelay]);
  return { displayed, done };
}

function OrbitDot({ radius, speed, startAngle, size = 3, opacity = 0.5 }: {
  radius: number; speed: number; startAngle: number; size?: number; opacity?: number;
}) {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      initial={{ rotate: startAngle }}
      transition={{ duration: speed, repeat: Infinity, ease: "linear" }}
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        width: radius * 2,
        height: radius * 2,
        marginTop: -radius,
        marginLeft: -radius,
        borderRadius: "50%",
      }}
    >
      <div style={{
        position: "absolute",
        top: 0,
        left: "50%",
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
        borderRadius: "50%",
        background: `rgba(255,255,255,${opacity})`,
        boxShadow: `0 0 ${size * 2}px rgba(255,255,255,${opacity * 0.8})`,
      }} />
    </motion.div>
  );
}

export function Chat() {
  const [msgs, setMsgs]               = useState<Msg[]>([]);
  const [history, setHistory]         = useState<GeminiMessage[]>([]);
  const [input, setInput]             = useState("");
  const [attached, setAttached]       = useState<AttachedFile | null>(null);
  const [focused, setFocused]         = useState(false);
  const [isLoading, setIsLoading]     = useState(false);
  const [streamText, setStreamText]   = useState("");
  const [isThinking, setIsThinking]   = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const fileRef     = useRef<HTMLInputElement>(null);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { displayed: typedName, done: typingDone } = useTypingText(TYPING_FULL, 90, 500);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, isLoading, streamText]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [input]);

  const now = () =>
    new Date().toLocaleTimeString("vi", { hour: "2-digit", minute: "2-digit" });

  const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleFileSelect = useCallback(async (file: File) => {
    const sizeMB = file.size / 1024 / 1024;
    if (sizeMB > MAX_FILE_MB) {
      setError(`File quá lớn (${sizeMB.toFixed(1)} MB). Tối đa ${MAX_FILE_MB} MB.`);
      return;
    }
    setError(null);
    try {
      const base64 = await readFileAsBase64(file);
      const previewUrl = file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : undefined;
      setAttached({ name: file.name, type: file.type, size: file.size, base64, previewUrl });
    } catch {
      setError("Không đọc được file.");
    }
  }, []);

  const callGeminiStream = async (
    userText: string,
    fileData: AttachedFile | null,
    currentHistory: GeminiMessage[]
  ): Promise<string> => {
    const userParts: GeminiPart[] = [];

    if (fileData) {
      userParts.push({
        inlineData: { mimeType: fileData.type, data: fileData.base64 },
      });
    }
    if (userText.trim()) {
      userParts.push({ text: userText.trim() });
    }

    const body = {
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [
        ...currentHistory,
        { role: "user", parts: userParts },
      ],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 2048,
      },
    };

    const res = await fetch(CHAT_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({} as Record<string, unknown>));
      const errMsg = (errData as { error?: string })?.error ?? `HTTP ${res.status}`;
      throw new Error(errMsg);
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
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
          if (parsed?.error) {
            throw new Error(parsed.error);
          }
          // Thinking state event from backend
          if (parsed?.type === "thinking") {
            setIsThinking(parsed.active as boolean);
            continue;
          }
          const chunk =
            parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
          if (chunk) {
            fullText += chunk;
            setStreamText(fullText);
          }
        } catch (e) {
          if (e instanceof Error && e.message && !fullText) throw e;
        }
      }
    }

    return fullText;
  };

  const sendMsg = async () => {
    const text = input.trim();
    if ((!text && !attached) || isLoading) return;

    const userMsg: Msg = {
      id: Date.now(),
      role: "user",
      text: text || (attached ? `[File: ${attached.name}]` : ""),
      time: now(),
      file: attached
        ? {
            name: attached.name,
            type: attached.type,
            size: attached.size,
            previewUrl: attached.previewUrl,
          }
        : undefined,
    };

    const fileSnapshot = attached;
    setMsgs((prev) => [...prev, userMsg]);
    setInput("");
    setAttached(null);
    setError(null);
    setIsLoading(true);
    setStreamText("");

    const userParts: GeminiPart[] = [];
    if (fileSnapshot) {
      userParts.push({
        inlineData: { mimeType: fileSnapshot.type, data: fileSnapshot.base64 },
      });
    }
    if (text) userParts.push({ text });

    const nextHistory: GeminiMessage[] = [
      ...history,
      { role: "user", parts: userParts },
    ];

    try {
      const botText = await callGeminiStream(text, fileSnapshot, history);

      const botMsg: Msg = {
        id: Date.now() + 1,
        role: "bot",
        text: botText || "(Không có phản hồi)",
        time: now(),
      };

      setMsgs((prev) => [...prev, botMsg]);
      setHistory([
        ...nextHistory,
        { role: "model", parts: [{ text: botText }] },
      ]);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Lỗi không xác định";
      setError(`Lỗi: ${errMsg}`);
      setMsgs((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "bot",
          text: `⚠️ Không thể kết nối AI: ${errMsg}`,
          time: now(),
          error: true,
        },
      ]);
    } finally {
      setIsLoading(false);
      setStreamText("");
      setIsThinking(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMsg();
    }
  };

  const isEmpty = msgs.length === 0 && !isLoading;

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#050505",
        fontFamily: FONT,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Navigation />

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div style={{
          position: "absolute", top: "20%", left: "20%",
          width: 500, height: 500, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(120,80,255,0.04) 0%, transparent 70%)",
          filter: "blur(60px)",
        }} />
        <div style={{
          position: "absolute", bottom: "20%", right: "10%",
          width: 400, height: 400, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.015) 0%, transparent 70%)",
          filter: "blur(50px)",
        }} />
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", zIndex: 1 }}>

        {/* Messages area */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: isEmpty ? "0" : "56px 16px 12px",
            display: "flex",
            flexDirection: "column",
            justifyContent: isEmpty ? "center" : "flex-start",
            alignItems: isEmpty ? "center" : "stretch",
            gap: 10,
            maxWidth: 720,
            width: "100%",
            margin: "0 auto",
          }}
        >
          {isEmpty ? (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              style={{ textAlign: "center", padding: "0 32px" }}
            >
              {/* Avatar cluster */}
              <div style={{ position: "relative", width: 100, height: 100, margin: "0 auto 20px" }}>

                {/* Outer glow */}
                <motion.div
                  animate={{ opacity: [0.3, 0.7, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  style={{
                    position: "absolute",
                    inset: -20,
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(180,140,255,0.18) 0%, transparent 70%)",
                    filter: "blur(12px)",
                  }}
                />

                {/* Ring 1 — solid, fast CW */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
                  style={{
                    position: "absolute",
                    inset: -6,
                    borderRadius: "50%",
                    border: "1.5px solid transparent",
                    borderTopColor: "rgba(255,255,255,0.55)",
                    borderRightColor: "rgba(255,255,255,0.15)",
                  }}
                />

                {/* Ring 2 — dashed, slow CCW */}
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 13, repeat: Infinity, ease: "linear" }}
                  style={{
                    position: "absolute",
                    inset: -14,
                    borderRadius: "50%",
                    border: "1px dashed rgba(255,255,255,0.18)",
                  }}
                />

                {/* Ring 3 — large, very faint CW */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
                  style={{
                    position: "absolute",
                    inset: -26,
                    borderRadius: "50%",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderTopColor: "rgba(160,130,255,0.25)",
                    borderBottomColor: "rgba(160,130,255,0.08)",
                  }}
                />

                {/* Ring 4 — dotted outermost CCW */}
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
                  style={{
                    position: "absolute",
                    inset: -38,
                    borderRadius: "50%",
                    border: "1px dotted rgba(255,255,255,0.07)",
                  }}
                />

                {/* Orbit dots */}
                <OrbitDot radius={44} speed={5}  startAngle={0}   size={4} opacity={0.6} />
                <OrbitDot radius={50} speed={9}  startAngle={120} size={2.5} opacity={0.35} />
                <OrbitDot radius={56} speed={14} startAngle={240} size={3} opacity={0.25} />
                <OrbitDot radius={41} speed={7}  startAngle={60}  size={2} opacity={0.45} />

                {/* Avatar image */}
                <motion.div
                  animate={{ scale: [1, 1.025, 1] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    overflow: "hidden",
                    border: "2px solid rgba(255,255,255,0.18)",
                    boxShadow: "0 0 24px rgba(140,100,255,0.25), inset 0 0 12px rgba(0,0,0,0.4)",
                  }}
                >
                  <img
                    src="/nexora-avatar2.jpg"
                    alt="NexoraAI"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition: "center top",
                      display: "block",
                    }}
                  />
                </motion.div>
              </div>

              {/* Typing name */}
              <div style={{ marginBottom: 10 }}>
                <span
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    background: "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(200,170,255,0.8) 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    fontFamily: FONT,
                  }}
                >
                  {typedName}
                </span>
                <motion.span
                  animate={{ opacity: typingDone ? 0 : [1, 0, 1] }}
                  transition={{ duration: 0.55, repeat: Infinity }}
                  style={{
                    display: "inline-block",
                    width: 2,
                    height: "1.1em",
                    background: "rgba(200,170,255,0.8)",
                    marginLeft: 2,
                    verticalAlign: "text-bottom",
                    borderRadius: 1,
                  }}
                />
              </div>

              {/* Subtitle — fade in after name typed */}
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.6, duration: 0.6 }}
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.32)",
                  lineHeight: 1.65,
                  maxWidth: 220,
                  margin: "0 auto",
                  letterSpacing: "0.01em",
                }}
              >
                Trợ lý thông minh — hỏi bất kỳ điều gì về Khang, dự án, hay hệ thống NexoraGarden!
              </motion.p>
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
                  <span style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.22)",
                    marginBottom: 2,
                    marginLeft: msg.role === "bot" ? 4 : 0,
                    marginRight: msg.role === "user" ? 4 : 0,
                  }}>
                    {msg.role === "bot" ? "NexoraAI · " : ""}
                    {msg.time}
                  </span>

                  <div style={{
                    maxWidth: "80%",
                    padding: "10px 14px",
                    borderRadius: msg.role === "user" ? "20px 20px 5px 20px" : "20px 20px 20px 5px",
                    background: msg.error
                      ? "rgba(255,60,60,0.08)"
                      : msg.role === "user"
                      ? "rgba(255,255,255,0.09)"
                      : "rgba(255,255,255,0.04)",
                    border: msg.error
                      ? "1px solid rgba(255,60,60,0.2)"
                      : msg.role === "user"
                      ? "1px solid rgba(255,255,255,0.15)"
                      : "1px solid rgba(255,255,255,0.08)",
                    fontSize: 13.5,
                    lineHeight: 1.7,
                    color: msg.error ? "rgba(255,150,150,0.9)" : "rgba(255,255,255,0.82)",
                    backdropFilter: "blur(12px)",
                  }}>
                    {msg.file?.previewUrl && (
                      <img src={msg.file.previewUrl} alt={msg.file.name} style={{
                        maxWidth: "100%", maxHeight: 200, borderRadius: 10,
                        marginBottom: 8, objectFit: "cover",
                      }} />
                    )}
                    {msg.file && !msg.file.previewUrl && (
                      <div style={{
                        display: "flex", alignItems: "center", gap: 7,
                        marginBottom: 7, padding: "6px 10px", borderRadius: 10,
                        background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)",
                      }}>
                        <FileIcon type={msg.file.type} />
                        <span style={{
                          fontSize: 12, color: "rgba(255,255,255,0.55)", flex: 1,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>{msg.file.name}</span>
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", flexShrink: 0 }}>
                          {(msg.file.size / 1024 / 1024).toFixed(1)} MB
                        </span>
                      </div>
                    )}
                    {msg.text && renderText(msg.text)}
                  </div>
                </motion.div>
              ))}

              {/* Streaming bot response */}
              {isLoading && (
                <motion.div
                  key="streaming"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 3 }}
                >
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", marginLeft: 4 }}>
                    NexoraAI
                  </span>
                  <div style={{
                    maxWidth: "80%", padding: "10px 14px",
                    borderRadius: "20px 20px 20px 5px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    fontSize: 13.5, lineHeight: 1.7, color: "rgba(255,255,255,0.82)",
                  }}>
                    {isThinking && !streamText ? (
                      <motion.div
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                        style={{ display: "flex", alignItems: "center", gap: 7, padding: "2px 0" }}
                      >
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          style={{ fontSize: 14, display: "inline-block" }}
                        >⚙️</motion.span>
                        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>Đang suy nghĩ...</span>
                      </motion.div>
                    ) : streamText ? (
                      <>
                        {renderText(streamText)}
                        <motion.span
                          animate={{ opacity: [1, 0, 1] }}
                          transition={{ duration: 0.7, repeat: Infinity }}
                          style={{
                            display: "inline-block", width: 2, height: "1em",
                            background: "rgba(255,255,255,0.5)", marginLeft: 2, verticalAlign: "text-bottom",
                          }}
                        />
                      </>
                    ) : (
                      <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "2px 0" }}>
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            animate={{ y: [0, -5, 0], opacity: [0.35, 1, 0.35] }}
                            transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.14, ease: "easeInOut" }}
                            style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.45)" }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div style={{
          padding: "12px 16px 24px",
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(28px)",
          borderTop: msgs.length > 0 ? "1px solid rgba(255,255,255,0.06)" : "none",
        }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>

            {/* Error message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: "hidden", marginBottom: 10 }}
                >
                  <div style={{
                    display: "flex", alignItems: "center", gap: 7,
                    padding: "8px 13px", borderRadius: 12,
                    background: "rgba(255,60,60,0.08)", border: "1px solid rgba(255,60,60,0.2)",
                  }}>
                    <AlertCircle className="w-3.5 h-3.5 text-red-400/70 flex-shrink-0" />
                    <span style={{ fontSize: 12, color: "rgba(255,150,150,0.85)", flex: 1 }}>{error}</span>
                    <button onClick={() => setError(null)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", lineHeight: 0 }}>
                      <X className="w-3.5 h-3.5 text-white/30" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* File preview chip */}
            <AnimatePresence>
              {attached && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: "hidden", marginBottom: 10 }}
                >
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 7,
                    padding: "6px 12px", borderRadius: 12,
                    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                  }}>
                    {attached.previewUrl ? (
                      <img src={attached.previewUrl} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover" }} />
                    ) : (
                      <FileIcon type={attached.type} />
                    )}
                    <span style={{
                      fontSize: 12, color: "rgba(255,255,255,0.6)", maxWidth: 180,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{attached.name}</span>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.28)" }}>
                      {(attached.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                    <button onClick={() => setAttached(null)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", lineHeight: 0, marginLeft: 2 }}>
                      <X className="w-3.5 h-3.5 text-white/35" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input bar — running-border style like tools */}
            <div
              className="running-border"
              style={{
                "--rb-speed": focused ? "3.5s" : "8s",
                "--rb-color": focused
                  ? "rgba(200,170,255,0.7)"
                  : "rgba(255,255,255,0.22)",
                "--rb-radius": "26px",
              } as React.CSSProperties}
            >
              <div style={{
                display: "flex",
                alignItems: "flex-end",
                background: focused
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(255,255,255,0.03)",
                borderRadius: 25,
                padding: "10px 10px 10px 16px",
                gap: 8,
                minHeight: 56,
                transition: "background 0.25s",
              }}>
                {/* File attach */}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,video/*,audio/*,.pdf,.txt,.json,.csv,.doc,.docx"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(f);
                    e.target.value = "";
                  }}
                />
                <motion.button
                  onClick={() => fileRef.current?.click()}
                  whileHover={{ scale: 1.1, background: "rgba(255,255,255,0.09)" }}
                  whileTap={{ scale: 0.88 }}
                  disabled={isLoading}
                  style={{
                    flexShrink: 0,
                    width: 36,
                    height: 36,
                    borderRadius: 13,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: isLoading ? "not-allowed" : "pointer",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.09)",
                    marginBottom: 1,
                    opacity: isLoading ? 0.4 : 1,
                    transition: "background 0.2s",
                  }}
                >
                  <Paperclip className="w-4 h-4 text-white/45" />
                </motion.button>

                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder={isLoading ? "Đang xử lý…" : "Nhắn tin với NexoraAI…"}
                  disabled={isLoading}
                  rows={1}
                  className="chat-textarea"
                  style={{
                    flex: 1,
                    background: "none",
                    border: "none",
                    outline: "none",
                    resize: "none",
                    color: "rgba(255,255,255,0.85)",
                    fontSize: 14,
                    fontFamily: FONT,
                    lineHeight: 1.6,
                    padding: "8px 0",
                    maxHeight: 120,
                    overflowY: "auto",
                    opacity: isLoading ? 0.5 : 1,
                  }}
                />

                {/* Send button */}
                <motion.button
                  onClick={sendMsg}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.88 }}
                  disabled={isLoading || (!input.trim() && !attached)}
                  animate={
                    (input.trim() || attached) && !isLoading
                      ? { opacity: 1, background: "rgba(180,150,255,0.18)" }
                      : { opacity: 0.3, background: "rgba(255,255,255,0.04)" }
                  }
                  transition={{ duration: 0.2 }}
                  style={{
                    flexShrink: 0,
                    width: 38,
                    height: 38,
                    borderRadius: 13,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: isLoading || (!input.trim() && !attached) ? "not-allowed" : "pointer",
                    marginBottom: 1,
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  {isLoading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      style={{
                        width: 15, height: 15, borderRadius: "50%",
                        border: "1.5px solid rgba(255,255,255,0.15)",
                        borderTopColor: "rgba(200,170,255,0.8)",
                      }}
                    />
                  ) : (
                    <Send className="w-4 h-4 text-white/70" style={{ transform: "translateX(1px)" }} />
                  )}
                </motion.button>
              </div>
            </div>

            <p style={{
              textAlign: "center",
              fontSize: 10,
              color: "rgba(255,255,255,0.13)",
              marginTop: 8,
              fontFamily: FONT,
              letterSpacing: "0.01em",
            }}>
              Enter để gửi · Shift+Enter xuống dòng · Đính kèm ảnh/file tối đa {MAX_FILE_MB} MB
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
