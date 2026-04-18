import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUp, Paperclip, X, FileVideo, FileImage, File, AlertCircle,
  ImageIcon, Plus, Download, Camera,
} from "lucide-react";
import { Navigation } from "@/components/navigation";
import { NEXORA_SYSTEM_DATA } from "@/lib/nexoraData";

const FONT         = "'Plus Jakarta Sans', sans-serif";
const CHAT_API_URL = "/api/chat";
const MAX_FILE_MB  = 15;

function buildSystemPrompt(imageGenEnabled: boolean): string {
  return `Bạn là NexoraAI — trợ lý thông minh được tích hợp trong portfolio của Phan Trọng Khang.
Xưng "mình", gọi người dùng thân mật tùy ngữ cảnh.
Trả lời tiếng Việt trừ khi người dùng viết bằng ngôn ngữ khác.
Thân thiện, ngắn gọn, thực tế. Dùng emoji hợp lý.
Nếu người dùng hỏi về kỹ thuật, hãy giải thích rõ ràng và cụ thể.

DANH TÍNH — BẮT BUỘC TUÂN THỦ TUYỆT ĐỐI:
- Mình là NexoraAI, được Phan Trọng Khang tạo ra và huấn luyện riêng cho hệ thống Nexora.
- Mình KHÔNG phải ChatGPT, Claude, Gemini, Grok hay bất kỳ sản phẩm nào của OpenAI, Anthropic, Google, xAI hay các công ty AI lớn khác.
- Nếu ai hỏi "bạn là ai?", "bạn dùng model gì?", "bạn là GPT không?", "bạn có phải AI của..." → luôn trả lời: mình là NexoraAI do Khang tạo ra. KHÔNG tiết lộ model thực tế bên dưới dưới bất kỳ hình thức nào.

${imageGenEnabled
  ? "CHẾ ĐỘ TẠO ẢNH: ĐANG BẬT — Mình có thể tạo ảnh theo yêu cầu."
  : `CHẾ ĐỘ TẠO ẢNH: ĐANG TẮT
- Tính năng tạo ảnh hiện đang bị tắt.
- Nếu người dùng yêu cầu tạo ảnh, vẽ ảnh, sinh ảnh hoặc bất kỳ yêu cầu tạo hình ảnh nào → nhắc nhở họ bật nút 🎨 "Tạo ảnh" ở thanh nhập phía dưới trước, rồi gửi lại yêu cầu. KHÔNG tự tạo ảnh khi chế độ đang tắt.`}

QUY TẮC MỨC ĐỘ SUY NGHĨ (BẮT BUỘC TUÂN THỦ):
- Câu hỏi đơn giản, chào hỏi, hoặc thông tin đã có sẵn trong tài liệu bên dưới → trả lời NGAY, ngắn gọn, KHÔNG suy nghĩ dài dòng.
  Ví dụ: "Khang là ai?", "NexoraGarden là gì?", "Xin chào" → trả lời thẳng trong 1–3 câu.
- Câu hỏi phức tạp, yêu cầu lập luận, viết code, phân tích, toán học, hoặc người dùng gõ từ "thinking" → mới được suy nghĩ kỹ và trả lời chi tiết.
- TUYỆT ĐỐI không lặp lại context, không giải thích lại chỉ thị, không in ra quá trình suy nghĩ — chỉ trả lời thẳng vào câu hỏi.

QUY TẮC BẮT BUỘC VỀ LINK:
- Khi cần đề cập link hoặc hướng dẫn đến tool/trang nào đó, chỉ đưa ra ĐÚNG MỘT đường link duy nhất quan trọng nhất.
- LUÔN dùng định dạng markdown: [tên hiển thị](https://nexorax.cloud/đường-dẫn)
- Ví dụ đúng: Bạn vào [Background Remover](https://nexorax.cloud/tool/bg-remover) để tách nền nhé!
- KHÔNG liệt kê nhiều link cùng lúc trong một câu trả lời.

DANH SÁCH TOOL & URL (nexorax.cloud):
- Tải video YouTube/TikTok → https://nexorax.cloud/tool/yt-downloader
- Cắt video/audio → https://nexorax.cloud/tool/video-trimmer
- Xóa nền ảnh → https://nexorax.cloud/tool/bg-remover
- Nén ảnh → https://nexorax.cloud/tool/image-compressor
- Trích xuất văn bản từ ảnh (OCR) → https://nexorax.cloud/tool/image-to-text
- Tóm tắt văn bản → https://nexorax.cloud/tool/ai-summarizer
- Dịch thuật → https://nexorax.cloud/tool/ai-translator
- Giải thích code → https://nexorax.cloud/tool/code-explainer
- Giải toán → https://nexorax.cloud/tool/math-solver
- Review code → https://nexorax.cloud/tool/code-review
- Viết email → https://nexorax.cloud/tool/email-writer
- Tạo prompt AI → https://nexorax.cloud/tool/prompt-builder
- Tạo ảnh từ prompt → https://nexorax.cloud/tool/prompt-image
- Định dạng văn bản → https://nexorax.cloud/tool/text-formatter
- Tạo QR code → https://nexorax.cloud/tool/qr-generator
- Tạo mật khẩu → https://nexorax.cloud/tool/password-generator
- Ghi chú → https://nexorax.cloud/tool/note

QUY TẮC DÙNG TOOL — BẮT BUỘC TUÂN THỦ:
Mình CHỈ có thể tự xử lý 2 việc trong chat này:
  1. Tải video/audio (người dùng gửi link YouTube/TikTok kèm từ "tải")
  2. Cắt video/audio (người dùng đính kèm file + ghi thời gian cần cắt)

Với TẤT CẢ các yêu cầu tool khác (xóa nền, nén ảnh, OCR, dịch, tóm tắt, giải toán, viết email, v.v.):
- TUYỆT ĐỐI KHÔNG tự thực hiện hay giả vờ xử lý — mình không có khả năng đó trong chat.
- Thay vào đó: nhẹ nhàng, thân thiện nhắc nhở người dùng tự vào tool, ví dụ:
  "Cái này mình không làm thay được trong chat đâu bạn ơi 😅 Nhưng có tool chuyên dụng ngay trên web nè, bạn thử vào [Tên Tool](url) xem, dễ lắm!"
- Tone: vui vẻ, không cứng nhắc, như bạn bè gợi ý nhau, thêm emoji phù hợp.
- Chỉ đưa ra 1 link duy nhất đến đúng tool cần thiết.

Dưới đây là toàn bộ tài liệu kỹ thuật hệ thống NexoraGarden mà bạn cần nắm rõ:

${NEXORA_SYSTEM_DATA}`;
}

