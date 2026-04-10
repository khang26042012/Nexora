import { motion } from "framer-motion";
import { useRef, useEffect } from "react";
import { Mail, Phone, Github, ArrowUpRight, ChevronDown, ExternalLink } from "lucide-react";
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
  {
    icon: Github,
    label: "GitHub",
    value: "khang26042012",
    href: "https://github.com/khang26042012",
    isReactIcon: false,
  },
  {
    icon: Mail,
    label: "Email",
    value: "trongkhabgphan@gmail.com",
    href: "mailto:trongkhabgphan@gmail.com",
    isReactIcon: false,
  },
  {
    icon: FaFacebook,
    label: "Facebook",
    value: "Phan Trọng Khang",
    href: "https://www.facebook.com/share/1CAZqbwCgB/",
    isReactIcon: true,
  },
  {
    icon: FaTelegram,
    label: "Telegram",
    value: "+84 352 234 521",
    href: "https://t.me/+84352234521",
    isReactIcon: true,
  },
  {
    icon: Phone,
    label: "SĐT",
    value: "0352 234 521",
    href: "tel:0352234521",
    isReactIcon: false,
  },
  {
    icon: SiZalo,
    label: "Zalo",
    value: "0352 234 521",
    href: "https://zalo.me/0352234521",
    isReactIcon: true,
  },
  {
    icon: FaInstagram,
    label: "Instagram",
    value: "khang.trong.809039",
    href: "https://www.instagram.com/khang.trong.809039?igsh=MWdsbWU1bGdobzNjeA==",
    isReactIcon: true,
  },
  {
    icon: FaTiktok,
    label: "TikTok",
    value: "@phantrongkhangg",
    href: "https://www.tiktok.com/@phantrongkhangg",
    isReactIcon: true,
  },
];

const SKILLS = [
  "React", "TypeScript", "Node.js", "Express", "SQLite",
  "WebSocket", "ESP32", "C++", "Python", "Google Gemini",
  "Telegram Bot", "Docker", "Railway", "Vite", "IoT",
];

const TIMELINE = [
  {
    year: "2021",
    title: "Bước chân vào Tin học",
    desc: "Lần đầu tiếp xúc với máy tính và thế giới công nghệ thông tin. Từ những thao tác cơ bản nhất, mình bắt đầu nuôi dưỡng niềm đam mê với lĩnh vực này — tìm hiểu cách máy tính hoạt động, khám phá các phần mềm và dần nhận ra rằng đây là con đường mình muốn theo đuổi.",
  },
  {
    year: "T3/2022",
    title: "Giải Nhất Tin học cấp trường",
    desc: "Sau gần một năm miệt mài luyện tập và tự học, mình đạt giải Nhất trong kỳ thi Tin học cấp trường. Đây là lần đầu tiên mình cảm nhận được trái ngọt của sự nỗ lực — một cột mốc nhỏ nhưng đầy ý nghĩa, tiếp thêm động lực để tiếp tục tiến xa hơn.",
  },
  {
    year: "T5/2022",
    title: "Giải Khuyến Khích cấp tỉnh",
    desc: "Lần đầu tiên bước ra đấu trường lớn hơn — kỳ thi Tin học cấp tỉnh. Dù chỉ đạt giải Khuyến Khích, nhưng với mình đó là bước ngoặt quan trọng: được đo lường năng lực với các bạn từ nhiều trường khác, học được cách đối mặt với áp lực thi cử và càng quyết tâm hơn để phát triển bản thân.",
  },
  {
    year: "2023",
    title: "Chuyển hướng sang Lập trình",
    desc: "Nhận ra rằng lập trình mới là đích đến thật sự, mình bắt đầu tự học web development — HTML, CSS, JavaScript rồi dần tiến lên các framework hiện đại. Những dòng code đầu tiên, những project nho nhỏ từ tay mình tạo ra đã khơi dậy đam mê mạnh mẽ hơn bao giờ hết.",
  },
  {
    year: "2024",
    title: "Ra mắt nhiều Project thực tế",
    desc: "Năm 2024 là năm mình thực sự bứt phá: xây dựng và hoàn thiện nhiều project thực tế, làm chủ fullstack development với React, Node.js, Express, SQLite. Mỗi project là một bài học lớn — từ kiến trúc hệ thống, tối ưu hiệu năng cho đến triển khai lên cloud. Đây là giai đoạn mình trưởng thành nhanh nhất.",
  },
  {
    year: "2025",
    title: "Ra mắt NexoraAI",
    desc: "Xây dựng NexoraAI — một hệ thống AI assistant tích hợp Google Gemini và Telegram Bot, cho phép người dùng trò chuyện, hỏi đáp và xử lý thông tin thông minh ngay trên Telegram. Đây là lần đầu mình chạm vào lĩnh vực AI thực sự, kết hợp tư duy sản phẩm với kỹ thuật backend để tạo ra một trải nghiệm hoàn chỉnh.",
  },
  {
    year: "2026",
    title: "Ra mắt NexoraGarden",
    desc: "NexoraGarden — đứa con tự hào nhất tính đến thời điểm này. Hệ thống IoT vườn thông minh kết hợp ESP32, WebSocket real-time, Telegram Bot, và AI phân tích dữ liệu cảm biến. Người dùng có thể theo dõi và điều khiển vườn từ xa qua giao diện web và Telegram, 24/7. Đây là minh chứng cho hành trình từ không biết gì đến làm chủ cả phần cứng lẫn phần mềm.",
  },
];

