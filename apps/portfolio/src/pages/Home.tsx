import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Github, Mail, ExternalLink, ChevronDown, Terminal,
  Cpu, Wifi, Globe, Leaf, Code2, Zap, Database, Bot,
  ArrowUpRight, Star, GitFork,
} from "lucide-react";
import { ThreeScene } from "@/components/ThreeScene";
import { ThreeAbout, ThreeProjects, ThreeContact } from "@/components/ThreeSections";
import { Navigation } from "@/components/navigation";
import { LoadingScreen } from "@/components/LoadingScreen";

/* ── Helpers ── */
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 32 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.75, delay, ease: [0.16, 1, 0.3, 1] as [number,number,number,number] },
});

/* ── Skills data ── */
const SKILLS = [
  { name: "Python",       icon: Terminal,  color: "#a78bfa", glow: "rgba(167,139,250,0.15)" },
  { name: "JavaScript",   icon: Code2,     color: "#fbbf24", glow: "rgba(251,191,36,0.15)"  },
  { name: "TypeScript",   icon: Code2,     color: "#60a5fa", glow: "rgba(96,165,250,0.15)"  },
  { name: "React",        icon: Globe,     color: "#38bdf8", glow: "rgba(56,189,248,0.15)"  },
  { name: "Node.js",      icon: Zap,       color: "#34d399", glow: "rgba(52,211,153,0.15)"  },
  { name: "ESP32 / IoT",  icon: Cpu,       color: "#f97316", glow: "rgba(249,115,22,0.15)"  },
  { name: "SQLite / DB",  icon: Database,  color: "#e879f9", glow: "rgba(232,121,249,0.15)" },
  { name: "Telegram Bot", icon: Bot,       color: "#06b6d4", glow: "rgba(6,182,212,0.15)"   },
  { name: "WebSocket",    icon: Wifi,      color: "#c084fc", glow: "rgba(192,132,252,0.15)" },
  { name: "Docker",       icon: Globe,     color: "#2dd4bf", glow: "rgba(45,212,191,0.15)"  },
];

/* ── Projects data ── */
const PROJECTS = [
  {
    id: "nexora",
    title: "NexoraGarden",
    subtitle: "IoT Smart Garden System",
    desc: "Hệ thống vườn thông minh toàn diện: ESP32 thu thập dữ liệu cảm biến, API server xử lý real-time, dashboard web, Telegram bot điều khiển và phân tích AI.",
    tags: ["ESP32", "Python", "React", "WebSocket", "Telegram", "SQLite"],
    icon: Leaf,
    iconColor: "#34d399",
    iconGlow: "rgba(52,211,153,0.18)",
    borderColor: "rgba(52,211,153,0.2)",
    glowColor: "rgba(52,211,153,0.06)",
    accent: "#34d399",
    stars: 12,
    forks: 3,
    github: "https://github.com/khang26042012/Nexora",
    isMain: true,
  },
  {
    id: "portfolio",
    title: "Portfolio",
    subtitle: "Personal Website",
    desc: "Trang portfolio cá nhân với Three.js — cổng void huyền bí, rune circles, arcane motes và aurora. Framer Motion animations, responsive design.",
    tags: ["React", "Three.js", "TypeScript", "Vite", "Framer Motion"],
    icon: Globe,
    iconColor: "#a78bfa",
    iconGlow: "rgba(167,139,250,0.18)",
    borderColor: "rgba(167,139,250,0.2)",
    glowColor: "rgba(167,139,250,0.06)",
    accent: "#a78bfa",
    stars: 5,
    forks: 1,
    github: "https://github.com/khang26042012/Nexora",
    isMain: false,
  },
  {
    id: "tools",
    title: "Arcane Tools",
    subtitle: "Utility Collection",
    desc: "Bộ công cụ tiện ích: Video Downloader hỗ trợ YouTube, TikTok, Instagram & 1000+ nền tảng. Được xây dựng với yt-dlp + ffmpeg.",
    tags: ["yt-dlp", "ffmpeg", "Node.js", "Express"],
    icon: Zap,
    iconColor: "#f97316",
    iconGlow: "rgba(249,115,22,0.18)",
    borderColor: "rgba(249,115,22,0.2)",
    glowColor: "rgba(249,115,22,0.06)",
    accent: "#f97316",
    stars: 8,
    forks: 2,
    github: "https://github.com/khang26042012/Nexora",
    isMain: false,
  },
];