type OpenAIMessage = { role: "user" | "assistant"; content: string };

type AttachedFile = {
  name: string; type: string; size: number; base64: string; previewUrl?: string;
};

type Msg = {
  id:          number;
  role:        "user" | "bot";
  text:        string;
  time:        string;
  model?:      string;
  imageUrl?:   string;
  videoUrl?:   string;
  videoTitle?: string;
  videoThumb?: string;
  file?:       { name: string; type: string; size: number; previewUrl?: string };
  error?:      boolean;
};

const MODEL_LABELS: Record<string, string> = {
  "gpt-4.1":           "GPT-4.1",
  "claude-3.7-sonnet": "Claude 3.7 Sonnet",
  "gemini-2.5-flash":  "Gemini 2.5 Flash",
  "dall-e-3":          "DALL-E 3",
};

const MODEL_COLORS: Record<string, string> = {
  "gpt-4.1":           "rgba(16,163,127,0.25)",
  "claude-3.7-sonnet": "rgba(99,102,241,0.25)",
  "gemini-2.5-flash":  "rgba(234,179,8,0.2)",
  "dall-e-3":          "rgba(239,68,68,0.2)",
};

const STAGE_LABELS: Record<string, string> = {
  routing:    "Đang phân tích...",
  generating: "Đang tạo ảnh...",
};

function FileIcon({ type }: { type: string }) {
  if (type.startsWith("video/")) return <FileVideo className="w-3.5 h-3.5 text-white/50" />;
  if (type.startsWith("image/")) return <FileImage className="w-3.5 h-3.5 text-white/50" />;
  return <File className="w-3.5 h-3.5 text-white/50" />;
}

function ModelBadge({ model }: { model: string }) {
  const label = MODEL_LABELS[model] ?? model;
  const color = MODEL_COLORS[model] ?? "rgba(255,255,255,0.1)";
  return (
    <span style={{
      display:       "inline-block",
      fontSize:      9.5,
      padding:       "1.5px 6px",
      borderRadius:  6,
      background:    color,
      border:        "1px solid rgba(255,255,255,0.12)",
      color:         "rgba(255,255,255,0.55)",
      marginLeft:    5,
      verticalAlign: "middle",
      letterSpacing: "0.02em",
    }}>
      {label}
    </span>
  );
}

function renderLine(line: string, key: number) {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*|`(.+?)`|\*(.+?)\*|\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  let last = 0, match: RegExpExecArray | null;
  while ((match = regex.exec(line)) !== null) {
    if (match.index > last) parts.push(line.slice(last, match.index));
    if (match[1] !== undefined)
      parts.push(<strong key={match.index} style={{ color: "rgba(255,255,255,0.95)", fontWeight: 700 }}>{match[1]}</strong>);
    else if (match[2] !== undefined)
      parts.push(<code key={match.index} style={{ background: "rgba(255,255,255,0.1)", borderRadius: 4, padding: "1px 5px", fontSize: "0.88em", fontFamily: "monospace" }}>{match[2]}</code>);
    else if (match[3] !== undefined)
      parts.push(<em key={match.index}>{match[3]}</em>);
    else if (match[4] !== undefined && match[5] !== undefined)
      parts.push(<a key={match.index} href={match[5]} target="_blank" rel="noopener noreferrer"
        style={{ color: "#60a5fa", textDecoration: "underline", textUnderlineOffset: 3 }}>{match[4]}</a>);
    last = match.index + match[0].length;
  }
  if (last < line.length) parts.push(line.slice(last));
  return <span key={key}>{parts}</span>;
}