const PROJECTS = [
  {
    title: "NexoraGarden",
    subtitle: "IoT Smart Garden System",
    desc: "Hệ thống vườn thông minh kết hợp ESP32, WebSocket real-time, Telegram Bot và AI phân tích dữ liệu cảm biến. Cho phép theo dõi và điều khiển vườn từ xa 24/7 qua web dashboard và Telegram.",
    tags: ["ESP32", "React", "WebSocket", "Telegram Bot", "SQLite", "Railway"],
    href: "https://github.com/khang26042012/Nexora",
    live: true,
  },
  {
    title: "NexoraAI",
    subtitle: "AI Assistant tích hợp Telegram",
    desc: "Hệ thống AI assistant thông minh tích hợp Google Gemini API, hoạt động trực tiếp qua Telegram Bot. Hỗ trợ trả lời câu hỏi, phân tích văn bản và xử lý thông tin theo ngữ cảnh.",
    tags: ["Google Gemini", "Telegram Bot", "Node.js", "Express"],
    href: "https://github.com/khang26042012",
  },
  {
    title: "NexoraTool",
    subtitle: "Video Downloader Platform",
    desc: "Nền tảng tải video từ YouTube, Streamable và 1000+ trang web với yt-dlp + ffmpeg. Hỗ trợ nhiều định dạng và chất lượng đến 4K, giao diện web đơn giản, dễ sử dụng.",
    tags: ["yt-dlp", "ffmpeg", "Node.js", "React", "Vite"],
    href: "/tool/yt-downloader",
    internal: true,
  },
];

/* ── Glass card style ── */
const glass = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 20,
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
} as React.CSSProperties;

const glassHover = {
  background: "rgba(255,255,255,0.09)",
  border: "1px solid rgba(255,255,255,0.22)",
} as React.CSSProperties;

