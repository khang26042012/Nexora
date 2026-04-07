import { Navigation } from "@/components/navigation";
import { ThreeScene } from "@/components/ThreeScene";
import { ThreeAbout, ThreeProjects, ThreeContact } from "@/components/ThreeSections";
import {
  motion, useMotionValue, useSpring, AnimatePresence, useInView,
} from "framer-motion";
import {
  ArrowRight, Github, Mail, ExternalLink, Cpu, Network, Zap, Phone,
  Trophy, Sparkles, Leaf, Code2, Wifi, Brain, CloudCog, MessageSquare,
  GraduationCap, ChevronDown,
} from "lucide-react";
import { useRef, useEffect, useState, useCallback } from "react";
import avatarImg from "@assets/IMG_20251219_183126_1775387730987.jpg";

/* ─── Reveal wrapper — bidirectional (once: false) ─── */
function Reveal({
  children,
  delay = 0,
  y = 32,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{ duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Cursor glow (desktop) ─── */
function CursorGlow() {
  const x = useMotionValue(-400);
  const y = useMotionValue(-400);
  const sx = useSpring(x, { stiffness: 80, damping: 25 });
  const sy = useSpring(y, { stiffness: 80, damping: 25 });
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const h = (e: MouseEvent) => { x.set(e.clientX - 250); y.set(e.clientY - 250); setVis(true); };
    window.addEventListener("mousemove", h);
    return () => window.removeEventListener("mousemove", h);
  }, [x, y]);
  if (!vis) return null;
  return (
    <motion.div
      className="pointer-events-none fixed z-0 w-[500px] h-[500px] rounded-full hidden md:block"
      style={{ left: sx, top: sy, background: "radial-gradient(circle, rgba(124,80,255,0.06) 0%, rgba(80,120,255,0.03) 40%, transparent 70%)" }}
    />
  );
}

/* ─── Glitch text ─── */
function GlitchText({ text }: { text: string }) {
  const [glitch, setGlitch] = useState(false);
  useEffect(() => {
    const id = setInterval(() => { setGlitch(true); setTimeout(() => setGlitch(false), 220); }, 5000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="relative inline-block">
      {text}
      <AnimatePresence>
        {glitch && (
          <>
            <motion.span className="absolute inset-0 text-violet-400/50" initial={{ x: 0 }} animate={{ x: [-4, 4, -2, 0] }} transition={{ duration: 0.22 }} style={{ clipPath: "inset(15% 0 55% 0)" }}>{text}</motion.span>
            <motion.span className="absolute inset-0 text-cyan-400/40" initial={{ x: 0 }} animate={{ x: [4, -4, 2, 0] }} transition={{ duration: 0.22 }} style={{ clipPath: "inset(55% 0 15% 0)" }}>{text}</motion.span>
          </>
        )}
      </AnimatePresence>
    </span>
  );
}

/* ─── Typewriter ─── */
function TypewriterTitle() {
  const titles = ["AI Architect", "Prompt Master", "IoT Developer", "AI Builder"];
  const [idx, setIdx] = useState(0);
  const [disp, setDisp] = useState("");
  const [phase, setPhase] = useState<"typing" | "waiting" | "deleting">("typing");
  useEffect(() => {
    const full = titles[idx];
    let t: ReturnType<typeof setTimeout>;
    if (phase === "typing") {
      t = disp.length < full.length
        ? setTimeout(() => setDisp(full.slice(0, disp.length + 1)), 75)
        : setTimeout(() => setPhase("waiting"), 2200);
    } else if (phase === "waiting") {
      t = setTimeout(() => setPhase("deleting"), 300);
    } else {
      t = disp.length > 0
        ? setTimeout(() => setDisp(disp.slice(0, -1)), 40)
        : (() => { setIdx((i) => (i + 1) % titles.length); setPhase("typing"); return setTimeout(() => {}, 0); })();
    }
    return () => clearTimeout(t);
  }, [disp, phase, idx]);
  return (
    <span className="font-mono">
      {disp}
      <motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.55, repeat: Infinity }}
        className="inline-block w-[2px] h-5 md:h-6 bg-violet-400 ml-0.5 align-middle" />
    </span>
  );
}

/* ─── Avatar orb ─── */
function AvatarOrb() {
  return (
    <div className="relative flex items-center justify-center select-none">
      {[170, 138, 115].map((sz, i) => (
        <motion.div key={sz} className="absolute rounded-full"
          style={{ width: sz, height: sz, border: `1px solid rgba(130,80,255,${0.12 + i * 0.06})` }}
          animate={{ scale: [1, 1 + 0.035 * (i + 1), 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3.5 + i, repeat: Infinity, ease: "easeInOut", delay: i * 0.7 }} />
      ))}
      {/* orbit ring */}
      <motion.div className="absolute w-48 h-48 rounded-full"
        style={{ border: "1px solid rgba(130,80,255,0.3)" }}
        animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}>
        {[0, 72, 144, 216, 288].map((deg) => (
          <div key={deg} className="absolute w-2 h-2 rounded-full"
            style={{ top: "50%", left: "50%", transform: `rotate(${deg}deg) translateX(93px) translateY(-50%)`, background: deg === 0 ? "#a78bfa" : deg === 144 ? "#38bdf8" : "rgba(150,100,255,0.5)" }} />
        ))}
      </motion.div>
      {/* counter ring */}
      <motion.div className="absolute w-40 h-40 rounded-full"
        style={{ border: "1px dashed rgba(80,150,255,0.2)" }}
        animate={{ rotate: -360 }} transition={{ duration: 32, repeat: Infinity, ease: "linear" }} />
      {/* avatar */}
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        whileHover={{ scale: 1.06 }}
        className="relative z-10 w-[115px] h-[115px] rounded-full overflow-hidden"
        style={{ border: "2px solid rgba(130,80,255,0.5)", boxShadow: "0 0 32px rgba(120,60,255,0.35)" }}>
        <img src={avatarImg} alt="Phan Trọng Khang" className="w-full h-full object-cover" />
      </motion.div>
    </div>
  );
}

/* ─── Section title ─── */
function SectionTitle({ label, title }: { label: string; title: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, margin: "-60px" });
  return (
    <div ref={ref} className="mb-12">
      <motion.p
        initial={{ opacity: 0, x: -16 }} animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -16 }}
        transition={{ duration: 0.5 }}
        className="text-xs font-mono tracking-[0.25em] uppercase mb-3 flex items-center gap-2"
        style={{ color: "rgba(160,120,255,0.8)" }}>
        <span className="inline-block w-5 h-px" style={{ background: "rgba(130,80,255,0.6)" }} />{label}
      </motion.p>
      <motion.h2
        initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.65, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-white">
        {title}
      </motion.h2>
      <motion.div
        initial={{ scaleX: 0 }} animate={inView ? { scaleX: 1 } : { scaleX: 0 }}
        transition={{ duration: 0.6, delay: 0.25 }}
        className="w-14 h-0.5 rounded-full origin-left"
        style={{ background: "linear-gradient(90deg,#7c4fff,#a78bfa)" }} />
    </div>
  );
}