function renderText(text: string) {
  return text.split("\n").map((line, i, arr) => (
    <span key={i}>{renderLine(line, i)}{i < arr.length - 1 && <br />}</span>
  ));
}

/* ── Trim helpers ─────────────────────────────────────────────── */
function parseTrimTimes(text: string): { start: number; end: number } | null {
  const patterns = [
    /từ\s+(\d+(?:\.\d+)?)\s*s?\s+đến\s+(\d+(?:\.\d+)?)\s*s/i,
    /from\s+(\d+(?:\.\d+)?)\s*s?\s+to\s+(\d+(?:\.\d+)?)\s*s/i,
    /cắt.*?(\d+(?:\.\d+)?)\s*s.*?đến.*?(\d+(?:\.\d+)?)\s*s/i,
    /(\d+(?:\.\d+)?)\s*s\s*[-–]\s*(\d+(?:\.\d+)?)\s*s/i,
    /(\d+)\s+đến\s+(\d+)\s*(giây|s)/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const start = parseFloat(m[1]!);
      const end   = parseFloat(m[2]!);
      if (!isNaN(start) && !isNaN(end) && end > start) return { start, end };
    }
  }
  return null;
}

function isTrimRequest(text: string, fileType: string): boolean {
  if (!fileType.startsWith("video/") && !fileType.startsWith("audio/")) return false;
  const t = text.toLowerCase();
  return /cắt|trim|cut|clip/.test(t) && parseTrimTimes(text) !== null;
}

const TYPING_FULL = "NexoraAI";