export function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.play().catch(() => {});
  }, []);

  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ fontFamily: FONT, background: "rgba(0,0,0,0.0)" }}>

      {/* ── FIXED VIDEO BACKGROUND ── */}
      <div className="fixed inset-0" style={{ zIndex: -2 }}>
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
          style={{ filter: "brightness(0.38) grayscale(0.2)" }}
        >
          <source src={VIDEO_URL} type="video/mp4" />
        </video>
        <div
          className="absolute inset-0"
          style={{ background: "rgba(0,0,0,0.55)" }}
        />
      </div>

      <Navigation />

      {/* ══════ HERO ══════ */}
      <section id="trang-chu" className="relative min-h-screen flex flex-col items-center justify-center px-5">
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center text-center gap-5 pt-24 pb-16">

          {/* Avatar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <div
              className="rounded-full overflow-hidden"
              style={{
                width: 96,
                height: 96,
                border: "2px solid rgba(255,255,255,0.18)",
                boxShadow: "0 0 32px rgba(255,255,255,0.08)",
              }}
            >
              <img
                src={avatarImg}
                alt="Phan Trọng Khang"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute bottom-1 right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-black animate-pulse" />
          </motion.div>

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-semibold tracking-[0.16em] uppercase text-white/50"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.14)",
              backdropFilter: "blur(10px)",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            AI Architect · IoT Engineer
          </motion.div>

          {/* Name */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.25 }}
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

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.38 }}
            className="text-white/45 text-base sm:text-lg font-light max-w-md leading-relaxed"
          >
            Xây dựng hệ thống thông minh — kết hợp{" "}
            <span className="text-white/70">AI, IoT</span> và{" "}
            <span className="text-white/70">Web</span> để giải quyết vấn đề thực tế.
          </motion.p>

          {/* Scroll CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-4"
          >
            <button
              onClick={() => document.querySelector("#gioi-thieu")?.scrollIntoView({ behavior: "smooth" })}
              className="group flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-medium text-white/60 transition-all duration-200"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.14)",
                backdropFilter: "blur(10px)",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.10)";
                (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.85)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
                (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.60)";
              }}
            >
              Khám phá thêm
              <motion.div
                animate={{ y: [0, 4, 0] }}
                transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
              >
                <ChevronDown className="w-4 h-4" />
              </motion.div>
            </button>
          </motion.div>
        </div>
      </section>

      {/* ══════ GIỚI THIỆU ══════ */}
      <section id="gioi-thieu" className="relative py-24 px-5">
        <div className="max-w-4xl mx-auto">
          <SectionHeader label="Về mình" title="Giới thiệu" />

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Avatar + info card */}
            <motion.div
              initial={{ opacity: 0, x: -32 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="flex flex-col items-center gap-5 p-7"
              style={glass}
            >
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  width: 140,
                  height: 140,
                  border: "2px solid rgba(255,255,255,0.15)",
                }}
              >
                <img src={avatarImg} alt="Phan Trọng Khang" className="w-full h-full object-cover" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold text-white" style={{ fontFamily: FONT }}>Phan Trọng Khang</h3>
                <p className="text-sm text-white/45 mt-1">AI Architect · IoT Engineer</p>
                <p className="text-sm text-white/35 mt-0.5">Vĩnh Hòa, Việt Nam</p>
              </div>
              <div className="w-full pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex justify-between text-sm">
                  <span className="text-white/35">Năm sinh</span>
                  <span className="text-white/65 font-medium">2007</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-white/35">Kinh nghiệm</span>
                  <span className="text-white/65 font-medium">3+ năm</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-white/35">Projects</span>
                  <span className="text-white/65 font-medium">10+</span>
                </div>
              </div>
            </motion.div>

            {/* Bio text */}
            <motion.div
              initial={{ opacity: 0, x: 32 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="flex flex-col gap-5"
            >
              <div className="p-6 rounded-2xl" style={glass}>
                <p className="text-white/65 text-sm leading-[1.85] font-light">
                  Mình là <span className="text-white font-semibold">Phan Trọng Khang</span> — một lập trình viên trẻ đến từ Vĩnh Hòa, Việt Nam. Với niềm đam mê mãnh liệt với công nghệ, mình tập trung vào việc xây dựng các hệ thống thông minh kết hợp <span className="text-white/80">Trí tuệ nhân tạo (AI)</span>, <span className="text-white/80">IoT</span> và <span className="text-white/80">Phát triển Web</span>.
                </p>
              </div>
              <div className="p-6 rounded-2xl" style={glass}>
                <p className="text-white/65 text-sm leading-[1.85] font-light">
                  Từ năm 2021, mình bắt đầu hành trình khám phá tin học và lập trình. Qua từng năm, mình không ngừng học hỏi, thử nghiệm và xây dựng — từ những project nhỏ đầu tay cho đến các hệ thống phức tạp như <span className="text-white/80">NexoraAI</span> và <span className="text-white/80">NexoraGarden</span>.
                </p>
              </div>
              {/* Skills */}
              <div className="p-6 rounded-2xl" style={glass}>
                <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-white/35 mb-3">Kỹ năng</p>
                <div className="flex flex-wrap gap-2">
                  {SKILLS.map(s => (
                    <span
                      key={s}
                      className="px-3 py-1 rounded-xl text-xs font-medium text-white/55"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.11)",
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════ LỊCH SỬ ══════ */}
      <section id="lich-su" className="relative py-24 px-5">
        <div className="max-w-3xl mx-auto">
          <SectionHeader label="Hành trình" title="Lịch sử" />

          <div className="mt-12 relative">
            {/* Vertical line */}
            <div
              className="absolute left-[22px] top-3 bottom-3 w-px"
              style={{ background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.15), transparent)" }}
            />

            <div className="flex flex-col gap-6">
              {TIMELINE.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.6, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                  className="flex gap-5"
                >
                  {/* Dot */}
                  <div className="flex-shrink-0 relative flex items-start pt-4">
                    <div
                      className="w-[10px] h-[10px] rounded-full mt-1"
                      style={{
                        background: "#ffffff",
                        boxShadow: "0 0 10px rgba(255,255,255,0.35)",
                        opacity: 0.7,
                      }}
                    />
                  </div>

                  {/* Card */}
                  <div
                    className="flex-1 p-5 rounded-2xl transition-all duration-200"
                    style={glass}
                    onMouseEnter={e => Object.assign((e.currentTarget as HTMLElement).style, glassHover)}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                      (e.currentTarget as HTMLElement).style.border = "1px solid rgba(255,255,255,0.12)";
                    }}
                  >
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
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════ PROJECTS ══════ */}
      <section id="du-an" className="relative py-24 px-5">
        <div className="max-w-4xl mx-auto">
          <SectionHeader label="Dự án" title="Projects" />

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PROJECTS.map((p, i) => (
              <motion.a
                key={i}
                href={p.href}
                target={p.internal ? "_self" : "_blank"}
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="group relative flex flex-col gap-4 p-5 rounded-2xl transition-all duration-200"
                style={glass}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  Object.assign(el.style, glassHover);
                  el.style.transform = "translateY(-3px)";
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = "rgba(255,255,255,0.05)";
                  el.style.border = "1px solid rgba(255,255,255,0.12)";
                  el.style.transform = "translateY(0)";
                }}
              >
                {p.live && (
                  <div
                    className="absolute top-4 right-4 flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider text-white/50"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)" }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
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
                <div className="flex items-center gap-1.5 text-xs text-white/30 group-hover:text-white/55 transition-colors pt-1">
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Xem dự án</span>
                </div>
              </motion.a>
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
      <footer
        className="py-8 px-5 text-center text-white/20 text-xs"
        style={{
          fontFamily: FONT,
          borderTop: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(0,0,0,0.3)",
          backdropFilter: "blur(12px)",
        }}
      >
        © {new Date().getFullYear()} Phan Trọng Khang · Built with React &amp; Vite
      </footer>
    </div>
  );
}

