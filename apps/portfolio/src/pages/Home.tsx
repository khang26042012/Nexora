import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Github, Mail, ExternalLink, ChevronDown,
  Terminal, Cpu, Wifi, Globe, Leaf, Code2, Zap, Database, Bot,
  ArrowUpRight, Star, GitFork, Phone, MessageCircle, Camera, Music,
} from "lucide-react";
import { GlassScene } from "@/components/GlassScene";
import { Navigation } from "@/components/navigation";
import { LoadingScreen } from "@/components/LoadingScreen";
import avatarImg from "@/assets/avatar_new.jpg";

/* ─── Glass card style helper ─── */
const glass = (extra = "") =>
  `rounded-3xl backdrop-blur-xl border border-white/10 bg-white/[0.04] ${extra}`;

/* ─── Fade-up animation ─── */
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 36 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
});

/* ─── Skills ─── */
const SKILLS = [
  { name: "Python",       icon: Terminal,  color: "#a78bfa" },
  { name: "JavaScript",   icon: Code2,     color: "#fbbf24" },
  { name: "TypeScript",   icon: Code2,     color: "#60a5fa" },
  { name: "React",        icon: Globe,     color: "#38bdf8" },
  { name: "Node.js",      icon: Zap,       color: "#34d399" },
  { name: "ESP32 / IoT",  icon: Cpu,       color: "#f97316" },
  { name: "SQLite / DB",  icon: Database,  color: "#e879f9" },
  { name: "Telegram Bot", icon: Bot,       color: "#06b6d4" },
  { name: "WebSocket",    icon: Wifi,      color: "#c084fc" },
  { name: "Docker",       icon: Globe,     color: "#2dd4bf" },
];

/* ─── Contacts ─── */
const CONTACTS = [
  { icon: Github,        label: "GitHub",    value: "khang26042012",           href: "https://github.com/khang26042012",          color: "#a78bfa" },
  { icon: Mail,          label: "Email",     value: "trongkhabgphan@gmail.com", href: "mailto:trongkhabgphan@gmail.com",            color: "#e879f9" },
  { icon: Globe,         label: "Facebook",  value: "Phan Trọng Khang",         href: "https://www.facebook.com/share/1CAZqbwCgB/",color: "#60a5fa" },
  { icon: MessageCircle, label: "Telegram",  value: "+84352234521",             href: "https://t.me/+84352234521",                 color: "#38bdf8" },
  { icon: Phone,         label: "SĐT / Zalo","value": "0352234521",              href: "tel:0352234521",                            color: "#34d399" },
  { icon: Camera,        label: "Instagram", value: "khang.trong.809039",       href: "https://www.instagram.com/khang.trong.809039?igsh=MWdsbWU1bGdobzNjeA==", color: "#f97316" },
  { icon: Music,         label: "TikTok",    value: "@phantrongkhangg",          href: "https://www.tiktok.com/@phantrongkhangg",   color: "#fc4b6c" },
];

/* ─── Projects ─── */
const PROJECTS = [
  {
    id: "nexora",
    title: "NexoraGarden",
    subtitle: "IoT Smart Garden System",
    desc: "Hệ thống vườn thông minh toàn diện: ESP32, API server, dashboard React, Telegram bot điều khiển và phân tích AI.",
    tags: ["ESP32", "React", "WebSocket", "Telegram", "SQLite"],
    icon: Leaf,
    accent: "#34d399",
    stars: 12, forks: 3,
    github: "https://github.com/khang26042012/Nexora",
    live: true,
  },
  {
    id: "portfolio",
    title: "Portfolio",
    subtitle: "Personal Website",
    desc: "Trang portfolio cá nhân với Three.js — aurora, neural particles, glass morphism cards và Framer Motion animations.",
    tags: ["React", "Three.js", "TypeScript", "Vite"],
    icon: Globe,
    accent: "#a78bfa",
    stars: 5, forks: 1,
    github: "https://github.com/khang26042012/Nexora",
    live: false,
  },
  {
    id: "tools",
    title: "Arcane Tools",
    subtitle: "Utility Collection",
    desc: "Video Downloader hỗ trợ YouTube, Streamable & 1000+ nền tảng với yt-dlp + ffmpeg.",
    tags: ["yt-dlp", "ffmpeg", "Node.js", "Express"],
    icon: Zap,
    accent: "#f97316",
    stars: 8, forks: 2,
    github: "https://github.com/khang26042012/Nexora",
    live: false,
  },
];

