import { Navigation } from "@/components/navigation";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import { Sparkles, ArrowUpRight, ExternalLink, FolderKanban, Leaf, Bot, Wrench, Github } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

const FONT = "'Plus Jakarta Sans', sans-serif";

type Project = {
  id: string;
  icon: typeof Leaf;
  iconColor: string;
  iconBg: string;
  iconBorder: string;
  glowColor: string;
  name: string;
  tagline: string;
  desc: string;
  status: "live" | "beta" | "dev";
  statusLabel: string;
  tags: string[];
  href: string;
  external?: boolean;
};

const PROJECTS: Project[] = [
  {
    id: "nexora-garden",
    icon: Leaf,
    iconColor: "rgba(134,239,172,0.9)",
    iconBg: "rgba(134,239,172,0.1)",
    iconBorder: "rgba(134,239,172,0.25)",
    glowColor: "rgba(134,239,172,0.12)",
    name: "NexoraGarden",
    tagline: "Vườn nội dung cá nhân",
    desc: "Nền tảng nhật ký và bài viết cá nhân — nơi mình lưu lại những thứ học được, những dự án nhỏ và suy nghĩ hằng ngày. Tối giản, tập trung vào nội dung.",
    status: "live",
    statusLabel: "Đang chạy",
    tags: ["Content", "Blog", "React"],
    href: "https://nexorax.cloud/NexoraGarden",
    external: true,
  },
  {
    id: "nexora-ai",
    icon: Bot,
    iconColor: "rgba(196,181,253,0.9)",
    iconBg: "rgba(196,181,253,0.1)",
    iconBorder: "rgba(196,181,253,0.25)",
    glowColor: "rgba(196,181,253,0.12)",
    name: "NexoraAI",
    tagline: "Trợ lý AI thông minh",
    desc: "Chatbot AI tích hợp xử lý văn bản, ảnh, video, sinh ảnh và nhiều tác vụ khác. Hỗ trợ đa định dạng file, tìm kiếm web và streaming response thời gian thực.",
    status: "live",
    statusLabel: "Đang chạy",
    tags: ["AI", "Chat", "Multimodal"],
    href: "/chat",
  },
  {
    id: "nexora-tool",
    icon: Wrench,
    iconColor: "rgba(147,197,253,0.9)",
    iconBg: "rgba(147,197,253,0.1)",
    iconBorder: "rgba(147,197,253,0.25)",
    glowColor: "rgba(147,197,253,0.12)",
    name: "NexoraTool",
    tagline: "Hub công cụ all-in-one",
    desc: "Bộ sưu tập 20+ tiện ích miễn phí: AI summarizer, translator, image to text, password generator, speed test, file converter… Không cần đăng ký.",
    status: "live",
    statusLabel: "Đang chạy",
    tags: ["Utility", "AI Tools", "Free"],
    href: "/tool",
  },
];

/* ── Animated Border Card ── */
function AnimBorderCard({ children, speed = 4, color = "rgba(255,255,255,0.85)", radius = 18, className = "", innerStyle = {} }: {
  children: React.ReactNode; speed?: number; color?: string; radius?: number; className?: string; innerStyle?: React.CSSProperties;
}) {
  return (
    <div className={`running-border ${className}`} style={{
      "--rb-speed": `${speed}s`,
      "--rb-color": color,
      "--rb-radius": `${radius}px`,
      background: "rgba(255,255,255,0.04)",
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      ...innerStyle,
    } as React.CSSProperties}>
      {children}
    </div>
  );
}

/* ── Floating particles ── */
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