/* ── Section Header ── */
function SectionHeader({ label, title }: { label: string; title: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
    >
      <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-white/30 mb-2">
        {label}
      </p>
      <h2
        className="text-3xl sm:text-4xl font-bold text-white"
        style={{ fontFamily: FONT, fontWeight: 800 }}
      >
        {title}
      </h2>
      <div
        className="mt-3 h-px w-10 rounded-full"
        style={{ background: "linear-gradient(to right, rgba(255,255,255,0.4), transparent)" }}
      />
    </motion.div>
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
      transition={{ duration: 0.5, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
      whileTap={{ scale: 0.96 }}
      className="group relative flex flex-col items-center gap-2.5 px-3 py-5 rounded-2xl text-center transition-all duration-200"
      style={glass}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        Object.assign(el.style, glassHover);
        el.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.background = "rgba(255,255,255,0.05)";
        el.style.border = "1px solid rgba(255,255,255,0.12)";
        el.style.transform = "translateY(0)";
      }}
    >
      <div
        className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0"
        style={{
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        {c.isReactIcon ? (
          <Icon style={{ color: "rgba(255,255,255,0.65)", fontSize: 18 }} />
        ) : (
          <Icon className="w-[18px] h-[18px]" style={{ color: "rgba(255,255,255,0.65)" }} />
        )}
      </div>
      <div className="flex flex-col items-center gap-0.5 min-w-0 w-full">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-white/30">{c.label}</p>
        <p className="text-xs font-medium text-white/55 truncate w-full text-center leading-tight" title={c.value}>
          {c.value}
        </p>
      </div>
      <ArrowUpRight className="absolute top-2.5 right-2.5 w-3 h-3 opacity-0 group-hover:opacity-35 transition-opacity text-white/60" />
    </motion.a>
  );
}
