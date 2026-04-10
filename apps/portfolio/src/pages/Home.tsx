import { motion } from "framer-motion";
import { useRef, useEffect } from "react";
import { Mail, Phone, Github, ArrowUpRight, ChevronDown } from "lucide-react";
import {
  FaFacebook, FaTelegram, FaInstagram, FaTiktok,
} from "react-icons/fa";
import { SiZalo } from "react-icons/si";
import { Navigation } from "@/components/navigation";
import avatarImg from "@/assets/avatar_new.jpg";

const VIDEO_URL =
  "https://res.cloudinary.com/dfonotyfb/video/upload/v1775585556/dds3_1_rqhg7x.mp4";

const CONTACTS = [
  {
    icon: Github,
    label: "GitHub",
    value: "khang26042012",
    href: "https://github.com/khang26042012",
    color: "#a78bfa",
    isReactIcon: false,
  },
  {
    icon: Mail,
    label: "Email",
    value: "trongkhabgphan@gmail.com",
    href: "mailto:trongkhabgphan@gmail.com",
    color: "#e879f9",
    isReactIcon: false,
  },
  {
    icon: FaFacebook,
    label: "Facebook",
    value: "Phan Trọng Khang",
    href: "https://www.facebook.com/share/1CAZqbwCgB/",
    color: "#60a5fa",
    isReactIcon: true,
  },
  {
    icon: FaTelegram,
    label: "Telegram",
    value: "+84 352 234 521",
    href: "https://t.me/+84352234521",
    color: "#38bdf8",
    isReactIcon: true,
  },
  {
    icon: Phone,
    label: "SĐT",
    value: "0352 234 521",
    href: "tel:0352234521",
    color: "#34d399",
    isReactIcon: false,
  },
  {
    icon: SiZalo,
    label: "Zalo",
    value: "0352 234 521",
    href: "https://zalo.me/0352234521",
    color: "#0068ff",
    isReactIcon: true,
  },
  {
    icon: FaInstagram,
    label: "Instagram",
    value: "khang.trong.809039",
    href: "https://www.instagram.com/khang.trong.809039?igsh=MWdsbWU1bGdobzNjeA==",
    color: "#f97316",
    isReactIcon: true,
  },
  {
    icon: FaTiktok,
    label: "TikTok",
    value: "@phantrongkhangg",
    href: "https://www.tiktok.com/@phantrongkhangg",
    color: "#fc4b6c",
    isReactIcon: true,
  },
];

