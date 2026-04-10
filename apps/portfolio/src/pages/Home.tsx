import { motion, useMotionValue, useSpring, AnimatePresence, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { Mail, Phone, Github, ChevronDown, ExternalLink } from "lucide-react";
import {
  FaFacebook, FaTelegram, FaInstagram, FaTiktok,
} from "react-icons/fa";
import { SiZalo } from "react-icons/si";
import { Navigation } from "@/components/navigation";
import avatarImg from "@/assets/avatar_new.jpg";

const FONT = "'Plus Jakarta Sans', sans-serif";

const VIDEO_URL =
  "https://res.cloudinary.com/dfonotyfb/video/upload/v1775585556/dds3_1_rqhg7x.mp4";

const CONTACTS = [
  { icon: Github, label: "GitHub", value: "khang26042012", href: "https://github.com/khang26042012", isReactIcon: false },
  { icon: Mail, label: "Email", value: "trongkhabgphan@gmail.com", href: "mailto:trongkhabgphan@gmail.com", isReactIcon: false },
  { icon: FaFacebook, label: "Facebook", value: "Phan Trọng Khang", href: "https://www.facebook.com/share/1CAZqbwCgB/", isReactIcon: true },
  { icon: FaTelegram, label: "Telegram", value: "+84 352 234 521", href: "https://t.me/+84352234521", isReactIcon: true },
  { icon: Phone, label: "SĐT", value: "0352 234 521", href: "tel:0352234521", isReactIcon: false },
  { icon: SiZalo, label: "Zalo", value: "0352 234 521", href: "https://zalo.me/0352234521", isReactIcon: true },
  { icon: FaInstagram, label: "Instagram", value: "khang.trong.809039", href: "https://www.instagram.com/khang.trong.809039?igsh=MWdsbWU1bGdobzNjeA==", isReactIcon: true },
  { icon: FaTiktok, label: "TikTok", value: "@phantrongkhangg", href: "https://www.tiktok.com/@phantrongkhangg", isReactIcon: true },
];

const SKILLS = [
  "React", "TypeScript", "Node.js", "Express", "SQLite",
  "WebSocket", "ESP32", "C++", "Python", "Google Gemini",
  "Telegram Bot", "Docker", "Railway", "Vite", "IoT",
];

const TIMELINE = [
  { year: "2021", title: "Bước chân vào Tin học", desc: "Lần đầu tiếp xúc với máy tính và thế giới công nghệ thông tin. Từ những thao tác cơ bản nhất, mình bắt đầu nuôi dưỡng niềm đam mê với lĩnh vực này — tìm hiểu cách máy tính hoạt động, khám phá các phần mềm và dần nhận ra rằng đây là con đường mình muốn theo đuổi." },
  { year: "T3/2022", title: "Giải Nhất Tin học cấp trường", desc: "Sau gần một năm miệt mài luyện tập và tự học, mình đạt giải Nhất trong kỳ thi Tin học cấp trường. Đây là lần đầu tiên mình cảm nhận được trái ngọt của sự nỗ lực — một cột mốc nhỏ nhưng đầy ý nghĩa, tiếp thêm động lực để tiếp tục tiến xa hơn." },
  { year: "T5/2022", title: "Giải Khuyến Khích cấp tỉnh", desc: "Lần đầu tiên bước ra đấu trường lớn hơn — kỳ thi Tin học cấp tỉnh. Dù chỉ đạt giải Khuyến Khích, nhưng với mình đó là bước ngoặt quan trọng: được đo lường năng lực với các bạn từ nhiều trường khác, học được cách đối mặt với áp lực thi cử và càng quyết tâm hơn để phát triển bản thân." },
  { year: "2023", title: "Chuyển hướng sang Lập trình", desc: "Nhận ra rằng lập trình mới là đích đến thật sự, mình bắt đầu tự học web development — HTML, CSS, JavaScript rồi dần tiến lên các framework hiện đại. Những dòng code đầu tiên, những project nho nhỏ từ tay mình tạo ra đã khơi dậy đam mê mạnh mẽ hơn bao giờ hết." },
  { year: "2024", title: "Ra mắt nhiều Project thực tế", desc: "Năm 2024 là năm mình thực sự bứt phá: xây dựng và hoàn thiện nhiều project thực tế, làm chủ fullstack development với React, Node.js, Express, SQLite. Mỗi project là một bài học lớn — từ kiến trúc hệ thống, tối ưu hiệu năng cho đến triển khai lên cloud. Đây là giai đoạn mình trưởng thành nhanh nhất." },
  { year: "2025", title: "Ra mắt NexoraAI", desc: "Xây dựng NexoraAI — một hệ thống AI assistant tích hợp Google Gemini và Telegram Bot, cho phép người dùng trò chuyện, hỏi đáp và xử lý thông tin thông minh ngay trên Telegram. Đây là lần đầu mình chạm vào lĩnh vực AI thực sự, kết hợp tư duy sản phẩm với kỹ thuật backend để tạo ra một trải nghiệm hoàn chỉnh." },
  { year: "2026", title: "Ra mắt NexoraGarden", desc: "NexoraGarden — đứa con tự hào nhất tính đến thời điểm này. Hệ thống IoT vườn thông minh kết hợp ESP32, WebSocket real-time, Telegram Bot, và AI phân tích dữ liệu cảm biến. Người dùng có thể theo dõi và điều khiển vườn từ xa qua giao diện web và Telegram, 24/7." },
];

const PROJECTS = [
  { title: "NexoraGarden", subtitle: "IoT Smart Garden System", desc: "Hệ thống vườn thông minh kết hợp ESP32, WebSocket real-time, Telegram Bot và AI phân tích dữ liệu cảm biến. Cho phép theo dõi và điều khiển vườn từ xa 24/7 qua web dashboard và Telegram.", tags: ["ESP32", "React", "WebSocket", "Telegram Bot", "SQLite", "Railway"], href: "https://github.com/khang26042012/Nexora", live: true },
  { title: "NexoraAI", subtitle: "AI Assistant tích hợp Telegram", desc: "Hệ thống AI assistant thông minh tích hợp Google Gemini API, hoạt động trực tiếp qua Telegram Bot. Hỗ trợ trả lời câu hỏi, phân tích văn bản và xử lý thông tin theo ngữ cảnh.", tags: ["Google Gemini", "Telegram Bot", "Node.js", "Express"], href: "https://github.com/khang26042012" },
  { title: "NexoraTool", subtitle: "Video Downloader Platform", desc: "Nền tảng tải video từ YouTube, Streamable và 1000+ trang web với yt-dlp + ffmpeg. Hỗ trợ nhiều định dạng và chất lượng đến 4K, giao diện web đơn giản, dễ sử dụng.", tags: ["yt-dlp", "ffmpeg", "Node.js", "React", "Vite"], href: "/tool/yt-downloader", internal: true },
];

const glass: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 20,
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
};

