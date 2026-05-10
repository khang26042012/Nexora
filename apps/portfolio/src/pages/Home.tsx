import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useInView,
} from "framer-motion";
import { useRef, useEffect, useState, Suspense, lazy } from "react";
import {
  Mail, Phone, Github, ChevronDown, ExternalLink, MapPin, Calendar, Briefcase,
} from "lucide-react";
import { FaFacebook, FaTelegram, FaInstagram, FaTiktok } from "react-icons/fa";
import { SiZalo } from "react-icons/si";
import { Navigation } from "@/components/navigation";
import avatarImg from "@/assets/avatar_new.jpg";
import avatarVideo from "@/assets/avatar-gojo.mp4";

const OceanCanvas = lazy(() =>
  import("@/components/OceanCanvas").then((m) => ({ default: m.OceanCanvas }))
);

const FONT = "'Plus Jakarta Sans', sans-serif";

const CONTACTS = [
  { icon: Github, label: "GitHub", value: "khang26042012", href: "https://github.com/khang26042012", isReactIcon: false },
  { icon: Mail, label: "Email", value: "trongkhabgphan@gmail.com", href: "mailto:trongkhabgphan@gmail.com", isReactIcon: false },
  { icon: FaFacebook, label: "Facebook", value: "Phan Trọng Khang", href: "https://www.facebook.com/share/1CAZqbwCgB/", isReactIcon: true },
  { icon: FaTelegram, label: "Telegram", value: "+84 352 234 521", href: "https://t.me/+84352234521", isReactIcon: true },
  { icon: Phone, label: "SĐT", value: "0352 234 521", href: "tel:0352234521", isReactIcon: false },
  { icon: SiZalo, label: "Zalo", value: "0352 234 521", href: "https://zalo.me/0352234521", isReactIcon: true },
  { icon: FaInstagram, label: "Instagram", value: "khang.trong.809039", href: "https://www.instagram.com/khang.trong.809039", isReactIcon: true },
  { icon: FaTiktok, label: "TikTok", value: "@phantrongkhangg", href: "https://www.tiktok.com/@phantrongkhangg", isReactIcon: true },
];

const SKILLS = [
  { name: "React", color: "#38bdf8" },
  { name: "TypeScript", color: "#60a5fa" },
  { name: "Node.js", color: "#34d399" },
  { name: "Express", color: "#6ee7b7" },
  { name: "SQLite", color: "#93c5fd" },
  { name: "WebSocket", color: "#67e8f9" },
  { name: "ESP32", color: "#5eead4" },
  { name: "C++", color: "#7dd3fc" },
  { name: "Python", color: "#86efac" },
  { name: "Google Gemini", color: "#a5b4fc" },
  { name: "Telegram Bot", color: "#38bdf8" },
  { name: "Docker", color: "#60a5fa" },
  { name: "Railway", color: "#818cf8" },
  { name: "Vite", color: "#c084fc" },
  { name: "Three.js", color: "#34d399" },
  { name: "IoT", color: "#2dd4bf" },
];