export function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.play().catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <Navigation />

      {/* ══════ HERO ══════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">

        {/* Video Background */}
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
          style={{ filter: "brightness(0.45)" }}
        >
          <source src={VIDEO_URL} type="video/mp4" />
        </video>

        {/* Gradient overlays */}
        <div
          className="absolute inset-0 z-[1] pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.15) 60%, rgba(0,0,0,0.85) 100%)",
          }}
        />

        {/* Content */}
        <div className="relative z-10 w-full max-w-4xl mx-auto px-5 sm:px-8 flex flex-col items-center text-center gap-6 pt-24 pb-16">

          {/* Avatar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <div
              className="rounded-full overflow-hidden border-2 border-white/20"
              style={{
                width: 110,
                height: 110,
                boxShadow: "0 0 40px rgba(167,139,250,0.4), 0 0 80px rgba(167,139,250,0.15)",
              }}
            >
              <img
                src={avatarImg}
                alt="Phan Trọng Khang"
                className="w-full h-full object-cover"
                style={{ filter: "brightness(1.08) contrast(1.05)" }}
              />
            </div>
            {/* Live dot */}
            <div className="absolute bottom-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-black animate-pulse" />
          </motion.div>

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-semibold tracking-[0.18em] uppercase"
            style={{
              background: "rgba(167,139,250,0.12)",
              border: "1px solid rgba(167,139,250,0.35)",
              color: "#c4b5fd",
              backdropFilter: "blur(12px)",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Full-Stack Dev · IoT Engineer
          </motion.div>

          {/* Name */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="leading-none tracking-tight"
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: "clamp(2.4rem, 8vw, 5.5rem)",
              fontWeight: 700,
              background:
                "linear-gradient(135deg, #ffffff 0%, #e0d7ff 35%, #c4b5fd 65%, #a78bfa 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              textShadow: "none",
            }}
          >
            Phan Trọng Khang
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.38, ease: [0.16, 1, 0.3, 1] }}
            className="text-white/60 text-base sm:text-lg font-light tracking-wide max-w-lg"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            AI Architect · IoT Engineer · Developer
            <br className="hidden sm:block" />
            <span className="text-white/40 text-sm sm:text-base"> Vĩnh Hòa, Việt Nam</span>
          </motion.p>

          {/* Bio */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.48, ease: [0.16, 1, 0.3, 1] }}
            className="text-white/45 text-sm sm:text-base leading-relaxed max-w-xl font-light"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Xây dựng hệ thống thông minh kết hợp AI, IoT và Web.
            Tác giả của <span className="text-purple-300/80">NexoraGarden</span> — smart garden system với ESP32 &amp; Telegram Bot.
          </motion.p>

          {/* Divider */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.55 }}
            className="w-16 h-px rounded-full"
            style={{
              background: "linear-gradient(to right, transparent, #a78bfa, transparent)",
              transformOrigin: "center",
            }}
          />

          {/* Contacts */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.62, ease: [0.16, 1, 0.3, 1] }}
            className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3"
          >
            {CONTACTS.map((c, i) => (
              <ContactCard key={i} c={c} i={i} />
            ))}
          </motion.div>

        </div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.8 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1.5 text-white/25"
        >
          <span className="text-[10px] tracking-widest uppercase font-light" style={{ fontFamily: "'Inter', sans-serif" }}>Scroll</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
          >
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </motion.div>
      </section>

      {/* ══════ PROJECTS SECTION (minimal) ══════ */}
      <section
        id="du-an"
        className="relative py-20 px-5 sm:px-8"
        style={{ background: "linear-gradient(to bottom, #000000 0%, #0a0514 100%)" }}
      >
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="mb-10"
          >
            <p className="text-xs font-mono tracking-[0.22em] uppercase mb-2 text-purple-400">
              Dự án
            </p>
            <h2
              className="text-3xl sm:text-4xl font-bold text-white"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              Projects
            </h2>
            <div
              className="mt-3 h-px w-12 rounded-full"
              style={{ background: "linear-gradient(to right, #a78bfa, transparent)" }}
            />
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ProjectCard
              i={0}
              title="NexoraGarden"
              subtitle="IoT Smart Garden System"
              desc="Hệ thống vườn thông minh: ESP32, WebSocket, Telegram Bot, AI phân tích và điều khiển tưới cây tự động."
              tags={["ESP32", "React", "WebSocket", "Telegram"]}
              accent="#34d399"
              href="https://github.com/khang26042012/Nexora"
              live
            />
            <ProjectCard
              i={1}
              title="Arcane Tools"
              subtitle="Video Downloader"
              desc="Tải video từ YouTube, Streamable & 1000+ nền tảng với yt-dlp + ffmpeg. Hỗ trợ 4K."
              tags={["yt-dlp", "ffmpeg", "Node.js"]}
              accent="#f97316"
              href="/tool/yt-downloader"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="py-8 px-5 text-center text-white/25 text-xs"
        style={{
          background: "#000000",
          fontFamily: "'Inter', sans-serif",
          borderTop: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        © {new Date().getFullYear()} Phan Trọng Khang · Built with React &amp; Vite
      </footer>
    </div>
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
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.65 + i * 0.055, ease: [0.16, 1, 0.3, 1] }}
      whileTap={{ scale: 0.96 }}
      className="group relative flex flex-col items-center gap-2 px-3 py-4 rounded-2xl text-center transition-all duration-300"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(16px)",
        minHeight: 88,
        WebkitTapHighlightColor: "transparent",
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.background = `${c.color}12`;
        el.style.border = `1px solid ${c.color}40`;
        el.style.boxShadow = `0 8px 32px ${c.color}18`;
        el.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.background = "rgba(255,255,255,0.04)";
        el.style.border = "1px solid rgba(255,255,255,0.08)";
        el.style.boxShadow = "none";
        el.style.transform = "translateY(0)";
      }}
    >
      <div
        className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
        style={{ background: `${c.color}18`, border: `1px solid ${c.color}30` }}
      >
        {c.isReactIcon ? (
          <Icon style={{ color: c.color, fontSize: 18 }} />
        ) : (
          <Icon className="w-4.5 h-4.5" style={{ color: c.color, width: 18, height: 18 }} />
        )}
      </div>
      <div className="flex flex-col items-center gap-0.5 min-w-0 w-full">
        <p className="text-[10px] font-mono tracking-widest uppercase text-white/35">{c.label}</p>
        <p
          className="text-xs font-medium text-white/65 truncate w-full text-center leading-tight"
          title={c.value}
        >
          {c.value}
        </p>
      </div>
      <ArrowUpRight
        className="absolute top-2.5 right-2.5 w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity"
        style={{ color: c.color }}
      />
    </motion.a>
  );
}

/* ── Project Card ── */
function ProjectCard({
  i, title, subtitle, desc, tags, accent, href, live,
}: {
  i: number; title: string; subtitle: string; desc: string;
  tags: string[]; accent: string; href: string; live?: boolean;
}) {
  return (
    <motion.a
      href={href}
      target={href.startsWith("/") ? "_self" : "_blank"}
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.65, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
      whileTap={{ scale: 0.98 }}
      className="relative group flex flex-col gap-3 p-5 rounded-2xl transition-all duration-300"
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(12px)",
        WebkitTapHighlightColor: "transparent",
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.background = `${accent}0d`;
        el.style.border = `1px solid ${accent}35`;
        el.style.boxShadow = `0 16px 48px ${accent}12`;
        el.style.transform = "translateY(-3px)";
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.background = "rgba(255,255,255,0.025)";
        el.style.border = "1px solid rgba(255,255,255,0.07)";
        el.style.boxShadow = "none";
        el.style.transform = "translateY(0)";
      }}
    >
      {live && (
        <div
          className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider"
          style={{ background: `${accent}18`, border: `1px solid ${accent}40`, color: accent }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: accent }} />
          LIVE
        </div>
      )}
      <div>
        <h3 className="text-base font-bold text-white/90" style={{ fontFamily: "'Cinzel', serif" }}>
          {title}
        </h3>
        <p className="text-xs text-white/35 mt-0.5" style={{ fontFamily: "'Inter', sans-serif" }}>
          {subtitle}
        </p>
      </div>
      <p className="text-sm leading-relaxed text-white/50 flex-1" style={{ fontFamily: "'Inter', sans-serif" }}>
        {desc}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {tags.map(t => (
          <span
            key={t}
            className="px-2 py-0.5 rounded-lg text-[11px] font-medium text-white/35"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            {t}
          </span>
        ))}
      </div>
    </motion.a>
  );
}
