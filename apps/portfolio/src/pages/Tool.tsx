import { Navigation } from "@/components/navigation";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import { Search, Video, ArrowUpRight, Sparkles, Lock, Scissors, FileText, ScanText, Wand2, NotebookPen, QrCode, ImageDown, AlignLeft, Languages, Code2, Calculator, ImageOff, ShieldCheck, Mail, KeyRound, ImageIcon, Inbox, Pin, ArrowLeftRight } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

const TOOLS = [
  {
    id: "temp-mail",
    icon: Inbox,
    iconColor: "rgba(147,197,253,0.85)",
    iconBg: "rgba(147,197,253,0.08)",
    iconBorder: "rgba(147,197,253,0.2)",
    glowColor: "rgba(147,197,253,0.06)",
    name: "Temp Mail",
    desc: "Tạo hàng loạt email ảo theo domain — nhận OTP, link xác minh tức thì. Dùng để thử nền tảng, chặn spam, đăng ký không cần email thật.",
    tag: "Email · News",
    tagColor: "rgba(255,255,255,0.6)",
    available: true,
    pinned: true,
    beta: true,
    route: "/tool/temp-mail",
  },
  {
    id: "file-converter",
    icon: ArrowLeftRight,
    iconColor: "rgba(167,243,208,0.85)",
    iconBg: "rgba(167,243,208,0.08)",
    iconBorder: "rgba(167,243,208,0.2)",
    glowColor: "rgba(167,243,208,0.06)",
    name: "File Converter",
    desc: "Chuyển đổi file ngay trên trình duyệt — TXT↔PDF, Ảnh→PDF, CSV↔JSON, MD→TXT, TXT→DOCX và nhiều hơn. Không upload lên server.",
    tag: "Utility · News",
    tagColor: "rgba(255,255,255,0.6)",
    available: true,
    pinned: true,
    beta: true,
    route: "/tool/file-converter",
  },
  {
    id: "prompt-image",
    icon: ImageIcon,
    iconColor: "rgba(255,255,255,0.75)",
    iconBg: "rgba(255,255,255,0.06)",
    iconBorder: "rgba(255,255,255,0.18)",
    glowColor: "rgba(255,255,255,0.08)",
    name: "Prompt Image",
    desc: "Upload ảnh bất kỳ — AI suy nghĩ sâu và tạo prompt chi tiết để tái tạo ảnh với độ giống 98–100% cho Midjourney, DALL-E, Flux.",
    tag: "AI · Image",
    tagColor: "rgba(255,255,255,0.6)",
    available: true,
    route: "/tool/prompt-image",
  },
  {
    id: "code-review",
    icon: ShieldCheck,
    iconColor: "rgba(255,255,255,0.75)",
    iconBg: "rgba(255,255,255,0.06)",
    iconBorder: "rgba(255,255,255,0.18)",
    glowColor: "rgba(255,255,255,0.08)",
    name: "Code Review AI",
    desc: "Phân tích code chuyên sâu: phát hiện bug, lỗ hổng bảo mật, vấn đề hiệu năng và gợi ý refactor.",
    tag: "AI",
    tagColor: "rgba(255,255,255,0.6)",
    available: true,
    route: "/tool/code-review",
  },
  {
    id: "email-writer",
    icon: Mail,
    iconColor: "rgba(255,255,255,0.75)",
    iconBg: "rgba(255,255,255,0.06)",
    iconBorder: "rgba(255,255,255,0.18)",
    glowColor: "rgba(255,255,255,0.08)",
    name: "Email Writer",
    desc: "Nhập ý tưởng ngắn — AI viết email hoàn chỉnh, chuyên nghiệp với nhiều tone và loại email.",
    tag: "AI",
    tagColor: "rgba(255,255,255,0.6)",
    available: true,
    route: "/tool/email-writer",
  },
  {
    id: "password-generator",
    icon: KeyRound,
    iconColor: "rgba(255,255,255,0.75)",
    iconBg: "rgba(255,255,255,0.06)",
    iconBorder: "rgba(255,255,255,0.18)",
    glowColor: "rgba(255,255,255,0.08)",
    name: "Password Generator",
    desc: "Tạo mật khẩu mạnh, ngẫu nhiên — tuỳ chỉnh độ dài, ký tự, kiểm tra độ bảo mật. Chạy 100% trên trình duyệt.",
    tag: "Security",
    tagColor: "rgba(255,255,255,0.6)",
    available: true,
    route: "/tool/password-generator",
  },
  {
    id: "qr-generator",
    icon: QrCode,
    iconColor: "rgba(255,255,255,0.75)",
    iconBg: "rgba(255,255,255,0.06)",
    iconBorder: "rgba(255,255,255,0.18)",
    glowColor: "rgba(255,255,255,0.08)",
    name: "QR Generator",
    desc: "Tạo mã QR từ văn bản, URL, số điện thoại — tùy chỉnh màu sắc, kích thước và tải về PNG.",
    tag: "Utility",
    tagColor: "rgba(255,255,255,0.6)",
    available: true,
    route: "/tool/qr-generator",
  },
  {
    id: "image-compressor",
    icon: ImageDown,
    iconColor: "rgba(255,255,255,0.75)",
    iconBg: "rgba(255,255,255,0.06)",
    iconBorder: "rgba(255,255,255,0.18)",
    glowColor: "rgba(255,255,255,0.08)",
    name: "Image Compressor",
    desc: "Nén ảnh giảm dung lượng — chọn chất lượng, định dạng (WebP/JPEG/PNG), xem trước trước khi tải về.",
    tag: "Image",
    tagColor: "rgba(255,255,255,0.6)",
    available: true,
    route: "/tool/image-compressor",
  },
  {
    id: "ai-summarizer",
    icon: AlignLeft,
    iconColor: "rgba(255,255,255,0.75)",
    iconBg: "rgba(255,255,255,0.06)",
    iconBorder: "rgba(255,255,255,0.18)",
    glowColor: "rgba(255,255,255,0.08)",
    name: "AI Summarizer",
    desc: "Tóm tắt văn bản dài bằng AI — chọn độ chi tiết ngắn/vừa/dài, kèm từ khoá chính.",
    tag: "AI",
    tagColor: "rgba(255,255,255,0.6)",
    available: true,
    route: "/tool/ai-summarizer",
  },
  {
    id: "ai-translator",
    icon: Languages,
    iconColor: "rgba(255,255,255,0.75)",
    iconBg: "rgba(255,255,255,0.06)",
    iconBorder: "rgba(255,255,255,0.18)",
    glowColor: "rgba(255,255,255,0.08)",
    name: "AI Translator",
    desc: "Dịch văn bản sang 10 ngôn ngữ bằng AI — chọn phong cách dịch và nhận ghi chú thuật ngữ.",
    tag: "AI",
    tagColor: "rgba(255,255,255,0.6)",
    available: true,
    route: "/tool/ai-translator",
  },
  {
    id: "ai-code-explainer",
    icon: Code2,
    iconColor: "rgba(255,255,255,0.75)",
    iconBg: "rgba(255,255,255,0.06)",
    iconBorder: "rgba(255,255,255,0.18)",
    glowColor: "rgba(255,255,255,0.08)",
    name: "Code Explainer",
    desc: "Dán code vào — AI giải thích từng phần, phát hiện bug và gợi ý cải thiện.",
    tag: "AI",
    tagColor: "rgba(255,255,255,0.6)",
    available: true,
    route: "/tool/code-explainer",
  },
  {
    id: "ai-math-solver",
    icon: Calculator,
    iconColor: "rgba(255,255,255,0.75)",
    iconBg: "rgba(255,255,255,0.06)",
    iconBorder: "rgba(255,255,255,0.18)",
    glowColor: "rgba(255,255,255,0.08)",
    name: "Math Solver",
    desc: "Giải toán từng bước bằng AI — nhập đề bài hoặc chụp ảnh bài toán.",
    tag: "AI",
    tagColor: "rgba(255,255,255,0.6)",
    available: true,
    route: "/tool/math-solver",
  },
  {
    id: "bg-remover",
    icon: ImageOff,
    iconColor: "rgba(255,255,255,0.75)",
    iconBg: "rgba(255,255,255,0.06)",
    iconBorder: "rgba(255,255,255,0.18)",
    glowColor: "rgba(255,255,255,0.08)",
    name: "Background Remover",
    desc: "Xóa nền ảnh bằng AI — xuất PNG trong suốt, paste thẳng vào Canva hoặc PowerPoint. Chạy hoàn toàn trên thiết bị.",
    tag: "AI · Image",
    tagColor: "rgba(255,255,255,0.6)",
    available: true,
    route: "/tool/bg-remover",
  },
  {
    id: "prompt-builder",
    icon: Wand2,
    iconColor: "rgba(255,255,255,0.75)",
    iconBg: "rgba(255,255,255,0.06)",
    iconBorder: "rgba(255,255,255,0.18)",
    glowColor: "rgba(255,255,255,0.08)",
    name: "Prompt Builder",
    desc: "Tạo prompt AI chuẩn — tự điền form hoặc để AI viết lại từ mô tả đơn giản.",
    tag: "AI",
    tagColor: "rgba(255,255,255,0.6)",
    available: true,
    route: "/tool/prompt-builder",
  },
  {
    id: "image-to-text",
    icon: ScanText,
    iconColor: "rgba(255,255,255,0.75)",
    iconBg: "rgba(255,255,255,0.06)",
    iconBorder: "rgba(255,255,255,0.18)",
    glowColor: "rgba(255,255,255,0.08)",
    name: "Image to Text",
    desc: "Chuyển ảnh chụp tài liệu, đề thi, trang sách, bảng trắng thành văn bản chỉnh sửa được. Xuất ra 5 định dạng.",
    tag: "OCR",
    tagColor: "rgba(255,255,255,0.6)",
    available: true,
    route: "/tool/image-to-text",
  },
  {
    id: "text-formatter",
    icon: FileText,
    iconColor: "rgba(255,255,255,0.75)",
    iconBg: "rgba(255,255,255,0.06)",
    iconBorder: "rgba(255,255,255,0.18)",
    glowColor: "rgba(255,255,255,0.08)",
    name: "Text Formatter",
    desc: "Tự động căn chỉnh, định dạng văn bản bằng AI — upload file, nhập text hoặc để AI tạo nội dung theo yêu cầu.",
    tag: "AI",
    tagColor: "rgba(255,255,255,0.6)",
    available: true,
    route: "/tool/text-formatter",
  },
  {
    id: "video-trimmer",
    icon: Scissors,
    iconColor: "rgba(255,255,255,0.75)",
    iconBg: "rgba(255,255,255,0.06)",
    iconBorder: "rgba(255,255,255,0.18)",
    glowColor: "rgba(255,255,255,0.08)",
    name: "Video Trimmer",
    desc: "Cắt video theo mốc thời gian. Nhập điểm bắt đầu & kết thúc, tool tự cắt đoạn giữa.",
    tag: "Video",
    tagColor: "rgba(255,255,255,0.6)",
    available: true,
    route: "/tool/video-trimmer",
  },
  {
    id: "note",
    icon: NotebookPen,
    iconColor: "rgba(255,255,255,0.75)",
    iconBg: "rgba(255,255,255,0.06)",
    iconBorder: "rgba(255,255,255,0.18)",
    glowColor: "rgba(255,255,255,0.08)",
    name: "Note",
    desc: "Viết ghi chú nhanh — tạo liên kết chia sẻ cho bất kỳ ai. Lưu vĩnh viễn, không cần đăng ký, xuất 5 định dạng.",
    tag: "Share",
    tagColor: "rgba(255,255,255,0.6)",
    available: true,
    route: "/tool/note",
  },
  {
    id: "yt-downloader",
    icon: Video,
    iconColor: "rgba(255,255,255,0.75)",
    iconBg: "rgba(255,255,255,0.06)",
    iconBorder: "rgba(255,255,255,0.18)",
    glowColor: "rgba(255,255,255,0.08)",
    name: "Video Downloader",
    desc: "Tải video đa nền tảng — YouTube, TikTok, Instagram, Facebook & 1000+ trang khác. Chọn chất lượng, tải ngay.",
    tag: "Video",
    tagColor: "rgba(255,255,255,0.6)",
    available: true,
    route: "/tool/yt-downloader",
  },
];