/* ─── Skill bars ─── */
const skillsData = [
  { label: "Prompt Engineering", pct: 95, icon: Brain,         color: "#a78bfa" },
  { label: "Trí Tuệ Nhân Tạo",   pct: 88, icon: Sparkles,     color: "#818cf8" },
  { label: "IoT / ESP32",         pct: 80, icon: Wifi,         color: "#38bdf8" },
  { label: "Python",              pct: 75, icon: Code2,        color: "#34d399" },
  { label: "Chatbot AI",          pct: 82, icon: MessageSquare,color: "#fb923c" },
  { label: "Lưu Trữ Đám Mây",    pct: 70, icon: CloudCog,     color: "#f472b6" },
];

function SkillBar({ label, pct, icon: Icon, color, delay }: { label: string; pct: number; icon: React.ElementType; color: string; delay: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, margin: "-50px" });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, x: -20 }} animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
      transition={{ duration: 0.6, delay }}
      className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" style={{ color }} />
          <span className="text-sm font-medium text-white/70">{label}</span>
        </div>
        <motion.span className="text-xs font-mono" style={{ color }}
          initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: delay + 0.4 }}>{pct}%</motion.span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <motion.div className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg,${color}70,${color})` }}
          initial={{ width: 0 }} animate={inView ? { width: `${pct}%` } : { width: 0 }}
          transition={{ duration: 1.1, delay: delay + 0.2, ease: [0.16, 1, 0.3, 1] }} />
      </div>
    </motion.div>
  );
}

/* ─── Timeline ─── */
const timelineData = [
  { year: "2026",       title: "NexoraNode & NexoraGarden",             desc: "Hoàn thiện 2 dự án lớn: NexoraNode — nền tảng quản lý mã nguồn, và NexoraGarden — hệ thống nông nghiệp thông minh IoT.",  icon: Network,       color: "#34d399" },
  { year: "2025",       title: "Nexorax — Web Chatbot Đa Model AI",     desc: "Ra mắt project đầu tiên: Nexorax, web chatbot tích hợp nhiều model AI (GPT, Gemini, Claude) trong một nền tảng duy nhất.", icon: Brain,         color: "#a78bfa" },
  { year: "2024",       title: "Bắt Đầu Làm Các Project Thực Tế",      desc: "Áp dụng kiến thức lập trình vào thực tiễn, xây dựng những dự án đầu tay và tích lũy kinh nghiệm thực chiến.",             icon: Code2,         color: "#818cf8" },
  { year: "2023",       title: "Bước Vào Lĩnh Vực Lập Trình",          desc: "Chính thức học lập trình, làm quen với Python, JavaScript và bắt đầu xây dựng nền tảng kỹ thuật vững chắc.",               icon: Wifi,          color: "#38bdf8" },
  { year: "T5/2022",    title: "Giải Khuyến Khích Tin Học Cấp Tỉnh",   desc: "Đạt giải khuyến khích cuộc thi tin học cấp tỉnh — bước đệm quan trọng khẳng định năng lực vượt ra ngoài trường.",          icon: Sparkles,      color: "#fb923c" },
  { year: "T3/2022",    title: "Giải Nhất Tin Học Cấp Trường Tiểu Học",desc: "Đạt giải nhất cuộc thi tin học cấp trường Tiểu học — dấu mốc đầu tiên ghi nhận tài năng công nghệ.",                     icon: Trophy,        color: "#fbbf24" },
  { year: "2021",       title: "Tự Học Trên Internet",                  desc: "Chủ động tìm tòi, học hỏi qua các nguồn tài nguyên trực tuyến, mở rộng kiến thức công nghệ mỗi ngày.",                       icon: GraduationCap, color: "#60a5fa" },
  { year: "2020",       title: "Bắt Đầu Với Tin Học",                  desc: "Lần đầu tiếp xúc với lĩnh vực tin học, khám phá thế giới máy tính và nhen nhóm ngọn lửa đam mê công nghệ.",                  icon: Zap,           color: "#34d399" },
];

function TimelineItem({ item, i }: { item: (typeof timelineData)[0]; i: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, margin: "-60px" });
  const Icon = item.icon;
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, x: i % 2 === 0 ? -40 : 40 }}
      animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: i % 2 === 0 ? -40 : 40 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="flex gap-4 md:gap-6 items-start">
      <div className="flex flex-col items-center flex-shrink-0">
        <motion.div className="w-10 h-10 rounded-full flex items-center justify-center z-10"
          style={{ background: `${item.color}15`, border: `1px solid ${item.color}40` }}
          whileHover={{ scale: 1.15 }} transition={{ type: "spring", stiffness: 300 }}>
          <Icon className="w-4 h-4" style={{ color: item.color }} />
        </motion.div>
        {i < timelineData.length - 1 && (
          <motion.div className="w-px flex-1 min-h-[40px] mt-2"
            style={{ background: `linear-gradient(180deg,${item.color}30,transparent)` }}
            initial={{ scaleY: 0 }} animate={inView ? { scaleY: 1 } : { scaleY: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }} />
        )}
      </div>
      <div className="pb-8">
        <span className="text-xs font-mono tracking-widest mb-1 block" style={{ color: item.color }}>{item.year}</span>
        <h3 className="text-base md:text-lg font-bold text-white/85 mb-1">{item.title}</h3>
        <p className="text-sm text-white/45 leading-relaxed">{item.desc}</p>
      </div>
    </motion.div>
  );
}

/* ─── Project card ─── */
const projects = [
  { id:"1", title:"NexoraGarden", desc:"Hệ thống nông nghiệp thông minh — ESP32, cảm biến môi trường, giao tiếp thời gian thực tối ưu hóa chăm sóc cây trồng tự động.", tag:"IoT · AI",    icon:Leaf,    href:"https://nexorax.cloud/NexoraGarden", tech:["ESP32","Python","MQTT","AI"],          status:"Active", color:"#34d399" },
  { id:"2", title:"NexoraNode",   desc:"Nền tảng lưu trữ và quản lý mã nguồn đa năng — tổ chức, chia sẻ code thông minh với giao diện tối giản.",                          tag:"Cloud",   icon:Network, href:"https://github.com/khang26042012",    tech:["Node.js","Cloud","API","Storage"],   status:"Beta",   color:"#818cf8" },
  { id:"3", title:"Nexorax",      desc:"Chatbot AI đa mô hình — tích hợp GPT, Gemini, Claude để cung cấp trải nghiệm hội thoại thông minh nhất.",                           tag:"AI · Chat",icon:Cpu,    href:"https://github.com/khang26042012",    tech:["GPT-4","Gemini","Claude","Python"], status:"Live",   color:"#a78bfa" },
];

function ProjectCard({ project, i }: { project: (typeof projects)[0]; i: number }) {
  const Icon = project.icon;
  const [hovered, setHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const rotX = useMotionValue(0); const rotY = useMotionValue(0);
  const sRotX = useSpring(rotX, { stiffness: 180, damping: 22 });
  const sRotY = useSpring(rotY, { stiffness: 180, damping: 22 });
  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const r = cardRef.current?.getBoundingClientRect(); if (!r) return;
    rotX.set(((e.clientY - r.top - r.height / 2) / (r.height / 2)) * -8);
    rotY.set(((e.clientX - r.left - r.width  / 2) / (r.width  / 2)) * 8);
  }, [rotX, rotY]);
  const onLeave = useCallback(() => { rotX.set(0); rotY.set(0); setHovered(false); }, [rotX, rotY]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, margin: "-50px" }}
      transition={{ duration: 0.65, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
      style={{
        rotateX: sRotX, rotateY: sRotY, perspective: 900,
        border: `1px solid ${hovered ? project.color + "40" : "rgba(255,255,255,0.07)"}`,
        transition: "border-color 0.3s",
        background: "rgba(255,255,255,0.025)",
      }}
      ref={cardRef}
      onMouseMove={onMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={onLeave}
      onClick={() => window.open(project.href, "_blank", "noopener,noreferrer")}
      className="relative rounded-2xl overflow-hidden cursor-pointer backdrop-blur-sm">
      <motion.div className="absolute inset-0" animate={{ opacity: hovered ? 1 : 0 }} transition={{ duration: 0.3 }}
        style={{ background: `radial-gradient(ellipse at top left,${project.color}0c,transparent 70%)` }} />
      <div className="p-6 relative z-10">
        <div className="flex items-start justify-between mb-5">
          <motion.div animate={hovered ? { scale: 1.1, rotate: 8 } : { scale: 1, rotate: 0 }}
            transition={{ duration: 0.35, ease: "backOut" }}
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: `${project.color}15`, border: `1px solid ${project.color}30` }}>
            <Icon className="w-5 h-5" style={{ color: project.color }} />
          </motion.div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: project.status === "Live" ? "#34d399" : project.status === "Active" ? "#34d399" : "#fbbf24" }} />
            <span className="text-xs font-mono text-white/40">{project.status}</span>
          </div>
        </div>
        <motion.h3 animate={hovered ? { x: 4 } : { x: 0 }} transition={{ duration: 0.25 }}
          className="text-xl font-bold text-white/85 mb-2">{project.title}</motion.h3>
        <p className="text-sm text-white/45 mb-5 leading-relaxed">{project.desc}</p>
        <div className="flex flex-wrap gap-1.5 mb-5">
          {project.tech.map((t) => (
            <span key={t} className="px-2 py-0.5 text-xs rounded font-mono"
              style={{ background: `${project.color}10`, color: `${project.color}cc`, border: `1px solid ${project.color}20` }}>{t}</span>
          ))}
        </div>
        <motion.a href={project.href} target="_blank" rel="noopener noreferrer"
          animate={{ opacity: hovered ? 1 : 0.35, x: hovered ? 0 : -6 }} transition={{ duration: 0.25 }}
          className="text-sm font-medium flex items-center gap-2" style={{ color: project.color }}
          onClick={(e) => e.stopPropagation()}>
          Xem dự án <ExternalLink className="w-3.5 h-3.5" />
        </motion.a>
      </div>
      <motion.div className="absolute bottom-0 left-0 right-0 h-px" animate={{ opacity: hovered ? 1 : 0 }}
        style={{ background: `linear-gradient(90deg,transparent,${project.color}50,transparent)` }} />
    </motion.div>
  );
}

/* ─── Stat counter ─── */
function StatCounter({ value, label, delay, color }: { value: string; label: string; delay: number; color: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, margin: "-40px" });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }} className="text-center">
      <motion.div className="text-4xl md:text-5xl font-bold font-mono mb-1 tabular-nums" style={{ color }}
        initial={{ scale: 0.5 }} animate={inView ? { scale: 1 } : { scale: 0.5 }}
        transition={{ duration: 0.5, delay: delay + 0.1, type: "spring", stiffness: 200 }}>{value}</motion.div>
      <div className="text-xs text-white/40 font-mono tracking-wider uppercase">{label}</div>
    </motion.div>
  );
}

/* ─── Contact items ─── */
const contactItems = [
  { href:"mailto:trongkhabgphan@gmail.com", icon:Mail,   label:"Email",      sub:"trongkhabgphan@gmail.com", ext:false, delay:0,    color:"#818cf8" },
  { href:"https://www.facebook.com/share/1CX6on9uGs/",
    icon:(p:React.SVGProps<SVGSVGElement>) => <svg viewBox="0 0 24 24" fill="currentColor"{...p}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>,
    label:"Facebook", sub:"Phan Trọng Khang", ext:true, delay:0.07, color:"#60a5fa" },
  { href:"https://t.me/+84352234521",
    icon:(p:React.SVGProps<SVGSVGElement>) => <svg viewBox="0 0 24 24" fill="currentColor"{...p}><path d="M21.198 2.433a2.242 2.242 0 0 0-1.022.215l-16.5 6.676a2.25 2.25 0 0 0 .126 4.238l3.813 1.205 1.837 5.494a.75.75 0 0 0 1.264.281l2.353-2.317 4.223 3.126a2.25 2.25 0 0 0 3.516-1.411l2.624-15.376a2.25 2.25 0 0 0-2.234-2.131zm-1.8 3.07-1.943 11.378-4.101-3.035a.75.75 0 0 0-.932.066l-1.4 1.379-.436-1.305 6.885-7.396a.75.75 0 0 0-.968-1.148L8.118 13.95l-2.92-.923 14.2-5.75.007 1.225z"/></svg>,
    label:"Telegram", sub:"+84 352 234 521", ext:true, delay:0.14, color:"#38bdf8" },
  { href:"https://github.com/khang26042012", icon:Github, label:"GitHub",    sub:"@khang26042012",           ext:true,  delay:0.21, color:"#a78bfa" },
  { href:"tel:0352234521",                   icon:Phone,  label:"Điện Thoại",sub:"0352 234 521",              ext:false, delay:0.28, color:"#34d399" },
];

/* ─── Divider ─── */
function SpaceDivider() {
  return (
    <div className="flex items-center gap-4 my-2">
      <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(130,80,255,0.3))" }} />
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#7c4fff" }} />
      <div className="w-1 h-1 rounded-full" style={{ background: "rgba(130,80,255,0.5)" }} />
      <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(130,80,255,0.3), transparent)" }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════ */
export function Home() {
  return (
    <div className="min-h-screen selection:bg-violet-500/30" style={{ background: "linear-gradient(180deg, #04000f 0%, #060014 30%, #07001a 60%, #05000e 100%)", color: "white", overflowX: "hidden", width: "100%", maxWidth: "100vw" }}>
      <CursorGlow />
      <Navigation />

      {/* ── HERO ── */}
      <section id="trang-chu" className="relative min-h-screen flex items-center justify-center pt-20 px-4 sm:px-6 overflow-hidden">

        {/* Three.js nebula + stars background */}
        <ThreeScene className="absolute inset-0 z-0" />

        {/* ── Ambient glow orbs (CSS) ── */}
        <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
          <div className="absolute" style={{ top: "10%", left: "15%", width: 520, height: 520, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(110,40,220,0.28) 0%, rgba(80,20,180,0.12) 40%, transparent 70%)",
            filter: "blur(40px)", transform: "translateZ(0)" }} />
          <div className="absolute" style={{ top: "20%", right: "10%", width: 400, height: 400, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(30,80,255,0.22) 0%, rgba(20,60,200,0.10) 40%, transparent 70%)",
            filter: "blur(40px)" }} />
          <div className="absolute" style={{ bottom: "30%", left: "5%", width: 300, height: 300, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(180,20,220,0.18) 0%, transparent 70%)",
            filter: "blur(30px)" }} />
          <div className="absolute" style={{ top: "55%", right: "20%", width: 260, height: 260, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,180,255,0.14) 0%, transparent 70%)",
            filter: "blur(25px)" }} />
        </div>

        {/* ── Mountain silhouette layers ── */}
        <div className="absolute bottom-0 left-0 right-0 z-[2] pointer-events-none">
          {/* Far mountains */}
          <svg viewBox="0 0 1440 220" preserveAspectRatio="none" className="w-full" style={{ height: "clamp(100px,22vw,220px)" }}>
            <path d="M0,220 L0,160 L60,110 L120,145 L200,80 L280,120 L360,60 L430,95 L510,45 L580,90 L650,50 L720,88 L790,40 L860,75 L940,30 L1010,65 L1080,28 L1150,60 L1220,38 L1290,70 L1370,50 L1440,80 L1440,220 Z"
              fill="rgba(18,0,50,0.75)" />
            {/* Glow on far mountains */}
            <path d="M0,165 L60,112 L120,147 L200,82 L280,122 L360,62 L430,97 L510,47 L580,92 L650,52 L720,90 L790,42 L860,77 L940,32 L1010,67 L1080,30 L1150,62 L1220,40 L1290,72 L1370,52 L1440,82"
              fill="none" stroke="rgba(100,40,200,0.25)" strokeWidth="1.5" />
          </svg>
          {/* Near mountains */}
          <svg viewBox="0 0 1440 180" preserveAspectRatio="none" className="w-full" style={{ height: "clamp(80px,18vw,180px)", marginTop: "-2px" }}>
            <path d="M0,180 L0,140 L80,100 L150,130 L230,75 L320,115 L400,55 L470,90 L540,40 L620,75 L690,25 L770,65 L840,20 L920,55 L990,15 L1060,50 L1140,20 L1210,55 L1290,25 L1360,60 L1440,35 L1440,180 Z"
              fill="rgba(10,0,30,0.90)" />
            <path d="M0,142 L80,102 L150,132 L230,77 L320,117 L400,57 L470,92 L540,42 L620,77 L690,27 L770,67 L840,22 L920,57 L990,17 L1060,52 L1140,22 L1210,57 L1290,27 L1360,62 L1440,37"
              fill="none" stroke="rgba(120,60,255,0.20)" strokeWidth="1" />
          </svg>
          {/* Foreground floor */}
          <div style={{ height: 32, background: "linear-gradient(to bottom, rgba(6,0,18,0.95), #04000f)", marginTop: "-2px" }} />

          {/* ── Crystal formations ── */}
          <svg viewBox="0 0 1440 160" preserveAspectRatio="none" className="absolute bottom-0 w-full" style={{ height: "clamp(60px,14vw,160px)" }}>
            {/* Left crystal cluster */}
            <g filter="url(#crystalGlow)">
              <polygon points="80,160 95,80 110,160" fill="rgba(0,200,255,0.55)" />
              <polygon points="100,160 118,50 136,160" fill="rgba(20,160,255,0.60)" />
              <polygon points="130,160 143,90 156,160" fill="rgba(0,180,220,0.45)" />
              <polygon points="60,160 72,105 84,160"  fill="rgba(40,140,255,0.40)" />
            </g>
            {/* Center crystal cluster */}
            <g filter="url(#crystalGlow)">
              <polygon points="660,160 678,55 696,160" fill="rgba(160,40,255,0.55)" />
              <polygon points="690,160 710,30 730,160" fill="rgba(120,0,255,0.65)" />
              <polygon points="724,160 739,70 754,160" fill="rgba(180,60,255,0.50)" />
              <polygon points="640,160 654,85 668,160" fill="rgba(100,20,220,0.45)" />
            </g>
            {/* Right crystal cluster */}
            <g filter="url(#crystalGlow)">
              <polygon points="1280,160 1295,75 1310,160" fill="rgba(0,220,200,0.55)" />
              <polygon points="1305,160 1323,45 1341,160" fill="rgba(0,180,255,0.62)" />
              <polygon points="1335,160 1348,88 1361,160" fill="rgba(20,160,220,0.48)" />
              <polygon points="1360,160 1370,110 1380,160" fill="rgba(40,200,255,0.38)" />
            </g>
            <defs>
              <filter id="crystalGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
          </svg>

          {/* Floor glow under crystals */}
          <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ height: 40,
            background: "linear-gradient(to top, rgba(0,120,255,0.08), rgba(100,0,255,0.06), transparent)" }} />
        </div>

        {/* Bottom text-safe gradient */}
        <div className="absolute inset-0 z-[3] pointer-events-none"
          style={{ background: "radial-gradient(ellipse 70% 50% at 50% 45%, rgba(4,0,15,0.55) 0%, rgba(4,0,12,0.25) 55%, transparent 100%)" }} />

        {/* ── Content ── */}
        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center text-center gap-7 sm:gap-9" style={{ paddingBottom: "clamp(80px,20vw,200px)" }}>
          <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}>
            <AvatarOrb />
          </motion.div>

          <div className="space-y-3">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-mono tracking-wider"
              style={{ background: "rgba(100,40,255,0.15)", border: "1px solid rgba(160,100,255,0.35)", color: "#c4a0ff" }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#a060ff", boxShadow: "0 0 8px #a060ff" }} />
              THCS Vĩnh Hòa · 2026
            </motion.div>

            <motion.h1 initial={{ y: 32, opacity: 0, filter: "blur(10px)" }} animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight"
              style={{ color: "#f0e8ff", textShadow: "0 0 60px rgba(160,80,255,0.4), 0 2px 30px rgba(80,0,180,0.3)" }}>
              <GlitchText text="Phan Trọng Khang" />
            </motion.h1>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }}
              className="flex items-center justify-center gap-2 text-lg md:text-2xl"
              style={{ color: "rgba(200,170,255,0.75)" }}>
              <motion.div animate={{ rotate: [0, 12, -12, 0] }} transition={{ duration: 3.5, repeat: Infinity }}>
                <Zap className="w-5 h-5" style={{ color: "#b060ff" }} />
              </motion.div>
              <TypewriterTitle />
            </motion.div>
          </div>

          <motion.p initial={{ y: 20, opacity: 0, filter: "blur(4px)" }} animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.7, delay: 0.45 }}
            className="max-w-xl text-base md:text-lg leading-relaxed"
            style={{ color: "rgba(180,150,255,0.6)" }}>
            Người điều khiển và sản xuất phần mềm bằng AI · Prompt Master · Kiến tạo tương lai từ hôm nay
          </motion.p>

          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, delay: 0.65 }}
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
            <motion.a href="#du-an"
              onClick={(e) => { e.preventDefault(); document.querySelector("#du-an")?.scrollIntoView({ behavior: "smooth" }); }}
              whileHover={{ scale: 1.06, y: -3 }} whileTap={{ scale: 0.97 }}
              className="px-8 py-4 rounded-full font-bold flex items-center justify-center gap-2 text-sm md:text-base text-white"
              style={{
                background: "linear-gradient(135deg, #7020d0, #a040ff, #6020c0)",
                boxShadow: "0 0 40px rgba(140,40,255,0.50), 0 4px 20px rgba(100,20,200,0.40), inset 0 1px 0 rgba(255,255,255,0.15)",
              }}>
              Xem Dự Án
              <motion.span animate={{ x: [0, 5, 0] }} transition={{ duration: 1.4, repeat: Infinity }}>
                <ArrowRight className="w-4 h-4" />
              </motion.span>
            </motion.a>
            <motion.a href="#lien-he"
              onClick={(e) => { e.preventDefault(); document.querySelector("#lien-he")?.scrollIntoView({ behavior: "smooth" }); }}
              whileHover={{ scale: 1.06, y: -3 }} whileTap={{ scale: 0.97 }}
              className="px-8 py-4 rounded-full font-semibold flex items-center justify-center text-sm md:text-base"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(180,120,255,0.30)",
                color: "rgba(210,180,255,0.80)",
                boxShadow: "0 0 20px rgba(120,40,255,0.12), inset 0 1px 0 rgba(255,255,255,0.06)",
              }}>
              Liên Hệ
            </motion.a>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }}
            className="absolute bottom-[clamp(100px,18vw,180px)] left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
            <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
              <ChevronDown className="w-5 h-5" style={{ color: "rgba(180,120,255,0.35)" }} />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="py-16 md:py-20 px-4 sm:px-6 relative"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(60,20,120,0.12) 0%, transparent 70%)" }} />
        <div className="max-w-3xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 relative z-10">
          <StatCounter value="3+"   label="Dự Án Thực Chiến" delay={0}    color="#a78bfa" />
          <StatCounter value="2+"   label="Năm Kinh Nghiệm"  delay={0.1}  color="#38bdf8" />
          <StatCounter value="#1"   label="Giải Tin Học"      delay={0.2}  color="#fbbf24" />
          <StatCounter value="∞"    label="Đam Mê Sáng Tạo"  delay={0.3}  color="#34d399" />
        </div>
      </section>

      {/* ── SKILLS ── */}
      <section id="gioi-thieu" className="py-20 md:py-28 px-4 sm:px-6 relative overflow-hidden">
        <ThreeAbout className="absolute inset-0 z-0 opacity-40" />
        <div className="max-w-5xl mx-auto relative z-10">
          <SectionTitle label="Kỹ Năng" title={<>Vũ Khí Công Nghệ</>} />
          <div className="grid md:grid-cols-2 gap-x-12 gap-y-6">
            {skillsData.map((s, i) => <SkillBar key={s.label} {...s} delay={i * 0.08} />)}
          </div>
        </div>
      </section>

      <SpaceDivider />

      {/* ── ABOUT / TIMELINE ── */}
      <section className="py-20 md:py-28 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 md:gap-16">
          <div>
            <SectionTitle label="Hành Trình" title={<>Từng Bước Tiến Vào Vũ Trụ</>} />
            <div>
              {timelineData.map((item, i) => <TimelineItem key={item.year} item={item} i={i} />)}
            </div>
          </div>
          <div className="space-y-6">
            <SectionTitle label="Giới Thiệu" title={<>Về Tôi</>} />
            {[
              { text: "Xin chào! Tôi là Phan Trọng Khang, một AI Architect và Prompt Master tại THCS Vĩnh Hòa, đang kiến tạo tương lai công nghệ từ hôm nay.", icon: Brain, color: "#a78bfa" },
              { text: "Tôi chuyên xây dựng các hệ thống AI thực chiến — từ chatbot đa mô hình đến IoT thông minh, tất cả đều được tạo ra bằng niềm đam mê và sự sáng tạo không ngừng.", icon: Sparkles, color: "#38bdf8" },
              { text: "Mục tiêu: trở thành kiến trúc sư AI hàng đầu, xây dựng những sản phẩm thay đổi cách con người tương tác với công nghệ.", icon: Zap, color: "#fbbf24" },
            ].map((item, i) => (
              <Reveal key={i} delay={i * 0.12}>
                <div className="flex gap-4 items-start p-5 rounded-2xl"
                  style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center"
                    style={{ background: `${item.color}15`, border: `1px solid ${item.color}30` }}>
                    <item.icon className="w-4 h-4" style={{ color: item.color }} />
                  </div>
                  <p className="text-sm text-white/55 leading-relaxed">{item.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <SpaceDivider />

      {/* ── PROJECTS ── */}
      <section id="du-an" className="py-20 md:py-28 px-4 sm:px-6 relative overflow-hidden">
        <ThreeProjects className="absolute inset-0 z-0 opacity-35" />
        <div className="max-w-5xl mx-auto relative z-10">
          <SectionTitle label="Dự Án" title={<>Những Gì Tôi Xây Dựng</>} />
          <div className="grid md:grid-cols-3 gap-6">
            {projects.map((p, i) => <ProjectCard key={p.id} project={p} i={i} />)}
          </div>
        </div>
      </section>

      <SpaceDivider />

      {/* ── CONTACT ── */}
      <section id="lien-he" className="py-20 md:py-28 px-4 sm:px-6 relative overflow-hidden">
        <ThreeContact className="absolute inset-0 z-0 opacity-50" />
        <div className="max-w-4xl mx-auto relative z-10">
          <SectionTitle label="Liên Hệ" title={<>Kết Nối Với Tôi</>} />
          <Reveal>
            <p className="text-white/50 mb-10 max-w-lg text-sm md:text-base leading-relaxed">
              Bạn có ý tưởng muốn biến thành hiện thực? Hãy liên hệ — tôi luôn sẵn sàng cộng tác và xây dựng điều gì đó phi thường.
            </p>
          </Reveal>
          <div className="grid sm:grid-cols-2 gap-4">
            {contactItems.map((c) => {
              const Icon = c.icon;
              return (
                <Reveal key={c.label} delay={c.delay}>
                  <motion.a href={c.href} target={c.ext ? "_blank" : undefined} rel={c.ext ? "noopener noreferrer" : undefined}
                    whileHover={{ scale: 1.03, y: -3 }} whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-4 p-4 rounded-2xl group"
                    style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", textDecoration: "none" }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
                      style={{ background: `${c.color}15`, border: `1px solid ${c.color}30` }}>
                      <Icon className="w-5 h-5" style={{ color: c.color }} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white/80 group-hover:text-white transition-colors">{c.label}</div>
                      <div className="text-xs text-white/40 truncate">{c.sub}</div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 ml-auto flex-shrink-0 opacity-0 group-hover:opacity-40 transition-opacity" style={{ color: c.color }} />
                  </motion.a>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-8 px-6 text-center" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <p className="text-xs font-mono text-white/25 tracking-widest">
          © 2026 PHAN TRỌNG KHANG · AI ARCHITECT · BUILT WITH PASSION
        </p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <div className="w-1 h-1 rounded-full bg-violet-500/40" />
          <div className="w-1.5 h-1.5 rounded-full bg-violet-500/60 animate-pulse" />
          <div className="w-1 h-1 rounded-full bg-violet-500/40" />
        </div>
      </footer>
    </div>
  );
}
