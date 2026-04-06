import { Navigation } from "@/components/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Youtube, ArrowUpRight, Sparkles, Lock } from "lucide-react";
import { useState } from "react";

/* ── Danh sách tool ── */
const TOOLS = [
  {
    id: "yt-downloader",
    icon: Youtube,
    iconColor: "#ff4444",
    iconBg: "rgba(255,68,68,0.12)",
    iconBorder: "rgba(255,68,68,0.2)",
    glowColor: "rgba(255,68,68,0.15)",
    name: "YouTube Downloader",
    desc: "Tải video YouTube chất lượng cao — hỗ trợ 1080p, 720p, 480p. Chỉ cần dán link là xong.",
    tag: "Video",
    tagColor: "#ff4444",
    available: true,
  },
];

/* ── Tool card ── */
function ToolCard({ tool, index }: { tool: typeof TOOLS[0]; index: number }) {
  const [hovered, setHovered] = useState(false);
  const Icon = tool.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.1 + index * 0.1, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative cursor-pointer select-none"
      style={{ perspective: "800px" }}>

      {/* Glow behind card */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        style={{
          background: `radial-gradient(ellipse at 50% 100%, ${tool.glowColor} 0%, transparent 70%)`,
          filter: "blur(16px)",
          transform: "translateY(8px) scaleX(0.85)",
        }} />

      {/* Card body */}
      <motion.div
        animate={{
          rotateX: hovered ? -2 : 0,
          y: hovered ? -4 : 0,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        className="relative rounded-2xl p-5 flex flex-col gap-4 overflow-hidden"
        style={{
          background: "linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
          border: hovered ? `1px solid ${tool.iconBorder}` : "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(12px)",
          transition: "border 0.3s",
        }}>

        {/* Shimmer top-left */}
        <motion.div
          className="absolute top-0 left-0 w-32 h-32 pointer-events-none"
          animate={{ opacity: hovered ? 0.6 : 0.2 }}
          style={{
            background: `radial-gradient(ellipse at 0% 0%, ${tool.glowColor} 0%, transparent 70%)`,
          }} />

        {/* Corner arrow */}
        <motion.div
          className="absolute top-4 right-4"
          animate={{ opacity: hovered ? 1 : 0, x: hovered ? 0 : 6, y: hovered ? 0 : -6 }}
          transition={{ duration: 0.2 }}>
          {tool.available
            ? <ArrowUpRight className="w-4 h-4" style={{ color: tool.iconColor }} />
            : <Lock className="w-3.5 h-3.5 text-white/20" />}
        </motion.div>

        {/* Icon */}
        <div className="relative w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: tool.iconBg,
            border: `1px solid ${tool.iconBorder}`,
          }}>
          <motion.div
            animate={{ scale: hovered ? 1.1 : 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}>
            <Icon className="w-5 h-5" style={{ color: tool.iconColor }} />
          </motion.div>

          {/* Pulse ring khi hover */}
          <AnimatePresence>
            {hovered && (
              <motion.div
                className="absolute inset-0 rounded-xl"
                initial={{ opacity: 0.8, scale: 1 }}
                animate={{ opacity: 0, scale: 1.8 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                style={{ border: `1px solid ${tool.iconColor}` }} />
            )}
          </AnimatePresence>
        </div>

        {/* Text */}
        <div className="flex flex-col gap-1.5 relative">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white/90">{tool.name}</h3>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md tracking-wide"
              style={{
                background: `${tool.tagColor}18`,
                color: tool.tagColor,
                border: `1px solid ${tool.tagColor}30`,
              }}>
              {tool.tag}
            </span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
            {tool.desc}
          </p>
        </div>

        {/* Bottom bar */}
        <motion.div
          className="h-px w-full rounded-full"
          animate={{ scaleX: hovered ? 1 : 0, opacity: hovered ? 1 : 0 }}
          style={{
            background: `linear-gradient(to right, transparent, ${tool.iconColor}, transparent)`,
            transformOrigin: "left",
          }}
          transition={{ duration: 0.35 }} />
      </motion.div>
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
    <div className="min-h-screen" style={{ background: "#020008" }}>
      <Navigation />

      {/* Background ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(124,58,237,0.06) 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 right-[-10%] w-[40vw] h-[40vw] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(56,189,248,0.04) 0%, transparent 70%)" }} />
      </div>

      <div className="relative max-w-3xl mx-auto px-5 pt-28 pb-20">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4" style={{ color: "#a78bfa" }} />
            <span className="text-xs font-mono tracking-widest uppercase" style={{ color: "#a78bfa" }}>
              Công cụ
            </span>
          </div>
          <h1 className="text-3xl font-black text-white mb-2">
            Tool Box
          </h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            Các tiện ích nhỏ mình tự làm — dùng miễn phí, không cần đăng ký.
          </p>
        </motion.div>

        {/* Search bar */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative mb-10">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: "rgba(255,255,255,0.25)" }} />
            <input
              type="text"
              placeholder="Tìm tool..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm text-white/80 outline-none transition-all duration-200"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                caretColor: "#a78bfa",
              }}
              onFocus={e => {
                (e.target as HTMLElement).style.border = "1px solid rgba(139,92,246,0.4)";
                (e.target as HTMLElement).style.background = "rgba(139,92,246,0.06)";
              }}
              onBlur={e => {
                (e.target as HTMLElement).style.border = "1px solid rgba(255,255,255,0.08)";
                (e.target as HTMLElement).style.background = "rgba(255,255,255,0.04)";
              }}
            />
          </div>
        </motion.div>

        {/* Grid */}
        <AnimatePresence mode="popLayout">
          {filtered.length > 0 ? (
            <motion.div
              key="grid"
              className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filtered.map((tool, i) => (
                <ToolCard key={tool.id} tool={tool} index={i} />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center py-20">
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