/* ════════════════════════════
   AVATAR với animation bao bọc
═══════════════════════════════ */
function AvatarRings() {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 240, height: 240 }}>

      {/* Glow halo ngoài cùng */}
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{ scale: [1, 1.08, 1], opacity: [0.18, 0.35, 0.18] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background: "radial-gradient(circle, rgba(0,212,255,0.35) 0%, rgba(124,58,237,0.2) 50%, transparent 70%)",
          filter: "blur(18px)",
        }}
      />

      {/* Ring 1 — quay chậm gradient xanh/tím */}
      <motion.div
        className="absolute rounded-full"
        style={{ inset: -12 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
      >
        <div
          className="w-full h-full rounded-full"
          style={{
            background: "conic-gradient(from 0deg, #00d4ff, #7c3aed, #06b6d4, #a78bfa, #00d4ff)",
            padding: 2,
            WebkitMask: "radial-gradient(farthest-side,transparent calc(100% - 2px),white calc(100% - 2px))",
            mask: "radial-gradient(farthest-side,transparent calc(100% - 2px),white calc(100% - 2px))",
            opacity: 0.85,
          }}
        />
      </motion.div>

      {/* Ring 2 — quay ngược */}
      <motion.div
        className="absolute rounded-full"
        style={{ inset: -24 }}
        animate={{ rotate: -360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      >
        <div
          className="w-full h-full rounded-full"
          style={{
            background: "conic-gradient(from 90deg, transparent 60%, #00d4ff 75%, transparent 80%, #7c3aed 88%, transparent 95%)",
            padding: 1.5,
            WebkitMask: "radial-gradient(farthest-side,transparent calc(100% - 1.5px),white calc(100% - 1.5px))",
            mask: "radial-gradient(farthest-side,transparent calc(100% - 1.5px),white calc(100% - 1.5px))",
            opacity: 0.55,
          }}
        />
      </motion.div>

      {/* Ring 3 — ngoài cùng chấm bi quay */}
      <motion.div
        className="absolute rounded-full"
        style={{ inset: -38 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
      >
        {Array.from({ length: 10 }).map((_, i) => {
          const angle = (i / 10) * 360;
          const size = i % 3 === 0 ? 5 : 3;
          const opacity = i % 3 === 0 ? 0.9 : 0.45;
          const color = i % 2 === 0 ? "#00d4ff" : "#a78bfa";
          return (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: size, height: size,
                background: color,
                boxShadow: `0 0 ${size * 2}px ${color}`,
                top: "50%",
                left: "50%",
                transform: `rotate(${angle}deg) translateX(119px) translateY(-50%)`,
                opacity,
              }}
            />
          );
        })}
      </motion.div>

      {/* Ring 4 — chấm bi ngược chiều */}
      <motion.div
        className="absolute rounded-full"
        style={{ inset: -38 }}
        animate={{ rotate: -360 }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
      >
        {Array.from({ length: 6 }).map((_, i) => {
          const angle = (i / 6) * 360;
          return (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: 4, height: 4,
                background: "#34d399",
                boxShadow: "0 0 8px #34d399",
                top: "50%",
                left: "50%",
                transform: `rotate(${angle}deg) translateX(119px) translateY(-50%)`,
                opacity: 0.7,
              }}
            />
          );
        })}
      </motion.div>

      {/* Pulse ring */}
      <motion.div
        className="absolute rounded-full border"
        style={{ inset: -8, borderColor: "rgba(0,212,255,0.3)" }}
        animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
      />
      <motion.div
        className="absolute rounded-full border"
        style={{ inset: -8, borderColor: "rgba(124,58,237,0.25)" }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0, 0.4] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut", delay: 0.8 }}
      />

      {/* Avatar image */}
      <div
        className="relative rounded-full overflow-hidden z-10"
        style={{
          width: 188,
          height: 188,
          boxShadow: "0 0 40px rgba(0,212,255,0.25), 0 0 80px rgba(124,58,237,0.15), inset 0 0 0 2px rgba(255,255,255,0.1)",
        }}
      >
        <img
          src={avatarImg}
          alt="Phan Trọng Khang"
          className="w-full h-full object-cover"
          style={{ filter: "brightness(1.05) contrast(1.05)" }}
        />
        {/* subtle overlay */}
        <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle at 30% 30%, rgba(0,212,255,0.08) 0%, transparent 60%)" }} />
      </div>
    </div>
  );
}