/* ── Skill Chip ── */
function SkillChip({ skill, i }: { skill: typeof SKILLS[0]; i: number }) {
  const Icon = skill.icon;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay: i * 0.045, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
      style={{
        background: `linear-gradient(135deg, ${skill.glow} 0%, rgba(255,255,255,0.02) 100%)`,
        border: `1px solid ${skill.color}28`,
        backdropFilter: "blur(8px)",
      }}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: skill.color }} />
      <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.75)" }}>
        {skill.name}
      </span>
    </motion.div>
  );
}

/* ── Project Card ── */
function ProjectCard({ project, i }: { project: typeof PROJECTS[0]; i: number }) {
  const [hovered, setHovered] = useState(false);
  const Icon = project.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 48 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative rounded-2xl overflow-hidden"
      style={{
        background: hovered
          ? `linear-gradient(145deg, ${project.glowColor} 0%, rgba(255,255,255,0.025) 100%)`
          : "linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
        border: hovered ? `1px solid ${project.borderColor}` : "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(12px)",
        transition: "background 0.35s, border 0.35s",
      }}
    >
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.4 }}
        style={{
          background: `radial-gradient(ellipse at 30% 0%, ${project.glowColor} 0%, transparent 65%)`,
          filter: "blur(8px)",
        }}
      />

      {project.isMain && (
        <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider z-10"
          style={{ background: `${project.iconColor}18`, border: `1px solid ${project.iconColor}40`, color: project.iconColor }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: project.iconColor }} />
          LIVE
        </div>
      )}

      <div className="relative p-6 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: project.iconGlow, border: `1px solid ${project.borderColor}` }}>
            <Icon className="w-5 h-5" style={{ color: project.iconColor }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-white/90 leading-tight">{project.title}</h3>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{project.subtitle}</p>
          </div>
        </div>

        <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
          {project.desc}
        </p>

        <div className="flex flex-wrap gap-1.5">
          {project.tags.map(tag => (
            <span key={tag} className="px-2 py-0.5 rounded-md text-[11px] font-medium"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)" }}>
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
              <Star className="w-3 h-3" /> {project.stars}
            </div>
            <div className="flex items-center gap-1 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
              <GitFork className="w-3 h-3" /> {project.forks}
            </div>
          </div>
          <a
            href={project.github}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-medium"
            style={{ color: project.iconColor }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.7"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
          >
            <Github className="w-3.5 h-3.5" />
            Code
            <ArrowUpRight className="w-3 h-3" />
          </a>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Section Title ── */
function SectionTitle({ en, vi, accent }: { en: string; vi: string; accent: string }) {
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
        {en}
      </motion.p>
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.08 }}
        className="text-3xl sm:text-4xl font-black text-white"
      >
        {vi}
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

/* ══════════════════════════════
   MAIN PAGE
══════════════════════════════ */
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

      <div className="min-h-screen" style={{ background: "#000010" }}>
        <Navigation />

        {/* ═══ HERO ═══ */}
        <section id="trang-chu" className="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden">
          <ThreeScene className="absolute inset-0 w-full h-full" />

          <div className="absolute inset-0 pointer-events-none" style={{
            background: "linear-gradient(to bottom, rgba(0,0,10,0.15) 0%, rgba(0,0,10,0.05) 50%, rgba(0,0,16,0.92) 100%)"
          }} />

          <div className="relative z-10 text-center px-6 max-w-3xl mx-auto">
            <motion.div
              {...fadeUp(0.3)}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 text-xs font-mono tracking-widest"
              style={{
                background: "rgba(100,0,255,0.12)",
                border: "1px solid rgba(140,60,255,0.28)",
                color: "rgba(190,140,255,0.85)",
                backdropFilter: "blur(12px)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#a78bfa" }} />
              FULL-STACK DEVELOPER · IoT ENGINEER
            </motion.div>

            <motion.h1
              {...fadeUp(0.45)}
              className="text-5xl sm:text-7xl font-black mb-4 leading-none tracking-tight"
            >
              <span style={{
                background: "linear-gradient(135deg, #e2d9ff 0%, #c084fc 35%, #818cf8 65%, #38bdf8 100%)",
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
              {...fadeUp(0.6)}
              className="text-base sm:text-lg mb-10 max-w-xl mx-auto leading-relaxed"
              style={{ color: "rgba(200,180,255,0.55)" }}
            >
              Kiến trúc hệ thống thông minh từ firmware đến cloud.
              <br className="hidden sm:block" />
              Hiện tại đang xây dựng{" "}
              <span style={{ color: "#34d399", fontWeight: 600 }}>NexoraGarden</span>
              {" "}— IoT smart garden system.
            </motion.p>

            <motion.div
              {...fadeUp(0.75)}
              className="flex flex-wrap items-center justify-center gap-3"
            >
              <button
                onClick={() => document.getElementById("du-an")?.scrollIntoView({ behavior: "smooth" })}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white transition-all duration-200 hover:scale-[1.03]"
                style={{
                  background: "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)",
                  boxShadow: "0 8px 32px rgba(124,58,237,0.35)",
                }}
              >
                <ExternalLink className="w-4 h-4" />
                Xem dự án
              </button>
              <a
                href="https://github.com/khang26042012"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:scale-[1.03]"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.75)",
                  backdropFilter: "blur(10px)",
                }}
              >
                <Github className="w-4 h-4" />
                GitHub
              </a>
              <button
                onClick={() => navigate("/tool")}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:scale-[1.03]"
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

          <motion.div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 cursor-pointer"
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            onClick={() => document.getElementById("gioi-thieu")?.scrollIntoView({ behavior: "smooth" })}
          >
            <span className="text-[10px] font-mono tracking-widest" style={{ color: "rgba(160,100,255,0.4)" }}>SCROLL</span>
            <ChevronDown className="w-4 h-4" style={{ color: "rgba(160,100,255,0.4)" }} />
          </motion.div>
        </section>

        {/* ═══ ABOUT ═══ */}
        <section id="gioi-thieu" className="relative py-28 px-6 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-[50vw] h-[50vw] rounded-full" style={{
              background: "radial-gradient(ellipse, rgba(100,0,255,0.05) 0%, transparent 70%)"
            }} />
          </div>

          <div className="relative max-w-5xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <SectionTitle en="about me" vi="Giới Thiệu" accent="#a78bfa" />
                <div className="space-y-5">
                  {[
                    "Mình là Phan Trọng Khang — developer sinh năm 2006, đang theo học CNTT tại TP.HCM. Đam mê xây dựng hệ thống end-to-end từ phần cứng đến cloud.",
                    "Dự án chính hiện tại là NexoraGarden — một hệ thống IoT smart garden hoàn chỉnh: ESP32 phần cứng, API server Python/Node.js, dashboard React, Telegram bot điều khiển và AI phân tích dữ liệu cảm biến.",
                    "Ngoài code, mình thích tìm hiểu về AI/ML, khám phá các công nghệ mới và đôi khi thiết kế 3D với Blender.",
                  ].map((text, i) => (
                    <motion.p
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{ duration: 0.6, delay: i * 0.12 }}
                      className="text-base leading-relaxed"
                      style={{ color: "rgba(255,255,255,0.55)" }}
                    >
                      {text}
                    </motion.p>
                  ))}
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="grid grid-cols-3 gap-4 mt-10"
                >
                  {[
                    { val: "3+",  label: "Years coding" },
                    { val: "10+", label: "Projects" },
                    { val: "5+",  label: "Technologies" },
                  ].map(({ val, label }) => (
                    <div key={label} className="text-center py-4 px-3 rounded-xl"
                      style={{ background: "rgba(120,60,255,0.06)", border: "1px solid rgba(120,60,255,0.12)" }}>
                      <div className="text-2xl font-black mb-1" style={{
                        background: "linear-gradient(135deg, #c084fc, #818cf8)",
                        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                      }}>
                        {val}
                      </div>
                      <div className="text-[11px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>{label}</div>
                    </div>
                  ))}
                </motion.div>
              </div>

              <div className="relative h-72 lg:h-96">
                <ThreeAbout className="w-full h-full" />
                <div className="absolute inset-0 pointer-events-none rounded-2xl" style={{
                  background: "radial-gradient(ellipse at 50% 50%, rgba(100,0,255,0.07) 0%, transparent 70%)"
                }} />
              </div>
            </div>
          </div>
        </section>

        {/* ═══ SKILLS ═══ */}
        <section className="relative py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <SectionTitle en="my skills" vi="Kỹ Năng" accent="#60a5fa" />
            <div className="flex flex-wrap gap-2.5">
              {SKILLS.map((skill, i) => (
                <SkillChip key={skill.name} skill={skill} i={i} />
              ))}
            </div>
          </div>
        </section>

        {/* ═══ PROJECTS ═══ */}
        <section id="du-an" className="relative py-28 px-6 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -bottom-10 left-0 right-0 h-64" style={{
              background: "radial-gradient(ellipse at 50% 100%, rgba(80,0,200,0.06) 0%, transparent 70%)"
            }} />
          </div>
          <div className="relative max-w-5xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start mb-16">
              <div>
                <SectionTitle en="projects" vi="Dự Án" accent="#34d399" />
              </div>
              <div className="h-52 lg:h-64">
                <ThreeProjects className="w-full h-full" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {PROJECTS.map((project, i) => (
                <ProjectCard key={project.id} project={project} i={i} />
              ))}
            </div>
          </div>
        </section>

        {/* ═══ CONTACT ═══ */}
        <section id="lien-he" className="relative py-28 px-6 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60vw] h-[60vw] rounded-full" style={{
              background: "radial-gradient(ellipse, rgba(100,0,255,0.05) 0%, transparent 65%)"
            }} />
          </div>

          <div className="relative max-w-5xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <SectionTitle en="contact" vi="Liên Hệ" accent="#e879f9" />

                <motion.p
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="text-base leading-relaxed mb-10"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  Muốn hợp tác, trao đổi về IoT / AI / Web hoặc chỉ muốn chào hỏi? Mình rất vui được nghe từ bạn.
                </motion.p>

                <div className="flex flex-col gap-4">
                  {[
                    {
                      icon: Mail,
                      label: "Email",
                      value: "khang260402@gmail.com",
                      href: "mailto:khang260402@gmail.com",
                      color: "#e879f9",
                    },
                    {
                      icon: Github,
                      label: "GitHub",
                      value: "khang26042012",
                      href: "https://github.com/khang26042012",
                      color: "#a78bfa",
                    },
                  ].map(({ icon: Icon, label, value, href, color }, i) => (
                    <motion.a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                      className="flex items-center gap-4 px-5 py-4 rounded-xl group transition-all duration-200"
                      style={{
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.background = `${color}08`;
                        (e.currentTarget as HTMLElement).style.border = `1px solid ${color}30`;
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)";
                        (e.currentTarget as HTMLElement).style.border = "1px solid rgba(255,255,255,0.06)";
                      }}
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
                        <Icon className="w-4 h-4" style={{ color }} />
                      </div>
                      <div>
                        <p className="text-xs font-mono mb-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{label}</p>
                        <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>{value}</p>
                      </div>
                      <ArrowUpRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-50 transition-opacity" style={{ color }} />
                    </motion.a>
                  ))}
                </div>
              </div>

              <div className="h-56 lg:h-72">
                <ThreeContact className="w-full h-full" />
              </div>
            </div>
          </div>
        </section>

        {/* ═══ FOOTER ═══ */}
        <footer className="py-10 px-6 text-center" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <p className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>
            © 2026 Phan Trọng Khang — Crafted with Three.js, React & arcane energy ✦
          </p>
          <div className="flex items-center justify-center gap-2 mt-3">
            {["#a78bfa", "#38bdf8", "#34d399", "#e879f9"].map(c => (
              <div key={c} className="w-1.5 h-1.5 rounded-full" style={{
                background: c, boxShadow: `0 0 5px ${c}`, opacity: 0.6
              }} />
            ))}
          </div>
        </footer>
      </div>
    </>
  );
}