/* ── Animated Border Card — đường sáng chạy theo viền (mask-composite) ── */
function AnimBorderCard({
  children, speed = 4, color = "rgba(255,255,255,0.85)",
  radius = 16, glowOnHover: _goh = false, className = "", innerStyle = {},
}: {
  children: React.ReactNode; speed?: number; color?: string;
  radius?: number; glowOnHover?: boolean; className?: string; innerStyle?: React.CSSProperties;
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

/* ── Floating Particles ── */
function Particles() {
  const pts = Array.from({ length: 14 }, (_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 100,
    s: Math.random() * 2.5 + 0.8, d: Math.random() * 10 + 7, delay: Math.random() * 5, op: Math.random() * 0.2 + 0.04,
  }));
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {pts.map(p => (
        <motion.div key={p.id}
          style={{ position: "absolute", left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s, borderRadius: "50%", background: "rgba(255,255,255,0.7)", opacity: p.op }}
          animate={{ y: [0, -50, 0], opacity: [p.op, p.op * 3, p.op], scale: [1, 1.5, 1] }}
          transition={{ duration: p.d, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

/* ── Tool Card ── */
function ToolCard({ tool, index }: { tool: typeof TOOLS[0]; index: number }) {
  const [hovered, setHovered] = useState(false);
  const [, navigate] = useLocation();
  const Icon = tool.icon;
  const rotX = useMotionValue(0);
  const rotY = useMotionValue(0);
  const sRX = useSpring(rotX, { stiffness: 200, damping: 18 });
  const sRY = useSpring(rotY, { stiffness: 200, damping: 18 });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    rotX.set(((e.clientY - r.top - r.height / 2) / (r.height / 2)) * -6);
    rotY.set(((e.clientX - r.left - r.width / 2) / (r.width / 2)) * 6);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.1 + index * 0.12, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => { setHovered(false); rotX.set(0); rotY.set(0); }}
      onMouseMove={handleMove}
      onClick={() => tool.available && tool.route && navigate(tool.route)}
      className="relative cursor-pointer select-none"
      style={{ perspective: "900px" }}
    >
      {/* Hover glow */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: "absolute", inset: -4, borderRadius: 20, zIndex: -1,
              background: "radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.05) 0%, transparent 70%)",
              filter: "blur(12px)",
            }}
          />
        )}
      </AnimatePresence>

      <AnimBorderCard speed={4} color="rgba(255,255,255,0.5)" radius={18} glowOnHover>
        <motion.div
          style={{ rotateX: sRX, rotateY: sRY, transformStyle: "preserve-3d", padding: "20px" }}
          className="relative flex flex-col gap-4 overflow-hidden"
        >
          {/* Shimmer */}
          <motion.div
            className="absolute top-0 left-0 w-36 h-36 pointer-events-none"
            animate={{ opacity: hovered ? 0.5 : 0.15 }}
            style={{ background: `radial-gradient(ellipse at 0% 0%, ${tool.glowColor} 0%, transparent 70%)` }}
          />

          {/* Pin badge */}
          {(tool as { pinned?: boolean }).pinned && (
            <div className="absolute top-3 left-3 flex items-center gap-1 px-1.5 py-0.5 rounded"
              style={{ background: "rgba(147,197,253,0.1)", border: "1px solid rgba(147,197,253,0.2)" }}>
              <Pin className="w-2.5 h-2.5" style={{ color: "rgba(147,197,253,0.7)" }} />
              <span className="text-[8px] font-bold tracking-widest uppercase" style={{ color: "rgba(147,197,253,0.7)" }}>Ghim</span>
            </div>
          )}

          {/* Corner arrow */}
          <motion.div
            className="absolute top-4 right-4"
            animate={{ opacity: hovered ? 1 : 0, x: hovered ? 0 : 5, y: hovered ? 0 : -5 }}
            transition={{ duration: 0.2 }}
          >
            {tool.available
              ? <ArrowUpRight className="w-4 h-4 text-white/60" />
              : <Lock className="w-3.5 h-3.5 text-white/20" />}
          </motion.div>

          {/* Icon */}
          <div className="relative w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: tool.iconBg, border: `1px solid ${tool.iconBorder}` }}>
            <motion.div
              animate={{ scale: hovered ? 1.12 : 1, rotate: hovered ? 8 : 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <Icon className="w-5 h-5" style={{ color: tool.iconColor }} />
            </motion.div>
            <AnimatePresence>
              {hovered && (
                <motion.div
                  className="absolute inset-0 rounded-xl"
                  initial={{ opacity: 0.7, scale: 1 }}
                  animate={{ opacity: 0, scale: 1.9 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  style={{ border: `1px solid rgba(255,255,255,0.5)` }}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Text */}
          <div className="flex flex-col gap-1.5 relative">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-white/90">{tool.name}</h3>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md tracking-wide"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.55)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}>
                {tool.tag}
              </span>
              {(tool as { beta?: boolean }).beta && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded tracking-widest uppercase"
                  style={{ background: "rgba(251,191,36,0.12)", color: "rgba(251,191,36,0.8)", border: "1px solid rgba(251,191,36,0.2)" }}>
                  Beta
                </span>
              )}
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
              {tool.desc}
            </p>
          </div>

          {/* Bottom sweep bar */}
          <motion.div
            className="h-px w-full rounded-full"
            animate={{ scaleX: hovered ? 1 : 0, opacity: hovered ? 1 : 0 }}
            style={{
              background: "linear-gradient(to right, transparent, rgba(255,255,255,0.4), transparent)",
              transformOrigin: "left",
            }}
            transition={{ duration: 0.35 }}
          />
        </motion.div>
      </AnimBorderCard>
    </motion.div>
  );
}

/* ── Page ── */
export function Tool() {
  const [query, setQuery] = useState("");
  const filtered = TOOLS.filter(t =>
    t.name.toLowerCase().includes(query.toLowerCase()) ||
    t.desc.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-h-screen" style={{ background: "#050505" }}>
      <Navigation />
      <Particles />

      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-20%] left-[-10%] w-[55vw] h-[55vw] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(255,255,255,0.04) 0%, transparent 70%)" }}
        />
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 4 }}
          className="absolute bottom-0 right-[-10%] w-[40vw] h-[40vw] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(255,255,255,0.03) 0%, transparent 70%)" }}
        />
      </div>

      <div className="relative max-w-3xl mx-auto px-5 pt-28 pb-20">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10"
        >
          <div className="flex items-center gap-2 mb-3">
            <motion.div
              animate={{ rotate: [0, 15, -10, 15, 0] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 4 }}
            >
              <Sparkles className="w-4 h-4" style={{ color: "rgba(255,255,255,0.5)" }} />
            </motion.div>
            <span className="text-xs font-mono tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>
              Công cụ
            </span>
          </div>
          <h1 className="text-3xl font-black text-white mb-2">Tool Box</h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            Các tiện ích nhỏ mình tự làm — dùng miễn phí, không cần đăng ký.
          </p>
        </motion.div>

        {/* Search bar */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10"
        >
          <AnimBorderCard speed={6} color="rgba(255,255,255,0.35)" radius={14}>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: "rgba(255,255,255,0.25)" }} />
              <input
                type="text"
                placeholder="Tìm tool..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 rounded-[13px] text-sm text-white/80 outline-none"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  caretColor: "rgba(255,255,255,0.7)",
                }}
              />
            </div>
          </AnimBorderCard>
        </motion.div>

        {/* Grid */}
        <AnimatePresence mode="popLayout">
          {filtered.length > 0 ? (
            <motion.div
              key="grid"
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {filtered.map((tool, i) => (
                <ToolCard key={tool.id} tool={tool} index={i} />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center py-20"
            >
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.25)" }}>
                Không tìm thấy tool nào khớp với "{query}"
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