/* ════════════════════════════
   SKILL CHIP
═══════════════════════════════ */
function SkillChip({ skill, i }: { skill: typeof SKILLS[0]; i: number }) {
  const Icon = skill.icon;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      whileHover={{ scale: 1.08, y: -2 }}
      transition={{ duration: 0.4, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl cursor-default"
      style={{
        background: `linear-gradient(135deg, ${skill.color}10 0%, rgba(255,255,255,0.02) 100%)`,
        border: `1px solid ${skill.color}25`,
        backdropFilter: "blur(10px)",
        boxShadow: `0 0 20px ${skill.color}08`,
        transition: "box-shadow 0.3s",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 0 24px ${skill.color}22`; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${skill.color}08`; }}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: skill.color }} />
      <span className="text-sm font-medium text-white/70">{skill.name}</span>
    </motion.div>
  );
}

/* ════════════════════════════
   PROJECT CARD
═══════════════════════════════ */
function ProjectCard({ p, i }: { p: typeof PROJECTS[0]; i: number }) {
  const [hov, setHov] = useState(false);
  const Icon = p.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 48 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.7, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="relative rounded-3xl overflow-hidden"
      style={{
        background: hov
          ? `linear-gradient(145deg, ${p.accent}0d 0%, rgba(255,255,255,0.025) 100%)`
          : "linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
        border: hov ? `1px solid ${p.accent}35` : "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(16px)",
        boxShadow: hov ? `0 16px 48px ${p.accent}12` : "none",
        transition: "all 0.35s ease",
      }}
    >
      {p.live && (
        <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider z-10"
          style={{ background: `${p.accent}18`, border: `1px solid ${p.accent}40`, color: p.accent }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: p.accent }} />
          LIVE
        </div>
      )}
      <div className="p-6 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${p.accent}15`, border: `1px solid ${p.accent}30` }}>
            <Icon className="w-5 h-5" style={{ color: p.accent }} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white/90">{p.title}</h3>
            <p className="text-xs text-white/35 mt-0.5">{p.subtitle}</p>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-white/50">{p.desc}</p>
        <div className="flex flex-wrap gap-1.5">
          {p.tags.map(t => (
            <span key={t} className="px-2 py-0.5 rounded-lg text-[11px] font-medium text-white/35"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              {t}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-4 text-xs text-white/30">
            <div className="flex items-center gap-1"><Star className="w-3 h-3" /> {p.stars}</div>
            <div className="flex items-center gap-1"><GitFork className="w-3 h-3" /> {p.forks}</div>
          </div>
          <a href={p.github} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-70"
            style={{ color: p.accent }}>
            <Github className="w-3.5 h-3.5" />
            Code
            <ArrowUpRight className="w-3 h-3" />
          </a>
        </div>
      </div>
    </motion.div>
  );
}

/* ════════════════════════════
   CONTACT CARD
═══════════════════════════════ */
function ContactCard({ c, i }: { c: typeof CONTACTS[0]; i: number }) {
  const Icon = c.icon;
  return (
    <motion.a
      href={c.href}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.5, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center gap-4 px-5 py-4 rounded-2xl group"
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(12px)",
        transition: "all 0.3s ease",
        boxShadow: "0 0 0 transparent",
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.background = `${c.color}0d`;
        el.style.border = `1px solid ${c.color}35`;
        el.style.boxShadow = `0 8px 32px ${c.color}15`;
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.background = "rgba(255,255,255,0.025)";
        el.style.border = "1px solid rgba(255,255,255,0.07)";
        el.style.boxShadow = "0 0 0 transparent";
      }}
    >
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${c.color}15`, border: `1px solid ${c.color}25` }}>
        <Icon className="w-5 h-5" style={{ color: c.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white/35 font-mono tracking-wider uppercase mb-0.5">{c.label}</p>
        <p className="text-sm font-medium text-white/75 truncate">{c.value}</p>
      </div>
      <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0" style={{ color: c.color + "60" }} />
    </motion.a>
  );
}

/* ════════════════════════════
   SECTION TITLE
═══════════════════════════════ */
function SectionTitle({ label, title, accent }: { label: string; title: string; accent: string }) {
  return (
    <div className="mb-12">
      <motion.p
        initial={{ opacity: 0, x: -16 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-xs font-mono tracking-[0.22em] uppercase mb-2"
        style={{ color: accent }}
      >
        {label}
      </motion.p>
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.08 }}
        className="text-3xl sm:text-4xl font-black text-white"
      >
        {title}
      </motion.h2>
      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.18 }}
        className="mt-4 h-px w-16 rounded-full"
        style={{ background: `linear-gradient(to right, ${accent}, transparent)`, transformOrigin: "left" }}
      />
    </div>
  );
}

/* ════════════════════════════
   MAIN PAGE
═══════════════════════════════ */
export function Home() {
  const [loaded, setLoaded] = useState(false);
  const [, navigate] = useLocation();

  useEffect(() => {
    const stored = sessionStorage.getItem("ptk-loaded");
    if (stored) setLoaded(true);
  }, []);

  const handleDone = () => {
    sessionStorage.setItem("ptk-loaded", "1");
    setLoaded(true);
  };

  return (
    <>
      {!loaded && <LoadingScreen onDone={handleDone} />}

      <div className="min-h-screen" style={{ background: "#000d1a" }}>
        <Navigation />

        {/* ══════ HERO ══════ */}
        <section id="trang-chu" className="relative min-h-screen flex items-center justify-center overflow-hidden">
          <GlassScene className="absolute inset-0 w-full h-full" />

          {/* gradient overlay bottom */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: "linear-gradient(to bottom, rgba(0,13,26,0.1) 0%, rgba(0,13,26,0.0) 50%, rgba(0,13,26,0.95) 100%)"
          }} />

          <div className="relative z-10 px-6 max-w-5xl mx-auto w-full">
            <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-20">

              {/* Avatar */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="flex-shrink-0"
              >
                <AvatarRings />
              </motion.div>

              {/* Text */}
              <div className="text-center lg:text-left">
                <motion.div
                  {...fadeUp(0.4)}
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-xs font-mono tracking-widest"
                  style={{
                    background: "rgba(0,212,255,0.08)",
                    border: "1px solid rgba(0,212,255,0.22)",
                    color: "rgba(0,212,255,0.85)",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#00d4ff" }} />
                  FULL-STACK DEV · IoT ENGINEER
                </motion.div>

                <motion.h1
                  {...fadeUp(0.55)}
                  className="text-5xl sm:text-6xl lg:text-7xl font-black mb-4 leading-none tracking-tight"
                >
                  <span style={{
                    background: "linear-gradient(135deg, #e0f7ff 0%, #00d4ff 35%, #818cf8 65%, #a78bfa 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}>
                    Phan Trọng
                  </span>
                  <br />
                  <span className="text-white">Khang</span>
                </motion.h1>

                <motion.p
                  {...fadeUp(0.7)}
                  className="text-base sm:text-lg mb-8 max-w-md leading-relaxed"
                  style={{ color: "rgba(180,220,255,0.55)" }}
                >
                  Kiến trúc hệ thống thông minh từ firmware đến cloud.
                  Đang xây dựng{" "}
                  <span style={{ color: "#34d399", fontWeight: 600 }}>NexoraGarden</span>
                  {" "}— IoT smart garden.
                </motion.p>

                <motion.div
                  {...fadeUp(0.85)}
                  className="flex flex-wrap items-center justify-center lg:justify-start gap-3"
                >
                  <button
                    onClick={() => document.getElementById("du-an")?.scrollIntoView({ behavior: "smooth" })}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm text-white transition-all duration-200 hover:scale-[1.04] hover:brightness-110"
                    style={{
                      background: "linear-gradient(135deg, #0097b2 0%, #7c3aed 100%)",
                      boxShadow: "0 8px 32px rgba(0,151,178,0.35)",
                    }}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Xem dự án
                  </button>
                  <a
                    href="https://github.com/khang26042012"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm text-white/70 transition-all duration-200 hover:scale-[1.04]"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    <Github className="w-4 h-4" />
                    GitHub
                  </a>
                  <button
                    onClick={() => navigate("/tool")}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 hover:scale-[1.04]"
                    style={{
                      background: "rgba(52,211,153,0.08)",
                      border: "1px solid rgba(52,211,153,0.22)",
                      color: "#34d399",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    <Zap className="w-4 h-4" />
                    Tools
                  </button>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Scroll hint */}
          <motion.div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 cursor-pointer"
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            onClick={() => document.getElementById("gioi-thieu")?.scrollIntoView({ behavior: "smooth" })}
          >
            <span className="text-[10px] font-mono tracking-widest text-cyan-500/30">SCROLL</span>
            <ChevronDown className="w-4 h-4 text-cyan-500/30" />
          </motion.div>
        </section>

        {/* ══════ ABOUT ══════ */}
        <section id="gioi-thieu" className="relative py-28 px-6 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-[50vw] h-[50vw] rounded-full" style={{
              background: "radial-gradient(ellipse, rgba(0,180,220,0.04) 0%, transparent 70%)"
            }} />
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

              {/* Text */}
              <div>
                <SectionTitle label="about me" title="Giới Thiệu" accent="#00d4ff" />
                <div className="space-y-5">
                  {[
                    "Mình là Phan Trọng Khang — developer sinh năm 2006. Đam mê xây dựng hệ thống end-to-end từ phần cứng đến cloud.",
                    "Dự án chính hiện tại là NexoraGarden — hệ thống IoT smart garden hoàn chỉnh: ESP32, API server, React dashboard, Telegram bot và AI phân tích dữ liệu.",
                    "Ngoài code, mình thích tìm hiểu AI/ML, khám phá công nghệ mới và thiết kế 3D.",
                  ].map((text, i) => (
                    <motion.p
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: i * 0.1 }}
                      className="text-base leading-relaxed text-white/50"
                    >
                      {text}
                    </motion.p>
                  ))}
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.35 }}
                  className="grid grid-cols-3 gap-4 mt-10"
                >
                  {[
                    { val: "3+", label: "Years coding" },
                    { val: "10+", label: "Projects" },
                    { val: "5+", label: "Technologies" },
                  ].map(({ val, label }) => (
                    <div key={label} className={`${glass("text-center py-4 px-3")}`}>
                      <div className="text-2xl font-black mb-1" style={{
                        background: "linear-gradient(135deg, #00d4ff, #a78bfa)",
                        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                      }}>
                        {val}
                      </div>
                      <div className="text-[11px] font-mono text-white/30">{label}</div>
                    </div>
                  ))}
                </motion.div>
              </div>

              {/* Avatar glass card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className={`${glass("p-6 flex flex-col items-center gap-5")}`}
                style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)" }}
              >
                <div className="w-28 h-28 rounded-2xl overflow-hidden" style={{
                  boxShadow: "0 0 30px rgba(0,212,255,0.2), 0 0 0 2px rgba(0,212,255,0.15)"
                }}>
                  <img src={avatarImg} alt="Phan Trọng Khang" className="w-full h-full object-cover" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-bold text-white/90">Phan Trọng Khang</h3>
                  <p className="text-sm text-cyan-400/60 mt-1">Full-Stack Dev · IoT Engineer</p>
                </div>
                <div className="w-full h-px bg-white/5" />
                <div className="w-full flex flex-col gap-2 text-sm">
                  {[
                    { label: "Status", value: "🟢 Available", color: "#34d399" },
                    { label: "Location", value: "Vĩnh Hoà, Việt Nam", color: "#60a5fa" },
                    { label: "Focus", value: "NexoraGarden IoT", color: "#a78bfa" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-white/30 text-xs">{label}</span>
                      <span className="text-xs font-medium" style={{ color }}>{value}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ══════ SKILLS ══════ */}
        <section className="relative py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <SectionTitle label="my skills" title="Kỹ Năng" accent="#818cf8" />
            <div className="flex flex-wrap gap-2.5">
              {SKILLS.map((skill, i) => <SkillChip key={skill.name} skill={skill} i={i} />)}
            </div>
          </div>
        </section>

        {/* ══════ PROJECTS ══════ */}
        <section id="du-an" className="relative py-28 px-6">
          <div className="max-w-5xl mx-auto">
            <SectionTitle label="projects" title="Dự Án" accent="#34d399" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {PROJECTS.map((p, i) => <ProjectCard key={p.id} p={p} i={i} />)}
            </div>
          </div>
        </section>

        {/* ══════ CONTACT ══════ */}
        <section id="lien-he" className="relative py-28 px-6 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60vw] h-[50vw] rounded-full" style={{
              background: "radial-gradient(ellipse, rgba(0,180,220,0.04) 0%, transparent 65%)"
            }} />
          </div>

          <div className="max-w-5xl mx-auto">
            <SectionTitle label="contact" title="Liên Hệ" accent="#e879f9" />

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-base text-white/45 leading-relaxed mb-10 max-w-xl"
            >
              Muốn hợp tác, trao đổi về IoT / AI / Web hoặc chỉ muốn chào hỏi? Mình rất vui được nghe từ bạn.
            </motion.p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CONTACTS.map((c, i) => <ContactCard key={c.label} c={c} i={i} />)}
            </div>
          </div>
        </section>

        {/* ══════ FOOTER ══════ */}
        <footer className="py-8 px-6 text-center border-t border-white/5">
          <p className="text-sm text-white/20">
            © 2026 Phan Trọng Khang · Built with React + Three.js
          </p>
        </footer>
      </div>
    </>
  );
}