const TIMELINE = [
  { year: "2021", title: "Bước chân vào Tin học", desc: "Lần đầu tiếp xúc với máy tính và thế giới công nghệ thông tin. Từ những thao tác cơ bản nhất, mình bắt đầu nuôi dưỡng niềm đam mê với lĩnh vực này — tìm hiểu cách máy tính hoạt động, khám phá các phần mềm và dần nhận ra rằng đây là con đường mình muốn theo đuổi." },
  { year: "T3/2022", title: "Giải Nhất Tin học cấp trường", desc: "Sau gần một năm miệt mài luyện tập và tự học, mình đạt giải Nhất trong kỳ thi Tin học cấp trường. Đây là lần đầu tiên mình cảm nhận được trái ngọt của sự nỗ lực — một cột mốc nhỏ nhưng đầy ý nghĩa, tiếp thêm động lực để tiếp tục tiến xa hơn." },
  { year: "T5/2022", title: "Giải Khuyến Khích cấp tỉnh", desc: "Lần đầu tiên bước ra đấu trường lớn hơn — kỳ thi Tin học cấp tỉnh. Dù chỉ đạt giải Khuyến Khích, nhưng với mình đó là bước ngoặt quan trọng: được đo lường năng lực với các bạn từ nhiều trường khác, học được cách đối mặt với áp lực thi cử và càng quyết tâm hơn để phát triển bản thân." },
  { year: "2023", title: "Chuyển hướng sang Lập trình", desc: "Nhận ra rằng lập trình mới là đích đến thật sự, mình bắt đầu tự học web development — HTML, CSS, JavaScript rồi dần tiến lên các framework hiện đại. Những dòng code đầu tiên, những project nho nhỏ từ tay mình tạo ra đã khơi dậy đam mê mạnh mẽ hơn bao giờ hết." },
  { year: "2024", title: "Ra mắt nhiều Project thực tế", desc: "Năm 2024 là năm mình thực sự bứt phá: xây dựng và hoàn thiện nhiều project thực tế, làm chủ fullstack development với React, Node.js, Express, SQLite. Mỗi project là một bài học lớn — từ kiến trúc hệ thống, tối ưu hiệu năng cho đến triển khai lên cloud." },
  { year: "2025", title: "Ra mắt NexoraAI", desc: "Xây dựng NexoraAI — một hệ thống AI assistant tích hợp Google Gemini và Telegram Bot, cho phép người dùng trò chuyện, hỏi đáp và xử lý thông tin thông minh ngay trên Telegram. Đây là lần đầu mình chạm vào lĩnh vực AI thực sự." },
  { year: "2026", title: "Ra mắt NexoraGarden", desc: "NexoraGarden — đứa con tự hào nhất tính đến thời điểm này. Hệ thống IoT vườn thông minh kết hợp ESP32, WebSocket real-time, Telegram Bot, và AI phân tích dữ liệu cảm biến. Người dùng có thể theo dõi và điều khiển vườn từ xa qua giao diện web và Telegram, 24/7." },
];

const PROJECTS = [
  {
    title: "NexoraGarden",
    subtitle: "IoT Smart Garden System",
    desc: "Hệ thống vườn thông minh kết hợp ESP32, WebSocket real-time, Telegram Bot và AI phân tích dữ liệu cảm biến. Cho phép theo dõi và điều khiển vườn từ xa 24/7 qua web dashboard và Telegram.",
    tags: ["ESP32", "React", "WebSocket", "Telegram Bot", "SQLite", "Railway"],
    href: "https://github.com/khang26042012/Nexora",
    live: true,
    accent: "#00b4d8",
  },
  {
    title: "NexoraAI",
    subtitle: "AI Assistant tích hợp Telegram",
    desc: "Hệ thống AI assistant thông minh tích hợp Google Gemini API, hoạt động trực tiếp qua Telegram Bot. Hỗ trợ trả lời câu hỏi, phân tích văn bản và xử lý thông tin theo ngữ cảnh.",
    tags: ["Google Gemini", "Telegram Bot", "Node.js", "Express"],
    href: "https://github.com/khang26042012",
    accent: "#38bdf8",
  },
  {
    title: "NexoraTool",
    subtitle: "Video Downloader Platform",
    desc: "Nền tảng tải video từ YouTube, Streamable và 1000+ trang web với yt-dlp + ffmpeg. Hỗ trợ nhiều định dạng và chất lượng đến 4K, giao diện web đơn giản, dễ sử dụng.",
    tags: ["yt-dlp", "ffmpeg", "Node.js", "React", "Vite"],
    href: "/tool/yt-downloader",
    internal: true,
    accent: "#5eead4",
  },
];

/* ── Scroll Progress ── */
function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let ticking = false;
    const update = () => {
      ticking = false;
      const el = barRef.current;
      if (!el) return;
      const h = document.documentElement.scrollHeight - window.innerHeight;
      const p = h > 0 ? window.scrollY / h : 0;
      el.style.transform = `scaleX(${p})`;
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-[2px]" style={{ background: "rgba(0,180,216,0.1)" }}>
      <div ref={barRef} style={{ height: "100%", width: "100%", background: "linear-gradient(90deg, #0077b6, #00b4d8, #90e0ef)", transformOrigin: "left center", transform: "scaleX(0)", willChange: "transform" }} />
    </div>
  );
}

/* ── Animated Counter ── */
function AnimCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting && !started) setStarted(true); }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [started]);
  useEffect(() => {
    if (!started) return;
    let frame = 0;
    const total = 60;
    const tick = () => { frame++; setCount(Math.round((frame / total) * target)); if (frame < total) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }, [started, target]);
  return <span ref={ref}>{count}{suffix}</span>;
}