/* ── Animated Border Card — một đường sáng ngắn chạy theo viền (mask-composite) ── */
function AnimBorderCard({
  children,
  className = "",
  speed = 4,
  color = "rgba(255,255,255,0.85)",
  radius = 20,
  innerStyle = {},
  glowOnHover: _goh = false,
  animate = true,
}: {
  children: React.ReactNode;
  className?: string;
  speed?: number;
  color?: string;
  radius?: number;
  innerStyle?: React.CSSProperties;
  glowOnHover?: boolean;
  animate?: boolean;
}) {
  return (
    <div
      className={`running-border ${!animate ? "animation-paused" : ""} ${className}`}
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

/* ── Scroll Progress Bar ── */
function ScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const update = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(h > 0 ? window.scrollY / h : 0);
    };
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-[2px]" style={{ background: "rgba(255,255,255,0.05)" }}>
      <motion.div
        style={{ height: "100%", width: `${progress * 100}%`, background: "rgba(255,255,255,0.5)", transformOrigin: "left" }}
        transition={{ ease: "linear" }}
      />
    </div>
  );
}

/* ── Morphing Orb ── */
function MorphOrb({ x, y, size, color, duration }: { x: string; y: string; size: string; color: string; duration: number }) {
  return (
    <motion.div
      className="absolute pointer-events-none rounded-full"
      style={{ left: x, top: y, width: size, height: size, background: color, filter: "blur(80px)" }}
      animate={{
        scale: [1, 1.3, 0.85, 1.15, 1],
        x: [0, 40, -30, 20, 0],
        y: [0, -30, 40, -20, 0],
        opacity: [0.4, 0.7, 0.35, 0.6, 0.4],
      }}
      transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

/* ── Counter ── */
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
    const tick = () => {
      frame++;
      setCount(Math.round((frame / total) * target));
      if (frame < total) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [started, target]);
  return <span ref={ref}>{count}{suffix}</span>;
}

export function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  const aboutRef = useRef<HTMLElement>(null);
  const timelineRef = useRef<HTMLElement>(null);
  const projectsRef = useRef<HTMLElement>(null);
  const isAboutInView = useInView(aboutRef, { margin: "0px 0px -100px 0px" });
  const isTimelineInView = useInView(timelineRef, { margin: "0px 0px -100px 0px" });
  const isProjectsInView = useInView(projectsRef, { margin: "0px 0px -100px 0px" });

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.play().catch(() => {});
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    mouseX.set((e.clientX - rect.width / 2) * 0.015);
    mouseY.set((e.clientY - rect.height / 2) * 0.015);
  };

  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ fontFamily: FONT, background: "rgba(0,0,0,0.0)" }}>

      {/* ── FIXED VIDEO BACKGROUND ── */}
      <div className="fixed inset-0" style={{ zIndex: -2 }}>
        <video
          ref={videoRef}
          autoPlay loop muted playsInline
          className="w-full h-full object-cover"
          style={{ filter: "brightness(0.38) grayscale(0.2)" }}
        >
          <source src={VIDEO_URL} type="video/mp4" />
        </video>
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)" }} />
      </div>

      {/* ── MORPHING ORBS ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: -1 }}>
        <MorphOrb x="-10%" y="-5%" size="50vw" color="radial-gradient(ellipse, rgba(255,255,255,0.035) 0%, transparent 70%)" duration={18} />
        <MorphOrb x="60%" y="30%" size="35vw" color="radial-gradient(ellipse, rgba(255,255,255,0.025) 0%, transparent 70%)" duration={22} />
        <MorphOrb x="10%" y="60%" size="40vw" color="radial-gradient(ellipse, rgba(255,255,255,0.02) 0%, transparent 70%)" duration={14} />
      </div>

      <ScrollProgress />
      <Navigation />

      {/* ══════ HERO ══════ */}
      <section
        id="trang-chu"
        className="relative min-h-screen flex flex-col items-center justify-center px-5"
        onMouseMove={handleMouseMove}
      >
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center text-center gap-5 pt-24 pb-16">

          {/* Avatar with rings */}
          <motion.div
            initial={{ opacity: 0, scale: 0.75 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: "relative" }}
            x={springX}
            y={springY}
          >
            {/* Outer dashed ring — CSS ccw */}
            <div
              className="ring-ccw"
              style={{
                position: "absolute", inset: -22, borderRadius: "50%",
                border: "1px dashed rgba(255,255,255,0.18)",
                "--ring-speed": "25s",
              } as React.CSSProperties}
            />

            {/* Middle scan ring — CSS cw */}
            <div
              className="ring-cw"
              style={{
                position: "absolute", inset: -14, borderRadius: "50%",
                border: "2px solid transparent",
                borderTopColor: "rgba(255,255,255,0.65)",
                borderRightColor: "rgba(255,255,255,0.2)",
                borderBottomColor: "transparent",
                borderLeftColor: "rgba(255,255,255,0.1)",
                "--ring-speed": "9s",
              } as React.CSSProperties}
            />

            {/* Inner ring — CSS cw fast */}
            <div
              className="ring-cw"
              style={{
                position: "absolute", inset: -6, borderRadius: "50%",
                border: "1.5px solid transparent",
                borderTopColor: "rgba(255,255,255,0.4)",
                borderRightColor: "transparent",
                borderBottomColor: "rgba(255,255,255,0.2)",
                borderLeftColor: "transparent",
                "--ring-speed": "5s",
              } as React.CSSProperties}
            />

            {/* Pulse glow */}
            <motion.div
              animate={{ scale: [1, 1.25, 1], opacity: [0.25, 0.5, 0.25] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position: "absolute", inset: -12, borderRadius: "50%",
                boxShadow: "0 0 28px 6px rgba(255,255,255,0.12)",
              }}
            />

            {/* Second pulse - offset */}
            <motion.div
              animate={{ scale: [1, 1.4, 1], opacity: [0.1, 0.3, 0.1] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
              style={{
                position: "absolute", inset: -20, borderRadius: "50%",
                boxShadow: "0 0 40px 8px rgba(255,255,255,0.08)",
              }}
            />

            {/* Avatar image */}
            <div
              className="rounded-full overflow-hidden"
              style={{
                width: 96, height: 96,
                border: "2px solid rgba(255,255,255,0.25)",
                boxShadow: "0 0 32px rgba(255,255,255,0.1), inset 0 0 20px rgba(255,255,255,0.05)",
              }}
            >
              <img src={avatarImg} alt="Phan Trọng Khang" className="w-full h-full object-cover" />
            </div>
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute bottom-1 right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-black"
            />
          </motion.div>

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-semibold tracking-[0.16em] uppercase text-white/50"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.14)",
              backdropFilter: "blur(10px)",
            }}
          >
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-emerald-400"
            />
            AI Architect · IoT Engineer
          </motion.div>

          {/* Name - character stagger */}
          <div className="overflow-hidden">
            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              style={{
                fontFamily: FONT,
                fontSize: "clamp(2.4rem, 9vw, 5rem)",
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                color: "#ffffff",
              }}
            >
              Phan Trọng Khang
            </motion.h1>
          </div>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45 }}
            className="text-white/45 text-base sm:text-lg font-light max-w-md leading-relaxed"
          >
            Xây dựng hệ thống thông minh — kết hợp{" "}
            <motion.span
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              className="text-white/75"
            >
              AI, IoT
            </motion.span>{" "}và{" "}
            <motion.span
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: 0.8 }}
              className="text-white/75"
            >
              Web
            </motion.span>{" "}để giải quyết vấn đề thực tế.
          </motion.p>

          {/* Scroll CTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="mt-4"
          >
            <AnimBorderCard radius={14} speed={3} color="rgba(255,255,255,0.4)">
              <button
                onClick={() => document.querySelector("#gioi-thieu")?.scrollIntoView({ behavior: "smooth" })}
                className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-white/60 transition-all duration-200"
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.9)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.60)"; }}
              >
                Khám phá thêm
                <motion.div
                  animate={{ y: [0, 4, 0] }}
                  transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
                >
                  <ChevronDown className="w-4 h-4" />
                </motion.div>
              </button>
            </AnimBorderCard>
          </motion.div>
        </div>
      </section>

      {/* ══════ GIỚI THIỆU ══════ */}
      <section ref={aboutRef} id="gioi-thieu" className="relative py-24 px-5">
        <div className="max-w-4xl mx-auto">
          <SectionHeader label="Về mình" title="Giới thiệu" />

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Avatar + info card */}
            <motion.div
              initial={{ opacity: 0, x: -40, rotateY: -15 }}
              whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <AnimBorderCard speed={6} color="rgba(255,255,255,0.45)" radius={20} innerStyle={{ padding: "28px" }} animate={isAboutInView}>
                <div className="flex flex-col items-center gap-5">
                  {/* Avatar with mini rings — CSS */}
                  <div style={{ position: "relative" }}>
                    <div
                      className="ring-ccw"
                      style={{
                        position: "absolute", inset: -10, borderRadius: "14px",
                        border: "1px dashed rgba(255,255,255,0.15)",
                        "--ring-speed": "20s",
                      } as React.CSSProperties}
                    />
                    <div
                      className="ring-cw"
                      style={{
                        position: "absolute", inset: -5, borderRadius: "18px",
                        border: "1.5px solid transparent",
                        borderTopColor: "rgba(255,255,255,0.5)",
                        borderRightColor: "rgba(255,255,255,0.15)",
                        "--ring-speed": "7s",
                      } as React.CSSProperties}
                    />
                    <div
                      className="rounded-2xl overflow-hidden"
                      style={{ width: 140, height: 140, border: "2px solid rgba(255,255,255,0.18)" }}
                    >
                      <img src={avatarImg} alt="Phan Trọng Khang" className="w-full h-full object-cover" />
                    </div>
                  </div>

                  <div className="text-center">
                    <h3 className="text-lg font-bold text-white" style={{ fontFamily: FONT }}>Phan Trọng Khang</h3>
                    <p className="text-sm text-white/45 mt-1">AI Architect · IoT Engineer</p>
                    <p className="text-sm text-white/35 mt-0.5">Vĩnh Hòa, Việt Nam</p>
                  </div>

                  <div className="w-full pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                    {[
                      { label: "Năm sinh", value: "2012" },
                      { label: "Kinh nghiệm", value: <><AnimCounter target={3} />+ năm</> },
                      { label: "Projects", value: <><AnimCounter target={10} />+</> },
                    ].map((row, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1, duration: 0.4 }}
                        className="flex justify-between text-sm mt-2"
                      >
                        <span className="text-white/35">{row.label}</span>
                        <span className="text-white/65 font-medium">{row.value}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </AnimBorderCard>
            </motion.div>

            {/* Bio text */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col gap-5"
            >
              {[
                "Mình là <b>Phan Trọng Khang</b> — một lập trình viên trẻ đến từ Vĩnh Hòa, Việt Nam. Với niềm đam mê mãnh liệt với công nghệ, mình tập trung vào việc xây dựng các hệ thống thông minh kết hợp <b2>Trí tuệ nhân tạo (AI)</b2>, <b2>IoT</b2> và <b2>Phát triển Web</b2>.",
                "Từ năm 2021, mình bắt đầu hành trình khám phá tin học và lập trình. Qua từng năm, mình không ngừng học hỏi, thử nghiệm và xây dựng — từ những project nhỏ đầu tay cho đến các hệ thống phức tạp như <b2>NexoraAI</b2> và <b2>NexoraGarden</b2>.",
              ].map((text, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15 + i * 0.12, duration: 0.6 }}
                >
                  <div style={{ ...glass, borderRadius: 16, padding: "24px" }}>
                    <p
                      className="text-white/65 text-sm leading-[1.85] font-light"
                      dangerouslySetInnerHTML={{
                        __html: text
                          .replace(/<b>/g, '<span class="text-white font-semibold">')
                          .replace(/<\/b>/g, "</span>")
                          .replace(/<b2>/g, '<span class="text-white/80">')
                          .replace(/<\/b2>/g, "</span>"),
                      }}
                    />
                  </div>
                </motion.div>
              ))}

              {/* Skills */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
                <div style={{ ...glass, borderRadius: 16, padding: "24px" }}>
                  <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-white/35 mb-3">Kỹ năng</p>
                  <div className="flex flex-wrap gap-2">
                    {SKILLS.map((s, idx) => (
                      <motion.span
                        key={s}
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.04, duration: 0.3 }}
                        whileHover={{ scale: 1.06 }}
                        className="px-3 py-1 rounded-xl text-xs font-medium text-white/55 cursor-default"
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.11)",
                        }}
                      >
                        {s}
                      </motion.span>
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════ LỊCH SỬ ══════ */}
      <section ref={timelineRef} id="lich-su" className="relative py-24 px-5">
        <div className="max-w-3xl mx-auto">
          <SectionHeader label="Hành trình" title="Lịch sử" />

          <div className="mt-12 relative">
            <div
              className="absolute left-[22px] top-3 bottom-3 w-px"
              style={{ background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.18), transparent)" }}
            />
            <motion.div
              className="absolute left-[22px] top-3 bottom-3 w-px"
              animate={{ scaleY: [0, 1] }}
              transition={{ duration: 2.5, ease: "easeOut" }}
              style={{
                background: "linear-gradient(to bottom, rgba(255,255,255,0.35), transparent)",
                transformOrigin: "top",
              }}
            />

            <div className="flex flex-col gap-6">
              {TIMELINE.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.65, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                  className="flex gap-5"
                >
                  <div className="flex-shrink-0 relative flex items-start pt-4">
                    <motion.div
                      whileInView={{ scale: [0, 1.4, 1] }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.07 + 0.3, duration: 0.5 }}
                      className="w-[10px] h-[10px] rounded-full mt-1"
                      style={{
                        background: "#ffffff",
                        boxShadow: "0 0 14px rgba(255,255,255,0.5)",
                        opacity: 0.75,
                      }}
                    />
                  </div>

                  <div className="flex-1">
                    <div style={{ ...glass, borderRadius: 16, padding: "20px" }}>
                      <div className="flex items-center gap-3 mb-2">
                        <span
                          className="text-[11px] font-bold tracking-widest uppercase text-white/40 px-2.5 py-0.5 rounded-lg"
                          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
                        >
                          {item.year}
                        </span>
                        <h3 className="text-sm font-semibold text-white/85" style={{ fontFamily: FONT }}>{item.title}</h3>
                      </div>
                      <p className="text-sm text-white/45 leading-[1.8] font-light">{item.desc}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════ PROJECTS ══════ */}
      <section ref={projectsRef} id="du-an" className="relative py-24 px-5">
        <div className="max-w-4xl mx-auto">
          <SectionHeader label="Dự án" title="Projects" />

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PROJECTS.map((p, i) => (
              <ProjectCard key={i} p={p} i={i} animateBorder={isProjectsInView} />
            ))}
          </div>
        </div>
      </section>

      {/* ══════ LIÊN HỆ ══════ */}
      <section id="lien-he" className="relative py-24 px-5">
        <div className="max-w-3xl mx-auto">
          <SectionHeader label="Kết nối" title="Liên hệ" />

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-4 text-white/40 text-sm text-center"
          >
            Hãy kết nối với mình qua bất kỳ kênh nào dưới đây
          </motion.p>

          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {CONTACTS.map((c, i) => (
              <ContactCard key={i} c={c} i={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="py-8 px-5 text-center text-white/20 text-xs"
        style={{
          fontFamily: FONT,
          borderTop: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(0,0,0,0.3)",
          backdropFilter: "blur(12px)",
        }}
      >
        © {new Date().getFullYear()} Phan Trọng Khang · Built with React &amp; Vite
      </motion.footer>
    </div>
  );
}

/* ── Section Header ── */
function SectionHeader({ label, title }: { label: string; title: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.p
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="text-[11px] font-semibold tracking-[0.22em] uppercase text-white/30 mb-2"
      >
        {label}
      </motion.p>
      <h2 className="text-3xl sm:text-4xl font-bold text-white" style={{ fontFamily: FONT, fontWeight: 800 }}>
        {title.split("").map((char, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 + i * 0.03, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{ display: "inline-block" }}
          >
            {char === " " ? "\u00a0" : char}
          </motion.span>
        ))}
      </h2>
      <motion.div
        initial={{ width: 0 }}
        whileInView={{ width: 40 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="mt-3 h-px rounded-full"
        style={{ background: "linear-gradient(to right, rgba(255,255,255,0.4), transparent)" }}
      />
    </motion.div>
  );
}

/* ── Project Card ── */
function ProjectCard({ p, i, animateBorder = true }: { p: typeof PROJECTS[0]; i: number; animateBorder?: boolean }) {
  const [hovered, setHovered] = useState(false);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springRX = useSpring(rotateX, { stiffness: 200, damping: 18 });
  const springRY = useSpring(rotateY, { stiffness: 200, damping: 18 });

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    rotateX.set(((e.clientY - cy) / (rect.height / 2)) * -7);
    rotateY.set(((e.clientX - cx) / (rect.width / 2)) * 7);
  };

  return (
    <motion.a
      href={p.href}
      target={(p as any).internal ? "_self" : "_blank"}
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 40, scale: 0.93 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.65, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); rotateX.set(0); rotateY.set(0); }}
      onMouseMove={handleMouseMove}
      style={{ perspective: "800px", display: "block", position: "relative", borderRadius: 20 }}
    >
      {/* Hover glow */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "absolute", inset: -2, borderRadius: 22, zIndex: -1,
              background: "radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.06) 0%, transparent 70%)",
              filter: "blur(10px)",
            }}
          />
        )}
      </AnimatePresence>

      <AnimBorderCard
        speed={5 + i * 1.5}
        color="rgba(255,255,255,0.5)"
        radius={20}
        glowOnHover
        animate={animateBorder}
      >
        <motion.div
          style={{ rotateX: springRX, rotateY: springRY, transformStyle: "preserve-3d", padding: "20px" }}
          className="flex flex-col gap-4"
        >
          {p.live && (
            <div
              className="absolute top-4 right-4 flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider text-white/50"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)" }}
            >
              <motion.span
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full bg-emerald-400"
              />
              LIVE
            </div>
          )}
          <div>
            <h3 className="text-base font-bold text-white/90" style={{ fontFamily: FONT }}>{p.title}</h3>
            <p className="text-xs text-white/35 mt-0.5">{p.subtitle}</p>
          </div>
          <p className="text-sm leading-relaxed text-white/50 flex-1 font-light">{p.desc}</p>
          <div className="flex flex-wrap gap-1.5">
            {p.tags.map(t => (
              <span
                key={t}
                className="px-2 py-0.5 rounded-lg text-[11px] font-medium text-white/35"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}
              >
                {t}
              </span>
            ))}
          </div>
          <motion.div
            animate={{ gap: hovered ? "8px" : "6px" }}
            className="flex items-center text-xs text-white/30 pt-1 transition-colors"
            style={{ color: hovered ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.3)" }}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Xem dự án</span>
          </motion.div>
        </motion.div>
      </AnimBorderCard>
    </motion.a>
  );
}

/* ── Contact Card ── */
function ContactCard({ c, i }: { c: typeof CONTACTS[0]; i: number }) {
  const Icon = c.icon;
  return (
    <motion.a
      href={c.href}
      target={c.href.startsWith("tel:") || c.href.startsWith("mailto:") ? "_self" : "_blank"}
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay: i * 0.05 }}
      style={{ display: "block" }}
    >
      <div
        style={{ ...glass, borderRadius: 16 }}
        className="flex flex-col items-center gap-2.5 px-3 py-5 text-center"
      >
        <div
          className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
        >
          {c.isReactIcon ? (
            <Icon style={{ color: "rgba(255,255,255,0.65)", fontSize: 18 }} />
          ) : (
            <Icon className="w-[18px] h-[18px]" style={{ color: "rgba(255,255,255,0.65)" }} />
          )}
        </div>
        <div className="flex flex-col items-center gap-0.5 min-w-0 w-full">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-white/30">{c.label}</p>
          <p className="text-xs font-medium text-white/55 truncate w-full text-center leading-tight" title={c.value}>{c.value}</p>
        </div>
      </div>
    </motion.a>
  );
}