/* ── Project Card ── */
function ProjectCard({ project, index }: { project: Project; index: number }) {
  const [hovered, setHovered] = useState(false);
  const [, navigate] = useLocation();
  const Icon = project.icon;
  const rotX = useMotionValue(0);
  const rotY = useMotionValue(0);
  const sRX = useSpring(rotX, { stiffness: 200, damping: 18 });
  const sRY = useSpring(rotY, { stiffness: 200, damping: 18 });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    rotX.set(((e.clientY - r.top - r.height / 2) / (r.height / 2)) * -5);
    rotY.set(((e.clientX - r.left - r.width / 2) / (r.width / 2)) * 5);
  };

  const handleOpen = () => {
    if (project.external) {
      window.open(project.href, "_blank", "noopener,noreferrer");
    } else {
      navigate(project.href);
    }
  };

  const statusColor = project.status === "live"
    ? "rgba(134,239,172,0.9)"
    : project.status === "beta"
      ? "rgba(251,191,36,0.9)"
      : "rgba(147,197,253,0.9)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.1 + index * 0.12, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => { setHovered(false); rotX.set(0); rotY.set(0); }}
      onMouseMove={handleMove}
      onClick={handleOpen}
      className="relative cursor-pointer select-none group"
      style={{ perspective: "900px" }}
    >
      {/* Hover glow */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: "absolute", inset: -6, borderRadius: 22, zIndex: -1,
              background: `radial-gradient(ellipse at 50% 50%, ${project.glowColor} 0%, transparent 70%)`,
              filter: "blur(16px)",
            }}
          />
        )}
      </AnimatePresence>

      <AnimBorderCard speed={4} color="rgba(255,255,255,0.5)" radius={18}>
        <motion.div
          style={{ rotateX: sRX, rotateY: sRY, transformStyle: "preserve-3d", padding: "22px" }}
          className="relative flex flex-col gap-4 overflow-hidden h-full"
        >
          {/* Shimmer */}
          <motion.div
            className="absolute top-0 left-0 w-44 h-44 pointer-events-none"
            animate={{ opacity: hovered ? 0.55 : 0.15 }}
            style={{ background: `radial-gradient(ellipse at 0% 0%, ${project.glowColor} 0%, transparent 70%)` }}
          />

          {/* Status dot — top right */}
          <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5 px-2 py-1 rounded-full"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <motion.span
              animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: statusColor, boxShadow: `0 0 6px ${statusColor}` }}
            />
            <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: statusColor }}>
              {project.statusLabel}
            </span>
          </div>

          {/* Icon */}
          <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: project.iconBg, border: `1px solid ${project.iconBorder}` }}>
            <motion.div
              animate={{ scale: hovered ? 1.15 : 1, rotate: hovered ? 6 : 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 20 }}
            >
              <Icon className="w-6 h-6" style={{ color: project.iconColor }} />
            </motion.div>
            <AnimatePresence>
              {hovered && (
                <motion.div
                  className="absolute inset-0 rounded-2xl"
                  initial={{ opacity: 0.7, scale: 1 }}
                  animate={{ opacity: 0, scale: 1.9 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  style={{ border: `1px solid ${project.iconColor}` }}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Text */}
          <div className="flex flex-col gap-1 relative">
            <h3 className="text-lg font-black text-white/95" style={{ fontFamily: FONT }}>{project.name}</h3>
            <p className="text-xs font-medium" style={{ color: project.iconColor }}>{project.tagline}</p>
            <p className="text-sm leading-relaxed mt-2" style={{ color: "rgba(255,255,255,0.5)" }}>
              {project.desc}
            </p>
          </div>

          {/* Tech tags */}
          <div className="flex flex-wrap gap-1.5 relative mt-1">
            {project.tags.map(t => (
              <span key={t} className="text-[10px] font-bold px-2 py-0.5 rounded-md tracking-wide"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  color: "rgba(255,255,255,0.55)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}>
                {t}
              </span>
            ))}
          </div>

          {/* Bottom action */}
          <div className="flex items-center justify-between mt-auto pt-3 relative"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <span className="text-xs font-semibold flex items-center gap-1.5"
              style={{ color: hovered ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.5)", transition: "color 0.2s" }}>
              {project.external ? "Mở project" : "Vào ngay"}
              {project.external
                ? <ExternalLink className="w-3 h-3" />
                : <ArrowUpRight className="w-3.5 h-3.5" />}
            </span>
            <motion.div
              className="h-px rounded-full"
              animate={{ width: hovered ? "40%" : "0%", opacity: hovered ? 1 : 0 }}
              style={{ background: `linear-gradient(to right, transparent, ${project.iconColor}, transparent)` }}
              transition={{ duration: 0.35 }}
            />
          </div>
        </motion.div>
      </AnimBorderCard>
    </motion.div>
  );
}

/* ── Page ── */
export function Project() {
  return (
    <div className="min-h-screen" style={{ background: "#050505", fontFamily: FONT }}>
      <Navigation />
      <Particles />

      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-20%] left-[-10%] w-[55vw] h-[55vw] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(255,210,160,0.04) 0%, transparent 70%)" }}
        />
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 4 }}
          className="absolute bottom-0 right-[-10%] w-[40vw] h-[40vw] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(196,181,253,0.04) 0%, transparent 70%)" }}
        />
      </div>

      <div className="relative max-w-5xl mx-auto px-5 pt-28 pb-20">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10"
        >
          <div className="flex items-center gap-2 mb-3">
            <motion.div
              animate={{ rotate: [0, 12, -8, 12, 0] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 4 }}
            >
              <FolderKanban className="w-4 h-4" style={{ color: "rgba(255,210,160,0.6)" }} />
            </motion.div>
            <span className="text-xs font-mono tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>
              Dự án
            </span>
          </div>
          <h1 className="text-3xl font-black text-white mb-2">Project</h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            Những thứ mình đã xây dựng — mỗi dự án là một mảnh ghép trong hệ sinh thái Nexora.
          </p>
        </motion.div>

        {/* Stats banner */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="mb-8 flex items-center gap-6 px-5 py-3.5 rounded-xl"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div>
            <div className="text-xl font-black text-white">{PROJECTS.length}</div>
            <div className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>Dự án</div>
          </div>
          <div className="w-px h-8" style={{ background: "rgba(255,255,255,0.08)" }} />
          <div>
            <div className="text-xl font-black flex items-center gap-1.5" style={{ color: "rgba(134,239,172,0.95)" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "rgba(134,239,172,0.95)", boxShadow: "0 0 6px rgba(134,239,172,0.95)" }} />
              {PROJECTS.filter(p => p.status === "live").length}
            </div>
            <div className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>Đang chạy</div>
          </div>
          <div className="w-px h-8" style={{ background: "rgba(255,255,255,0.08)" }} />
          <div className="ml-auto hidden sm:flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.4)" }} />
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>Made by Phan Trọng Khang</span>
          </div>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PROJECTS.map((p, i) => (
            <ProjectCard key={p.id} project={p} index={i} />
          ))}
        </div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center text-[11px] mt-10"
          style={{ color: "rgba(255,255,255,0.25)" }}
        >
          Tất cả dự án đều miễn phí, mã nguồn quản lý nội bộ
          <Github className="inline w-3 h-3 ml-1.5 -mt-0.5 opacity-50" />
        </motion.p>
      </div>
    </div>
  );
}