/* ── Section Header ── */
function SectionHeader({ label, title }: { label: string; title: string }) {
  return (
    <div className="flex flex-col items-center gap-3 mb-14 text-center">
      <motion.span
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-semibold tracking-[0.2em] uppercase"
        style={{ background: "rgba(0,180,216,0.12)", border: "1px solid rgba(0,180,216,0.25)", color: "#90e0ef" }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#00b4d8", boxShadow: "0 0 8px #00b4d8" }} />
        {label}
      </motion.span>
      <motion.h2
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.1 }}
        style={{ fontFamily: FONT, fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1 }}
        className="ocean-gradient-text"
      >
        {title}
      </motion.h2>
      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.25 }}
        className="h-[2px] w-20 rounded-full"
        style={{ background: "linear-gradient(90deg, #0077b6, #00b4d8, transparent)", transformOrigin: "left" }}
      />
    </div>
  );
}

/* ── Glass Card ── */
function GlassCard({ children, className = "", style = {}, hover = true }: {
  children: React.ReactNode; className?: string; style?: React.CSSProperties; hover?: boolean;
}) {
  return (
    <motion.div
      whileHover={hover ? { y: -4, boxShadow: "0 20px 60px rgba(0,119,182,0.25), 0 0 0 1px rgba(0,180,216,0.2)" } : undefined}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={className}
      style={{
        background: "rgba(0,20,50,0.55)",
        border: "1px solid rgba(0,180,216,0.15)",
        borderRadius: 20,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}

/* ── Typewriter ── */
function Typewriter({ words, speed = 80 }: { words: string[]; speed?: number }) {
  const [idx, setIdx] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = words[idx % words.length];
    const timeout = setTimeout(() => {
      if (!deleting) {
        if (text.length < word.length) setText(word.slice(0, text.length + 1));
        else setTimeout(() => setDeleting(true), 1800);
      } else {
        if (text.length > 0) setText(text.slice(0, -1));
        else { setDeleting(false); setIdx(i => i + 1); }
      }
    }, deleting ? speed / 2 : speed);
    return () => clearTimeout(timeout);
  }, [text, deleting, idx, words, speed]);

  return (
    <span>
      {text}
      <span className="animate-pulse" style={{ color: "#00b4d8", marginLeft: 2 }}>|</span>
    </span>
  );
}

export function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.92]);
  const smoothY = useSpring(heroY, { stiffness: 100, damping: 30 });

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const start = () => vid.play().catch(() => {});
    if ("requestIdleCallback" in window) (window as any).requestIdleCallback(start, { timeout: 1500 });
    else setTimeout(start, 600);
  }, []);

  return (
    <div
      ref={containerRef}
      className="min-h-screen text-white overflow-x-hidden"
      style={{ fontFamily: FONT, background: "#000814" }}
    >
      {/* ── VIDEO BACKGROUND ── */}
      <div className="fixed inset-0" style={{ zIndex: -2 }}>
        <video
          ref={videoRef}
          loop muted playsInline preload="metadata"
          disableRemotePlayback
          className="w-full h-full object-cover"
          style={{ opacity: 0.45 }}
        >
          <source src="/hero-bg.mp4" type="video/mp4" />
        </video>
        {/* Ocean depth gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(180deg, rgba(0,8,20,0.55) 0%, rgba(0,8,20,0.3) 40%, rgba(0,8,20,0.7) 80%, rgba(0,8,20,0.95) 100%)",
          }}
        />
        {/* Radial vignette */}
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,8,20,0.6) 100%)" }}
        />
      </div>

      {/* ── THREE.JS OCEAN CANVAS ── */}
      <Suspense fallback={null}>
        <OceanCanvas />
      </Suspense>

      <ScrollProgress />
      <Navigation />

      {/* ══════ HERO ══════ */}
      <section
        ref={heroRef}
        id="trang-chu"
        className="relative min-h-screen flex flex-col items-center justify-center px-5 overflow-hidden"
      >
        {/* Animated glow orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position: "absolute", top: "20%", left: "10%",
              width: 400, height: 400, borderRadius: "50%",
              background: "radial-gradient(circle, rgba(0,119,182,0.18) 0%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />
          <motion.div
            animate={{ x: [0, -20, 0], y: [0, 30, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 3 }}
            style={{
              position: "absolute", top: "30%", right: "10%",
              width: 500, height: 500, borderRadius: "50%",
              background: "radial-gradient(circle, rgba(0,180,216,0.12) 0%, transparent 70%)",
              filter: "blur(50px)",
            }}
          />
          <motion.div
            animate={{ x: [0, 15, 0], y: [0, 25, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 6 }}
            style={{
              position: "absolute", bottom: "20%", left: "30%",
              width: 300, height: 300, borderRadius: "50%",
              background: "radial-gradient(circle, rgba(144,224,239,0.1) 0%, transparent 70%)",
              filter: "blur(30px)",
            }}
          />
        </div>

        <motion.div
          style={{ y: smoothY, opacity: heroOpacity, scale: heroScale }}
          className="w-full max-w-3xl mx-auto flex flex-col items-center text-center gap-6 pt-28 pb-20"
        >
          {/* Avatar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: "relative" }}
          >
            {/* Orbit rings */}
            {[
              { inset: -28, speed: "30s", border: "1px dashed rgba(0,180,216,0.2)", reverse: true },
              { inset: -18, speed: "10s", borderTop: "2px solid rgba(0,180,216,0.7)", borderRight: "2px solid rgba(0,180,216,0.1)", borderBottom: "2px solid transparent", borderLeft: "2px solid rgba(0,180,216,0.15)" },
              { inset: -8, speed: "6s", borderTop: "1.5px solid rgba(144,224,239,0.5)", borderRight: "1.5px solid transparent", borderBottom: "1.5px solid rgba(0,180,216,0.2)", borderLeft: "1.5px solid transparent" },
            ].map((r, i) => (
              <div
                key={i}
                className={r.reverse ? "ring-ccw" : "ring-cw"}
                style={{
                  position: "absolute",
                  inset: r.inset,
                  borderRadius: "50%",
                  border: r.border,
                  borderTop: (r as any).borderTop,
                  borderRight: (r as any).borderRight,
                  borderBottom: (r as any).borderBottom,
                  borderLeft: (r as any).borderLeft,
                  "--ring-speed": r.speed,
                } as React.CSSProperties}
              />
            ))}

            {/* Glow */}
            <motion.div
              animate={{ opacity: [0.4, 0.8, 0.4], scale: [1, 1.15, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position: "absolute", inset: -16, borderRadius: "50%",
                boxShadow: "0 0 40px 8px rgba(0,180,216,0.2)",
                pointerEvents: "none",
              }}
            />

            {/* Avatar */}
            <div
              className="rounded-full overflow-hidden"
              style={{
                width: 104, height: 104,
                border: "2px solid rgba(0,180,216,0.4)",
                boxShadow: "0 0 30px rgba(0,180,216,0.25), inset 0 0 20px rgba(0,119,182,0.1)",
              }}
            >
              <video src={avatarVideo} poster={avatarImg} width={104} height={104}
                autoPlay muted loop playsInline preload="auto"
                className="w-full h-full object-cover" style={{ display: "block" }} />
            </div>

            {/* Online dot */}
            <motion.span
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full"
              style={{
                background: "#34d399",
                border: "2px solid #000814",
                boxShadow: "0 0 10px rgba(52,211,153,0.7)",
                display: "block",
              }}
            />
          </motion.div>

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-[11px] font-semibold tracking-[0.18em] uppercase"
            style={{ background: "rgba(0,119,182,0.15)", border: "1px solid rgba(0,180,216,0.25)", color: "#90e0ef" }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#00b4d8", boxShadow: "0 0 8px #00b4d8" }} />
            AI Architect · IoT Engineer
          </motion.div>

          {/* Name */}
          <div className="overflow-hidden">
            <motion.h1
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              style={{
                fontFamily: FONT,
                fontSize: "clamp(2.6rem, 10vw, 5.5rem)",
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: "-0.03em",
              }}
              className="ocean-gradient-text"
            >
              Phan Trọng Khang
            </motion.h1>
          </div>

          {/* Tagline with typewriter */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45 }}
            className="text-white/50 text-base sm:text-lg font-light max-w-lg leading-relaxed"
          >
            Xây dựng{" "}
            <span style={{ color: "#00b4d8", fontWeight: 600 }}>
              <Typewriter words={["hệ thống AI thông minh", "IoT vườn thông minh", "ứng dụng Web hiện đại", "giải pháp thực tế"]} />
            </span>
          </motion.p>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6 }}
            className="flex items-center gap-8"
          >
            {[
              { value: "5+", label: "Năm đam mê" },
              { value: "10+", label: "Projects" },
              { value: "3+", label: "Năm kinh nghiệm" },
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <span style={{ fontSize: "1.6rem", fontWeight: 800, color: "#00b4d8", fontFamily: FONT }}>{s.value}</span>
                <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em" }}>{s.label}</span>
              </div>
            ))}
          </motion.div>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.75 }}
            className="flex items-center gap-3 flex-wrap justify-center"
          >
            <motion.button
              onClick={() => document.querySelector("#gioi-thieu")?.scrollIntoView({ behavior: "smooth" })}
              whileHover={{ scale: 1.04, boxShadow: "0 0 30px rgba(0,180,216,0.4)" }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-7 py-3 rounded-full font-semibold text-sm"
              style={{
                background: "linear-gradient(135deg, #0077b6, #00b4d8)",
                color: "#fff",
                border: "none",
                boxShadow: "0 4px 20px rgba(0,119,182,0.35)",
              }}
            >
              Khám phá thêm
              <ChevronDown className="w-4 h-4" />
            </motion.button>

            <motion.a
              href="https://github.com/khang26042012"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-7 py-3 rounded-full font-semibold text-sm"
              style={{
                background: "rgba(0,180,216,0.1)",
                border: "1px solid rgba(0,180,216,0.3)",
                color: "#90e0ef",
              }}
            >
              <Github className="w-4 h-4" />
              GitHub
            </motion.a>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span style={{ fontSize: "0.65rem", letterSpacing: "0.2em", color: "rgba(144,224,239,0.4)", textTransform: "uppercase" }}>Scroll</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            style={{
              width: 1.5, height: 40,
              background: "linear-gradient(180deg, rgba(0,180,216,0.6), transparent)",
              borderRadius: 1,
            }}
          />
        </motion.div>
      </section>

      {/* ══════ GIỚI THIỆU ══════ */}
      <section id="gioi-thieu" className="relative py-28 px-5">
        <div className="max-w-5xl mx-auto">
          <SectionHeader label="Về mình" title="Giới thiệu" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Avatar card */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <GlassCard style={{ padding: "32px" }}>
                <div className="flex flex-col items-center gap-5">
                  <div style={{ position: "relative" }}>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                      style={{
                        position: "absolute", inset: -10, borderRadius: "18px",
                        border: "1px dashed rgba(0,180,216,0.2)",
                        pointerEvents: "none",
                      }}
                    />
                    <div
                      className="rounded-2xl overflow-hidden"
                      style={{
                        width: 150, height: 150,
                        border: "2px solid rgba(0,180,216,0.3)",
                        boxShadow: "0 0 30px rgba(0,180,216,0.2)",
                      }}
                    >
                      <video src={avatarVideo} poster={avatarImg} width={150} height={150}
                        autoPlay muted loop playsInline preload="metadata"
                        className="w-full h-full object-cover" style={{ display: "block" }} />
                    </div>
                  </div>

                  <div className="text-center">
                    <h3 style={{ fontFamily: FONT, fontWeight: 700, fontSize: "1.1rem", color: "#fff" }}>Phan Trọng Khang</h3>
                    <p style={{ fontSize: "0.82rem", color: "#90e0ef", marginTop: 4 }}>AI Architect · IoT Engineer</p>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" style={{ color: "rgba(255,255,255,0.35)" }} />
                      <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.35)" }}>Vĩnh Hòa, Việt Nam</p>
                    </div>
                  </div>

                  <div className="w-full" style={{ borderTop: "1px solid rgba(0,180,216,0.1)", paddingTop: 16 }}>
                    {[
                      { label: "Năm sinh", value: "2012", icon: Calendar },
                      { label: "Kinh nghiệm", value: <><AnimCounter target={3} />+ năm</>, icon: Briefcase },
                      { label: "Projects", value: <><AnimCounter target={10} />+</>, icon: ExternalLink },
                    ].map((row, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                        className="flex justify-between items-center text-sm mt-3"
                      >
                        <span style={{ color: "rgba(255,255,255,0.35)", display: "flex", alignItems: "center", gap: 6 }}>
                          <row.icon className="w-3.5 h-3.5" />
                          {row.label}
                        </span>
                        <span style={{ color: "#90e0ef", fontWeight: 600 }}>{row.value}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </GlassCard>
            </motion.div>

            {/* Bio + skills */}
            <div className="flex flex-col gap-4">
              {[
                "Mình là <b>Phan Trọng Khang</b> — một lập trình viên trẻ đến từ Vĩnh Hòa, Việt Nam. Với niềm đam mê mãnh liệt với công nghệ, mình tập trung vào việc xây dựng các hệ thống thông minh kết hợp <em>Trí tuệ nhân tạo (AI)</em>, <em>IoT</em> và <em>Phát triển Web</em>.",
                "Từ năm 2021, mình bắt đầu hành trình khám phá tin học và lập trình. Qua từng năm, mình không ngừng học hỏi, thử nghiệm và xây dựng — từ những project nhỏ đầu tay cho đến các hệ thống phức tạp như <em>NexoraAI</em> và <em>NexoraGarden</em>.",
              ].map((text, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.7, delay: i * 0.12 }}
                >
                  <GlassCard style={{ padding: "22px 24px" }} hover={false}>
                    <p
                      className="text-white/60 text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: text
                          .replace(/<b>/g, '<span style="color:#fff;font-weight:600;">')
                          .replace(/<\/b>/g, "</span>")
                          .replace(/<em>/g, '<span style="color:#90e0ef;">')
                          .replace(/<\/em>/g, "</span>"),
                      }}
                    />
                  </GlassCard>
                </motion.div>
              ))}

              {/* Skills */}
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, delay: 0.25 }}
              >
                <GlassCard style={{ padding: "22px 24px" }} hover={false}>
                  <p style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(144,224,239,0.5)", marginBottom: 12 }}>Kỹ năng</p>
                  <div className="flex flex-wrap gap-2">
                    {SKILLS.map((s, idx) => (
                      <motion.span
                        key={s.name}
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.03 }}
                        whileHover={{ scale: 1.08, y: -2 }}
                        className="text-[11px] font-semibold px-3 py-1 rounded-full cursor-default"
                        style={{
                          background: `${s.color}18`,
                          border: `1px solid ${s.color}35`,
                          color: s.color,
                        }}
                      >
                        {s.name}
                      </motion.span>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════ TIMELINE ══════ */}
      <section id="hanh-trinh" className="relative py-28 px-5">
        {/* Decorative */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent, rgba(0,20,50,0.4), transparent)", pointerEvents: "none" }} />
        <div className="max-w-4xl mx-auto relative">
          <SectionHeader label="Hành trình" title="Câu chuyện của tôi" />

          <div className="relative">
            {/* Timeline line */}
            <motion.div
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              style={{
                position: "absolute", left: "50%", top: 0, bottom: 0, width: 1,
                background: "linear-gradient(180deg, transparent, rgba(0,180,216,0.4), rgba(0,180,216,0.6), rgba(0,180,216,0.4), transparent)",
                transformOrigin: "top",
              }}
              className="hidden md:block"
            />

            <div className="flex flex-col gap-8">
              {TIMELINE.map((item, i) => {
                const isLeft = i % 2 === 0;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: isLeft ? -50 : 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                    className={`relative flex md:items-center ${isLeft ? "md:flex-row" : "md:flex-row-reverse"} flex-row gap-4`}
                  >
                    {/* Card */}
                    <div className="flex-1">
                      <GlassCard style={{ padding: "20px 24px" }}>
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className="text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full"
                            style={{ background: "rgba(0,180,216,0.15)", color: "#00b4d8", border: "1px solid rgba(0,180,216,0.25)" }}
                          >
                            {item.year}
                          </span>
                        </div>
                        <h3 style={{ fontFamily: FONT, fontWeight: 700, fontSize: "1rem", color: "#e0f2fe", marginBottom: 8 }}>{item.title}</h3>
                        <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>{item.desc}</p>
                      </GlassCard>
                    </div>

                    {/* Center dot */}
                    <motion.div
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                      className="hidden md:flex flex-shrink-0 z-10 items-center justify-center"
                      style={{
                        width: 36, height: 36, borderRadius: "50%",
                        background: "rgba(0,20,50,0.8)",
                        border: "2px solid rgba(0,180,216,0.5)",
                        boxShadow: "0 0 20px rgba(0,180,216,0.3)",
                      }}
                    >
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#00b4d8", boxShadow: "0 0 8px #00b4d8" }} />
                    </motion.div>

                    <div className="hidden md:block flex-1" />
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ══════ PROJECTS ══════ */}
      <section id="du-an" className="relative py-28 px-5">
        <div className="max-w-5xl mx-auto">
          <SectionHeader label="Dự án" title="Projects nổi bật" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PROJECTS.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
              >
                <GlassCard
                  style={{
                    padding: "28px",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                    borderTop: `2px solid ${p.accent}40`,
                  }}
                >
                  {/* Accent glow top */}
                  <div
                    style={{
                      position: "absolute", top: 0, left: "20%", right: "20%", height: 1,
                      background: `linear-gradient(90deg, transparent, ${p.accent}80, transparent)`,
                      borderRadius: 1,
                    }}
                  />

                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 style={{ fontFamily: FONT, fontWeight: 700, fontSize: "1.1rem", color: "#e0f2fe" }}>{p.title}</h3>
                      {p.live && (
                        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: "rgba(52,211,153,0.15)", color: "#34d399", border: "1px solid rgba(52,211,153,0.25)" }}>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />LIVE
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: "0.78rem", color: p.accent, fontWeight: 500 }}>{p.subtitle}</p>
                  </div>

                  <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.7, flex: 1 }}>{p.desc}</p>

                  <div className="flex flex-wrap gap-1.5">
                    {p.tags.map((t) => (
                      <span key={t} className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{ background: `${p.accent}15`, color: p.accent, border: `1px solid ${p.accent}25` }}>
                        {t}
                      </span>
                    ))}
                  </div>

                  <motion.a
                    href={p.href}
                    target={p.internal ? "_self" : "_blank"}
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold mt-auto"
                    style={{
                      background: `linear-gradient(135deg, ${p.accent}20, ${p.accent}10)`,
                      border: `1px solid ${p.accent}30`,
                      color: p.accent,
                    }}
                  >
                    Xem dự án
                    <ExternalLink className="w-3.5 h-3.5" />
                  </motion.a>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ CONTACTS ══════ */}
      <section id="lien-he" className="relative py-28 px-5">
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent, rgba(0,20,60,0.5), transparent)", pointerEvents: "none" }} />
        <div className="max-w-4xl mx-auto relative">
          <SectionHeader label="Liên hệ" title="Kết nối với tôi" />

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {CONTACTS.map((c, i) => {
              const Icon = c.icon as any;
              return (
                <motion.a
                  key={i}
                  href={c.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.06 }}
                  whileHover={{ y: -6, boxShadow: "0 16px 40px rgba(0,119,182,0.3)" }}
                  className="flex flex-col items-center gap-3 p-5 rounded-2xl cursor-pointer"
                  style={{
                    background: "rgba(0,20,50,0.5)",
                    border: "1px solid rgba(0,180,216,0.15)",
                    backdropFilter: "blur(12px)",
                    textDecoration: "none",
                    transition: "box-shadow 0.3s ease",
                  }}
                >
                  <div
                    className="flex items-center justify-center rounded-xl"
                    style={{
                      width: 44, height: 44,
                      background: "rgba(0,119,182,0.15)",
                      border: "1px solid rgba(0,180,216,0.2)",
                    }}
                  >
                    <Icon size={20} style={{ color: "#00b4d8" }} />
                  </div>
                  <div className="text-center">
                    <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "#90e0ef" }}>{c.label}</p>
                    <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.35)", marginTop: 2, wordBreak: "break-all" }}>{c.value}</p>
                  </div>
                </motion.a>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════ FOOTER ══════ */}
      <footer className="relative py-10 px-5" style={{ borderTop: "1px solid rgba(0,180,216,0.08)" }}>
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #0077b6, #00b4d8)", boxShadow: "0 0 20px rgba(0,180,216,0.3)" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#fff" }}>K</span>
          </div>
          <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.25)", textAlign: "center" }}>
            © 2026 Phan Trọng Khang · Xây dựng với React, Three.js & đam mê
          </p>
          <div className="flex items-center gap-1">
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 8px rgba(52,211,153,0.6)" }} />
            <span style={{ fontSize: "0.7rem", color: "rgba(52,211,153,0.7)" }}>Available for opportunities</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