function useTypingText(full: string, delay = 80, startDelay = 400) {
  const [displayed, setDisplayed] = useState("");
  const [done,      setDone]      = useState(false);
  useEffect(() => {
    let i = 0;
    const start = setTimeout(() => {
      const iv = setInterval(() => {
        i++;
        setDisplayed(full.slice(0, i));
        if (i >= full.length) { clearInterval(iv); setDone(true); }
      }, delay);
      return () => clearInterval(iv);
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
      style={{ position: "absolute", top: "50%", left: "50%", width: radius * 2, height: radius * 2,
        marginTop: -radius, marginLeft: -radius, borderRadius: "50%" }}
    >
      <div style={{ position: "absolute", top: 0, left: "50%", width: size, height: size,
        marginLeft: -size / 2, marginTop: -size / 2, borderRadius: "50%",
        background: `rgba(255,255,255,${opacity})`,
        boxShadow: `0 0 ${size * 2}px rgba(255,255,255,${opacity * 0.8})` }} />
    </motion.div>
  );
}

export function Chat() {
  const [msgs,       setMsgs]       = useState<Msg[]>([]);
  const [history,    setHistory]    = useState<OpenAIMessage[]>([]);
  const [input,      setInput]      = useState("");
  const [attached,   setAttached]   = useState<AttachedFile | null>(null);
  const [focused,    setFocused]    = useState(false);
  const [isLoading,  setIsLoading]  = useState(false);
  const [streamText, setStreamText] = useState("");
  const [streamImg,  setStreamImg]  = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [pipeStage,  setPipeStage]  = useState<string>("");
  const [curModel,   setCurModel]   = useState<string>("");
  const [error,      setError]      = useState<string | null>(null);

  const [imageGenEnabled, setImageGenEnabled] = useState(false);
  const [toolsOpen,       setToolsOpen]       = useState(false);

  const fileRef        = useRef<HTMLInputElement>(null);
  const cameraRef      = useRef<HTMLInputElement>(null);
  const bottomRef      = useRef<HTMLDivElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);
  const toolsRef       = useRef<HTMLDivElement>(null);

  const { displayed: typedName, done: typingDone } = useTypingText(TYPING_FULL, 90, 500);


  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, isLoading, streamText]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) setToolsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [input]);

  const now = () => new Date().toLocaleTimeString("vi", { hour: "2-digit", minute: "2-digit" });

  const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleFileSelect = useCallback(async (file: File) => {
    const sizeMB = file.size / 1024 / 1024;
    if (sizeMB > MAX_FILE_MB) { setError(`File quá lớn (${sizeMB.toFixed(1)} MB). Tối đa ${MAX_FILE_MB} MB.`); return; }
    setError(null);
    try {
      const base64    = await readFileAsBase64(file);
      const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
      setAttached({ name: file.name, type: file.type, size: file.size, base64, previewUrl });
    } catch { setError("Không đọc được file."); }
  }, []);


  const callChatStream = async (
    userText:       string,
    fileData:       AttachedFile | null,
    currentHistory: OpenAIMessage[],
  ): Promise<{ text: string; model?: string; imageUrl?: string }> => {
    let userContent = userText.trim();
    if (fileData?.type.startsWith("image/")) {
      userContent = userContent
        ? `[Đính kèm ảnh: ${fileData.name}]\n${userContent}`
        : `[Đính kèm ảnh: ${fileData.name}]`;
    } else if (fileData) {
      userContent = userContent
        ? `[Đính kèm file: ${fileData.name}]\n${userContent}`
        : `[Đính kèm file: ${fileData.name}]`;
    }

    const messages: OpenAIMessage[] = [
      ...currentHistory,
      { role: "user", content: userContent },
    ];

    const res = await fetch(CHAT_API_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ messages, system: buildSystemPrompt(imageGenEnabled), imageGenEnabled }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({} as Record<string, unknown>));
      throw new Error((errData as { error?: string })?.error ?? `HTTP ${res.status}`);
    }

    const reader  = res.body!.getReader();
    const decoder = new TextDecoder();
    let fullText  = "";
    let detectedModel = "";
    let detectedImg: string | undefined;
    let detectedVideo: { url: string; title: string; thumb: string } | undefined;
    let buffer    = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (!raw || raw === "[DONE]") continue;
        try {
          const parsed = JSON.parse(raw) as {
            error?: string;
            type?:  string;
            active?: boolean;
            stage?: string;
            name?:  string;
            text?:  string;
            url?:   string;
            title?: string;
            thumb?: string;
          };
          if (parsed?.error) throw new Error(parsed.error);
          if (parsed?.type === "pipeline") { setPipeStage(STAGE_LABELS[parsed.stage ?? ""] ?? ""); continue; }
          if (parsed?.type === "model")    { detectedModel = parsed.name ?? ""; setCurModel(parsed.name ?? ""); continue; }
          if (parsed?.type === "thinking") { setIsThinking(parsed.active ?? false); continue; }
          if (parsed?.type === "image")    { detectedImg = parsed.url; setStreamImg(parsed.url ?? null); continue; }
          if (parsed?.type === "video")    { detectedVideo = { url: parsed.url ?? "", title: parsed.title ?? "", thumb: parsed.thumb ?? "" }; continue; }
          const chunk = parsed?.text ?? "";
          if (chunk) { fullText += chunk; setStreamText(fullText); }
        } catch (e) {
          if (e instanceof Error && e.message && !fullText) throw e;
        }
      }
    }

    return { text: fullText, model: detectedModel || undefined, imageUrl: detectedImg, video: detectedVideo };
  };

  const handleTrimRequest = useCallback(async (
    userText: string,
    file: AttachedFile,
    start: number,
    end: number,
  ) => {
    const userMsg: Msg = {
      id: Date.now(), role: "user",
      text: userText || `[File: ${file.name}]`,
      time: now(),
      file: { name: file.name, type: file.type, size: file.size, previewUrl: file.previewUrl },
    };
    setMsgs(prev => [...prev, userMsg]);
    setInput("");
    setAttached(null);
    setError(null);
    setIsLoading(true);
    setStreamText("");
    setPipeStage("Đang cắt...");

    try {
      const byteStr = atob(file.base64);
      const bytes   = new Uint8Array(byteStr.length);
      for (let i = 0; i < byteStr.length; i++) bytes[i] = byteStr.charCodeAt(i);
      const blob = new Blob([bytes], { type: file.type });

      const form = new FormData();
      form.append("video", blob, file.name);
      form.append("start", String(start));
      form.append("end",   String(end));

      const res = await fetch("/api/trim", { method: "POST", body: form });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as { error?: string };
        throw new Error(errData.error ?? `HTTP ${res.status}`);
      }

      const resultBlob = await res.blob();
      const dlUrl  = URL.createObjectURL(resultBlob);
      const baseName = file.name.replace(/\.[^.]+$/, "");
      const dlName = `${baseName}_cut_${start}s-${end}s.mp4`;
      const duration = end - start;

      const botMsg: Msg = {
        id: Date.now() + 1, role: "bot", time: now(),
        text: `✅ Đã cắt từ **${start}s** đến **${end}s** (${duration}s). Bấm **Tải xuống** để lưu file.`,
        videoUrl: dlUrl, videoTitle: dlName, videoThumb: "",
      };
      setMsgs(prev => [...prev, botMsg]);
      setHistory(prev => [
        ...prev,
        { role: "user",      content: userText || `[File: ${file.name}]` },
        { role: "assistant", content: botMsg.text },
      ]);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Lỗi không xác định";
      setError(`Lỗi cắt: ${errMsg}`);
      setMsgs(prev => [...prev, {
        id: Date.now() + 1, role: "bot", time: now(), error: true,
        text: `⚠️ Không thể cắt: ${errMsg}`,
      }]);
    } finally {
      setIsLoading(false);
      setPipeStage("");
    }
  }, [history]); // eslint-disable-line react-hooks/exhaustive-deps

  const sendMsg = async () => {
    const text = input.trim();
    if ((!text && !attached) || isLoading) return;

    const userMsg: Msg = {
      id: Date.now(), role: "user",
      text: text || (attached ? `[File: ${attached.name}]` : ""),
      time: now(),
      file: attached ? { name: attached.name, type: attached.type, size: attached.size, previewUrl: attached.previewUrl } : undefined,
    };

    const fileSnapshot = attached;

    /* ── Trim shortcut: video/audio + cắt/trim keywords + time range ── */
    if (fileSnapshot && isTrimRequest(text, fileSnapshot.type)) {
      const times = parseTrimTimes(text)!;
      await handleTrimRequest(text, fileSnapshot, times.start, times.end);
      return;
    }

    setMsgs(prev => [...prev, userMsg]);
    setInput("");
    setAttached(null);
    setError(null);
    setIsLoading(true);
    setStreamText("");
    setStreamImg(null);
    setPipeStage("");
    setCurModel("");

    let userContent = text;
    if (fileSnapshot && !text) userContent = `[File: ${fileSnapshot.name}]`;

    try {
      const { text: botText, model, imageUrl, video } = await callChatStream(text, fileSnapshot, history);

      const botMsg: Msg = {
        id: Date.now() + 1, role: "bot",
        text:       botText || (!imageUrl && !video ? "(Không có phản hồi)" : ""),
        time:       now(),
        model,
        imageUrl,
        videoUrl:   video?.url,
        videoTitle: video?.title,
        videoThumb: video?.thumb,
      };

      setMsgs(prev => [...prev, botMsg]);
      setHistory(prev => [
        ...prev,
        { role: "user",      content: userContent || "" },
        { role: "assistant", content: botText },
      ]);

    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Lỗi không xác định";
      setError(`Lỗi: ${errMsg}`);
      setMsgs(prev => [...prev, {
        id: Date.now() + 1, role: "bot", time: now(), error: true,
        text: `⚠️ Không thể kết nối AI: ${errMsg}`,
      }]);
    } finally {
      setIsLoading(false);
      setStreamText("");
      setStreamImg(null);
      setIsThinking(false);
      setPipeStage("");
      setCurModel("");
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); }
  };

  const isEmpty = msgs.length === 0 && !isLoading;

  const streamingLabel = pipeStage || (isThinking && !streamText ? "Đang suy nghĩ sâu..." : "");

  return (
    <div style={{ minHeight: "100dvh", background: "#050505", fontFamily: FONT, display: "flex", flexDirection: "column" }}>
      <Navigation />

      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div style={{ position: "absolute", top: "20%", left: "20%", width: 500, height: 500, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(120,80,255,0.04) 0%, transparent 70%)", filter: "blur(60px)" }} />
        <div style={{ position: "absolute", bottom: "20%", right: "10%", width: 400, height: 400, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.015) 0%, transparent 70%)", filter: "blur(50px)" }} />
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", zIndex: 1 }}>

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: "auto",
          padding: isEmpty ? "0" : "56px 16px 12px",
          display: "flex", flexDirection: "column",
          justifyContent: isEmpty ? "center" : "flex-start",
          alignItems: isEmpty ? "center" : "stretch",
          gap: 10, maxWidth: 720, width: "100%", margin: "0 auto",
        }}>
          {isEmpty ? (
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              style={{ textAlign: "center", padding: "0 32px" }}>
              <div style={{ position: "relative", width: 100, height: 100, margin: "0 auto 20px" }}>
                <motion.div animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  style={{ position: "absolute", inset: -20, borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(180,140,255,0.18) 0%, transparent 70%)", filter: "blur(12px)" }} />
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
                  style={{ position: "absolute", inset: -6, borderRadius: "50%", border: "1.5px solid transparent",
                    borderTopColor: "rgba(255,255,255,0.55)", borderRightColor: "rgba(255,255,255,0.15)" }} />
                <motion.div animate={{ rotate: -360 }} transition={{ duration: 13, repeat: Infinity, ease: "linear" }}
                  style={{ position: "absolute", inset: -14, borderRadius: "50%", border: "1px dashed rgba(255,255,255,0.18)" }} />
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
                  style={{ position: "absolute", inset: -26, borderRadius: "50%",
                    border: "1px solid rgba(255,255,255,0.06)", borderTopColor: "rgba(160,130,255,0.25)", borderBottomColor: "rgba(160,130,255,0.08)" }} />
                <motion.div animate={{ rotate: -360 }} transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
                  style={{ position: "absolute", inset: -38, borderRadius: "50%", border: "1px dotted rgba(255,255,255,0.07)" }} />
                <OrbitDot radius={44} speed={5}  startAngle={0}   size={4}   opacity={0.6} />
                <OrbitDot radius={50} speed={9}  startAngle={120} size={2.5} opacity={0.35} />
                <OrbitDot radius={56} speed={14} startAngle={240} size={3}   opacity={0.25} />
                <OrbitDot radius={41} speed={7}  startAngle={60}  size={2}   opacity={0.45} />
                <motion.div animate={{ scale: [1, 1.025, 1] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  style={{ position: "absolute", inset: 0, borderRadius: "50%", overflow: "hidden",
                    border: "2px solid rgba(255,255,255,0.18)", boxShadow: "0 0 24px rgba(140,100,255,0.25), inset 0 0 12px rgba(0,0,0,0.4)" }}>
                  <img src="/nexora-avatar2.jpg" alt="NexoraAI"
                    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top", display: "block" }} />
                </motion.div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: "0.06em",
                  background: "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(200,170,255,0.8) 100%)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontFamily: FONT }}>
                  {typedName}
                </span>
                <motion.span animate={{ opacity: typingDone ? 0 : [1, 0, 1] }} transition={{ duration: 0.55, repeat: Infinity }}
                  style={{ display: "inline-block", width: 2, height: "1.1em", background: "rgba(200,170,255,0.8)",
                    marginLeft: 2, verticalAlign: "text-bottom", borderRadius: 1 }} />
              </div>
              <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.6, duration: 0.6 }}
                style={{ fontSize: 11, color: "rgba(255,255,255,0.32)", lineHeight: 1.65, maxWidth: 220, margin: "0 auto", letterSpacing: "0.01em" }}>
                Trợ lý thông minh — hỏi bất kỳ điều gì về Khang, dự án, hay hệ thống NexoraGarden!
              </motion.p>
            </motion.div>
          ) : (
            <AnimatePresence initial={false}>
              {msgs.map((msg) => (
                <motion.div key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 340, damping: 26 }}
                  style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start", gap: 3 }}>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", marginBottom: 2,
                    marginLeft: msg.role === "bot" ? 4 : 0, marginRight: msg.role === "user" ? 4 : 0 }}>
                    {msg.time}
                  </span>
                  <div style={{
                    maxWidth: "80%", padding: "10px 14px",
                    borderRadius: msg.role === "user" ? "20px 20px 5px 20px" : "20px 20px 20px 5px",
                    background: msg.error ? "rgba(255,60,60,0.08)" : msg.role === "user" ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.04)",
                    border: msg.error ? "1px solid rgba(255,60,60,0.2)" : msg.role === "user" ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(255,255,255,0.08)",
                    fontSize: 13.5, lineHeight: 1.7,
                    color: msg.error ? "rgba(255,150,150,0.9)" : "rgba(255,255,255,0.82)",
                    backdropFilter: "blur(12px)",
                  }}>
                    {msg.imageUrl && (
                      <img src={msg.imageUrl} alt="Generated"
                        style={{ maxWidth: "100%", borderRadius: 12, marginBottom: msg.text ? 10 : 0, display: "block" }} />
                    )}
                    {msg.videoUrl && (
                      <div style={{ marginBottom: msg.text ? 10 : 0, borderRadius: 12, overflow: "hidden",
                        background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        {msg.videoThumb && (
                          <img src={msg.videoThumb} alt={msg.videoTitle}
                            style={{ width: "100%", display: "block", maxHeight: 160, objectFit: "cover" }} />
                        )}
                        <div style={{ padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {msg.videoTitle || "Video"}
                          </span>
                          <a href={msg.videoUrl}
                            download={msg.videoTitle || "video"}
                            {...(!msg.videoUrl?.startsWith("blob:") && { target: "_blank", rel: "noopener noreferrer" })}
                            style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "rgba(160,130,255,0.9)",
                              background: "rgba(120,80,220,0.15)", border: "1px solid rgba(120,80,220,0.3)",
                              borderRadius: 8, padding: "4px 10px", textDecoration: "none", flexShrink: 0, whiteSpace: "nowrap" }}>
                            <Download style={{ width: 11, height: 11 }} /> Tải xuống
                          </a>
                        </div>
                      </div>
                    )}
                    {msg.file?.previewUrl && (
                      <img src={msg.file.previewUrl} alt={msg.file.name}
                        style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 10, marginBottom: 8, objectFit: "cover" }} />
                    )}
                    {msg.file && !msg.file.previewUrl && (
                      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7, padding: "6px 10px",
                        borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>
                        <FileIcon type={msg.file.type} />
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {msg.file.name}
                        </span>
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", flexShrink: 0 }}>
                          {(msg.file.size / 1024 / 1024).toFixed(1)} MB
                        </span>
                      </div>
                    )}
                    {msg.text && renderText(msg.text)}
                  </div>
                </motion.div>
              ))}

              {/* Streaming bubble */}
              {isLoading && (
                <motion.div key="streaming"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 3 }}>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", marginLeft: 4 }}>
                    {new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <div style={{ maxWidth: "80%", padding: "10px 14px", borderRadius: "20px 20px 20px 5px",
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                    fontSize: 13.5, lineHeight: 1.7, color: "rgba(255,255,255,0.82)" }}>
                    {streamImg && (
                      <img src={streamImg} alt="Generated"
                        style={{ maxWidth: "100%", borderRadius: 12, marginBottom: 10, display: "block" }} />
                    )}
                    {streamingLabel && !streamText && !streamImg ? (
                      <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                        style={{ display: "flex", alignItems: "center", gap: 7, padding: "2px 0" }}>
                        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>{streamingLabel}</span>
                      </motion.div>
                    ) : streamText ? (
                      <>
                        {renderText(streamText)}
                        <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.7, repeat: Infinity }}
                          style={{ display: "inline-block", width: 2, height: "1em", background: "rgba(255,255,255,0.5)", marginLeft: 2, verticalAlign: "text-bottom" }} />
                      </>
                    ) : !streamImg ? (
                      <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "2px 0" }}>
                        {[0, 1, 2].map(i => (
                          <motion.div key={i} animate={{ y: [0, -5, 0], opacity: [0.35, 1, 0.35] }}
                            transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.14, ease: "easeInOut" }}
                            style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.45)" }} />
                        ))}
                      </div>
                    ) : null}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div style={{ padding: "12px 16px 24px", background: "rgba(0,0,0,0.55)", backdropFilter: "blur(28px)" }}>
          <style>{`
            @keyframes rainbow-spin {
              0%   { background-position: 0% 50%; }
              100% { background-position: 300% 50%; }
            }
            .rainbow-wrap {
              position: relative; border-radius: 21px; padding: 1.5px;
              background: linear-gradient(90deg,#ff0040,#ff6600,#ffcc00,#00ff88,#00cfff,#7c4dff,#ff0040,#ff6600,#ffcc00,#00ff88,#00cfff,#7c4dff);
              background-size: 300% 100%;
              animation: rainbow-spin 3s linear infinite;
            }
            .rainbow-focused { opacity: 1 !important; }
          `}</style>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>

            {/* Error banner */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: "hidden", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 13px", borderRadius: 12,
                    background: "rgba(255,60,60,0.08)", border: "1px solid rgba(255,60,60,0.2)" }}>
                    <AlertCircle className="w-3.5 h-3.5 text-red-400/70 flex-shrink-0" />
                    <span style={{ fontSize: 12, color: "rgba(255,150,150,0.85)", flex: 1 }}>{error}</span>
                    <button onClick={() => setError(null)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", lineHeight: 0 }}>
                      <X className="w-3.5 h-3.5 text-white/30" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Attached file preview */}
            <AnimatePresence>
              {attached && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: "hidden", marginBottom: 8 }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 12px", borderRadius: 12,
                    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    {attached.previewUrl
                      ? <img src={attached.previewUrl} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover" }} />
                      : <FileIcon type={attached.type} />}
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", maxWidth: 180,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{attached.name}</span>
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

            {/* Rainbow border wrap */}
            <div className="rainbow-wrap" style={{ opacity: focused ? 1 : 0.55, transition: "opacity 0.25s" }}>
              <div style={{ background: "#111111", borderRadius: 20, padding: "14px 16px 12px" }}>

                {/* Hidden file input */}
                <input ref={fileRef} type="file"
                  accept="image/*,video/*,audio/*,.pdf,.txt,.json,.csv,.doc,.docx"
                  style={{ display: "none" }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); e.target.value = ""; }} />

                {/* Hidden camera input */}
                <input ref={cameraRef} type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: "none" }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); e.target.value = ""; }} />

                {/* Textarea */}
                <textarea ref={textareaRef} value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                  placeholder={isLoading ? "Đang xử lý…" : "Nhắn tin với NexoraAI…"}
                  disabled={isLoading} rows={1} className="chat-textarea"
                  style={{ width: "100%", background: "none", border: "none", outline: "none", resize: "none",
                    color: "rgba(255,255,255,0.85)", fontSize: 15, fontFamily: FONT, lineHeight: 1.6,
                    padding: 0, marginBottom: 12, maxHeight: 160, overflowY: "auto",
                    opacity: isLoading ? 0.5 : 1, display: "block" }} />

                {/* Bottom action row */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>

                  {/* "+" popup trigger */}
                  <div ref={toolsRef} style={{ position: "relative", flexShrink: 0 }}>
                    <motion.button
                      onClick={() => setToolsOpen(v => !v)}
                      whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }}
                      animate={toolsOpen
                        ? { background: "rgba(120,80,220,0.25)", borderColor: "rgba(120,80,220,0.5)" }
                        : { background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.12)" }}
                      style={{ width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center",
                        justifyContent: "center", border: "1px solid rgba(255,255,255,0.12)", cursor: "pointer" }}>
                      <motion.div animate={{ rotate: toolsOpen ? 45 : 0 }} transition={{ duration: 0.2 }}>
                        <Plus style={{ width: 16, height: 16, color: toolsOpen ? "rgba(200,160,255,0.9)" : "rgba(255,255,255,0.55)" }} />
                      </motion.div>
                    </motion.button>

                    {/* Popup menu */}
                    <AnimatePresence>
                      {toolsOpen && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9, y: 8 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: 8 }}
                          transition={{ duration: 0.15, ease: "easeOut" }}
                          style={{ position: "absolute", bottom: "calc(100% + 10px)", left: 0,
                            background: "rgba(16,16,16,0.97)", border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 16, padding: "6px 0", minWidth: 190,
                            boxShadow: "0 8px 32px rgba(0,0,0,0.6)", backdropFilter: "blur(20px)", zIndex: 100 }}>

                          {/* Camera */}
                          <button
                            onClick={() => { cameraRef.current?.click(); setToolsOpen(false); }}
                            disabled={isLoading}
                            style={{ width: "100%", display: "flex", alignItems: "center", gap: 13, padding: "11px 16px",
                              background: "none", border: "none", cursor: isLoading ? "not-allowed" : "pointer",
                              color: "rgba(255,255,255,0.75)", textAlign: "left", opacity: isLoading ? 0.4 : 1 }}>
                            <div style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                              background: "rgba(255,255,255,0.08)" }}>
                              <Camera style={{ width: 15, height: 15 }} />
                            </div>
                            <span style={{ fontSize: 14, fontFamily: FONT, fontWeight: 500 }}>Camera</span>
                          </button>

                          {/* Tạo ảnh */}
                          <button
                            onClick={() => { setImageGenEnabled(v => !v); setToolsOpen(false); }}
                            disabled={isLoading}
                            style={{ width: "100%", display: "flex", alignItems: "center", gap: 13, padding: "11px 16px",
                              background: imageGenEnabled ? "rgba(168,85,247,0.08)" : "none", border: "none", cursor: "pointer",
                              color: imageGenEnabled ? "rgba(200,160,255,0.9)" : "rgba(255,255,255,0.75)", textAlign: "left" }}>
                            <div style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                              background: imageGenEnabled ? "rgba(168,85,247,0.2)" : "rgba(255,255,255,0.08)" }}>
                              <ImageIcon style={{ width: 15, height: 15 }} />
                            </div>
                            <span style={{ fontSize: 14, fontFamily: FONT, fontWeight: 500 }}>
                              Tạo ảnh {imageGenEnabled ? "✓" : ""}
                            </span>
                          </button>

                          {/* Đính kèm */}
                          <button
                            onClick={() => { fileRef.current?.click(); setToolsOpen(false); }}
                            disabled={isLoading}
                            style={{ width: "100%", display: "flex", alignItems: "center", gap: 13, padding: "11px 16px",
                              background: "none", border: "none", cursor: isLoading ? "not-allowed" : "pointer",
                              color: "rgba(255,255,255,0.75)", textAlign: "left", opacity: isLoading ? 0.4 : 1 }}>
                            <div style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                              background: "rgba(255,255,255,0.08)" }}>
                              <Paperclip style={{ width: 15, height: 15 }} />
                            </div>
                            <span style={{ fontSize: 14, fontFamily: FONT, fontWeight: 500 }}>Đính kèm</span>
                          </button>

                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Spacer */}
                  <div style={{ flex: 1 }} />

                  {/* Send circle button */}
                  <motion.button onClick={sendMsg}
                    whileHover={(input.trim() || attached) && !isLoading ? { scale: 1.08 } : {}}
                    whileTap={(input.trim() || attached) && !isLoading ? { scale: 0.92 } : {}}
                    disabled={isLoading || (!input.trim() && !attached)}
                    animate={(input.trim() || attached) && !isLoading
                      ? { background: "#7c5cbf" }
                      : { background: "rgba(255,255,255,0.08)" }}
                    transition={{ duration: 0.18 }}
                    style={{ width: 38, height: 38, borderRadius: "50%", display: "flex", alignItems: "center",
                      justifyContent: "center", flexShrink: 0, border: "none",
                      cursor: isLoading || (!input.trim() && !attached) ? "not-allowed" : "pointer" }}>
                    {isLoading
                      ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          style={{ width: 15, height: 15, borderRadius: "50%",
                            border: "2px solid rgba(255,255,255,0.15)", borderTopColor: "rgba(255,255,255,0.8)" }} />
                      : <ArrowUp style={{ width: 17, height: 17, color: (input.trim() || attached) ? "#fff" : "rgba(255,255,255,0.3)" }} />}
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
