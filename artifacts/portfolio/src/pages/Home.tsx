import { Navigation } from "@/components/navigation";
import { ThreeScene } from "@/components/ThreeScene";
import {
  motion, useScroll, useTransform,
  useMotionValue, useSpring, AnimatePresence, useInView,
} from "framer-motion";
import {
  ArrowRight, Github, Mail, ExternalLink, Cpu, Network, Zap, Phone,
  Trophy, Sparkles, Leaf, Code2, Wifi, Brain, CloudCog, MessageSquare,
  GraduationCap, Star, ChevronDown,
} from "lucide-react";
import { useRef, useEffect, useState, useCallback } from "react";
import avatarImg from "@assets/IMG_20251219_183126_1775387730987.jpg";

/* ─── cursor glow ─── */
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
      style={{ left: sx, top: sy, background: "radial-gradient(circle, rgba(124,111,255,0.07) 0%, rgba(150,100,255,0.03) 40%, transparent 70%)" }}
    />
  );
}

/* ─── glitch text ─── */
function GlitchText({ text }: { text: string }) {
  const [glitch, setGlitch] = useState(false);
  useEffect(() => {
    const id = setInterval(() => { setGlitch(true); setTimeout(() => setGlitch(false), 220); }, 6000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="relative inline-block">
      {text}
      <AnimatePresence>
        {glitch && (
          <>
            <motion.span className="absolute inset-0 text-violet-400/50" initial={{ x: 0, opacity: 0 }} animate={{ x: [-4, 4, -2, 0], opacity: [0, 0.85, 0.4, 0] }} transition={{ duration: 0.22 }} style={{ clipPath: "inset(15% 0 55% 0)" }}>{text}</motion.span>
            <motion.span className="absolute inset-0 text-cyan-400/40" initial={{ x: 0, opacity: 0 }} animate={{ x: [4, -4, 2, 0], opacity: [0, 0.65, 0.3, 0] }} transition={{ duration: 0.22 }} style={{ clipPath: "inset(55% 0 15% 0)" }}>{text}</motion.span>
          </>
        )}
      </AnimatePresence>
    </span>
  );
}

/* ─── typewriter ─── */
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
        className="inline-block w-[2px] h-5 md:h-6 bg-violet-500 ml-0.5 align-middle" />
    </span>
  );
}

/* ─── avatar orb ─── */
function AvatarOrb() {
  return (
    <div className="relative flex items-center justify-center select-none">
      {[160, 128, 108].map((sz, i) => (
        <motion.div key={sz} className="absolute rounded-full border border-foreground/10"
          style={{ width: sz, height: sz }}
          animate={{ scale: [1, 1 + 0.04 * (i + 1), 1], opacity: [0.25 + i * 0.08, 0.55 - i * 0.05, 0.25 + i * 0.08] }}
          transition={{ duration: 3 + i, repeat: Infinity, ease: "easeInOut", delay: i * 0.6 }} />
      ))}
      <motion.div className="absolute w-44 h-44 rounded-full"
        style={{ border: "1px solid rgba(130,100,255,0.3)" }}
        animate={{ rotate: 360 }} transition={{ duration: 22, repeat: Infinity, ease: "linear" }}>
        {[0, 90, 180, 270].map((deg) => (
          <div key={deg} className="absolute w-1.5 h-1.5 rounded-full bg-violet-400/60"
            style={{ top: "50%", left: "50%", transform: `rotate(${deg}deg) translateX(86px) translateY(-50%)` }} />
        ))}
      </motion.div>
      <motion.div className="absolute w-36 h-36 rounded-full"
        style={{ border: "1px dashed rgba(100,180,255,0.18)" }}
        animate={{ rotate: -360 }} transition={{ duration: 35, repeat: Infinity, ease: "linear" }} />
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        whileHover={{ scale: 1.05 }}
        className="relative z-10 w-28 h-28 rounded-full overflow-hidden shadow-2xl"
        style={{ border: "2px solid rgba(130,100,255,0.45)" }}>
        <img src={avatarImg} alt="Phan Trọng Khang" className="w-full h-full object-cover" />
      </motion.div>
    </div>
  );
}

/* ─── section label + heading ─── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-mono tracking-[0.25em] uppercase text-muted-foreground mb-3 flex items-center gap-2">
      <span className="inline-block w-4 h-px bg-violet-500/60" />{children}
    </p>
  );
}
function SectionHeading({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  return (
    <div ref={ref}>
      <motion.h2 initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-foreground">
        {children}
      </motion.h2>
      <motion.div initial={{ scaleX: 0 }} animate={inView ? { scaleX: 1 } : {}}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="w-14 h-0.5 rounded-full origin-left"
        style={{ background: "linear-gradient(90deg,#7c6fff,#a78bfa)" }} />
    </div>
  );
}

/* ─── skill bars ─── */
const skillsData = [
  { label: "Prompt Engineering", pct: 95, icon: Brain,       color: "#a78bfa" },
  { label: "Trí Tuệ Nhân Tạo",   pct: 88, icon: Sparkles,   color: "#818cf8" },
  { label: "IoT / ESP32",         pct: 80, icon: Wifi,       color: "#38bdf8" },
  { label: "Python",              pct: 75, icon: Code2,      color: "#34d399" },
  { label: "Chatbot AI",          pct: 82, icon: MessageSquare, color: "#fb923c" },
  { label: "Lưu Trữ Đám Mây",    pct: 70, icon: CloudCog,   color: "#f472b6" },
];
function SkillBar({ label, pct, icon: Icon, color, delay }: { label: string; pct: number; icon: React.ElementType; color: string; delay: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, x: -20 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.6, delay }} className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" style={{ color }} />
          <span className="text-sm font-medium text-foreground/80">{label}</span>
        </div>
        <motion.span className="text-xs font-mono" style={{ color }} initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: delay + 0.4 }}>{pct}%</motion.span>
      </div>
      <div className="h-1.5 rounded-full bg-foreground/[6%] overflow-hidden">
        <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg,${color}80,${color})` }}
          initial={{ width: 0 }} animate={inView ? { width: `${pct}%` } : {}}
          transition={{ duration: 1.1, delay: delay + 0.2, ease: [0.16, 1, 0.3, 1] }} />
      </div>
    </motion.div>
  );
}

/* ─── timeline ─── */
const timelineData = [
  { year: "2025", title: "AI Architect & Full-Stack Builder", desc: "Phát triển NexoraGarden, Nexorax, NexoraNode — sản phẩm AI thực chiến từ ý tưởng đến triển khai.", icon: Brain,           color: "#a78bfa" },
  { year: "2024", title: "Giải Nhất Tin Học Cấp Trường",    desc: "Đạt giải cao nhất cuộc thi tin học tại THCS Vĩnh Hòa. Bước đà quan trọng vào thế giới lập trình.",           icon: Trophy,          color: "#fbbf24" },
  { year: "2023", title: "Khám Phá IoT & Python",           desc: "Bắt đầu nghiên cứu ESP32, cảm biến môi trường và tự học Python để xây dựng các dự án thực tế.",               icon: Wifi,            color: "#38bdf8" },
  { year: "2022", title: "Khởi Đầu Hành Trình Công Nghệ",  desc: "Lần đầu tiếp xúc với lập trình và nhận ra đam mê với việc tạo ra phần mềm từ ý tưởng.",                        icon: GraduationCap,   color: "#34d399" },
];
function TimelineItem({ item, i }: { item: (typeof timelineData)[0]; i: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const Icon = item.icon;
  return (
    <motion.div ref={ref} initial={{ opacity: 0, x: i % 2 === 0 ? -40 : 40 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="flex gap-4 md:gap-6 items-start">
      <div className="flex flex-col items-center flex-shrink-0">
        <motion.div className="w-10 h-10 rounded-full flex items-center justify-center z-10"
          style={{ background: `${item.color}18`, border: `1px solid ${item.color}40` }}
          whileHover={{ scale: 1.15 }} transition={{ type: "spring", stiffness: 300 }}>
          <Icon className="w-4 h-4" style={{ color: item.color }} />
        </motion.div>
        {i < timelineData.length - 1 && (
          <motion.div className="w-px flex-1 min-h-[40px] mt-2"
            style={{ background: `linear-gradient(180deg,${item.color}30,transparent)` }}
            initial={{ scaleY: 0 }} animate={inView ? { scaleY: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.3 }} />
        )}
      </div>
      <div className="pb-8">
        <span className="text-xs font-mono tracking-widest mb-1 block" style={{ color: item.color }}>{item.year}</span>
        <h3 className="text-base md:text-lg font-bold text-foreground/90 mb-1">{item.title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
      </div>
    </motion.div>
  );
}

/* ─── project card ─── */
const projects = [
  { id:"1", title:"NexoraGarden", desc:"Hệ thống nông nghiệp thông minh — ESP32, cảm biến môi trường, giao tiếp thời gian thực tối ưu hóa chăm sóc cây trồng tự động.", tag:"IoT · AI",     icon:Leaf,    href:"https://github.com/khang26042012", tech:["ESP32","Python","MQTT","AI"],              status:"Active", color:"#34d399" },
  { id:"2", title:"NexoraNode",   desc:"Nền tảng lưu trữ và quản lý mã nguồn đa năng — tổ chức, chia sẻ code thông minh với giao diện tối giản.",                            tag:"Cloud · Dev", icon:Network, href:"https://github.com/khang26042012", tech:["Node.js","Cloud","API","Storage"],        status:"Beta",   color:"#818cf8" },
  { id:"3", title:"Nexorax",      desc:"Chatbot AI đa mô hình — tích hợp GPT, Gemini, Claude để cung cấp trải nghiệm hội thoại thông minh nhất.",                             tag:"AI · Chatbot", icon:Cpu,   href:"https://github.com/khang26042012", tech:["GPT-4","Gemini","Claude","Python"],       status:"Live",   color:"#a78bfa" },
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
    rotX.set(((e.clientY - r.top - r.height / 2) / (r.height / 2)) * -7);
    rotY.set(((e.clientX - r.left - r.width  / 2) / (r.width  / 2)) * 7);
  }, [rotX, rotY]);
  const onLeave = useCallback(() => { rotX.set(0); rotY.set(0); setHovered(false); }, [rotX, rotY]);
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.65, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
      style={{ rotateX: sRotX, rotateY: sRotY, perspective: 900, border: `1px solid ${hovered ? project.color + "35" : "color-mix(in srgb, hsl(var(--foreground)) 8%, transparent)"}`, transition: "border-color 0.3s" }}
      ref={cardRef} onMouseMove={onMove} onMouseEnter={() => setHovered(true)} onMouseLeave={onLeave}
      className="relative rounded-2xl overflow-hidden cursor-pointer bg-foreground/[3%]">
      <motion.div className="absolute inset-0" animate={{ opacity: hovered ? 1 : 0 }} transition={{ duration: 0.3 }}
        style={{ background: `radial-gradient(ellipse at top left,${project.color}0a,transparent 70%)` }} />
      <div className="p-6 relative z-10">
        <div className="flex items-start justify-between mb-5">
          <motion.div animate={hovered ? { scale: 1.12, rotate: 8 } : { scale: 1, rotate: 0 }}
            transition={{ duration: 0.35, ease: "backOut" }}
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: `${project.color}18`, border: `1px solid ${project.color}30` }}>
            <Icon className="w-5 h-5" style={{ color: project.color }} />
          </motion.div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: project.status === "Live" ? "#34d399" : project.status === "Active" ? "#34d399" : "#fbbf24" }} />
            <span className="text-xs font-mono text-muted-foreground">{project.status}</span>
          </div>
        </div>
        <motion.h3 animate={hovered ? { x: 4 } : { x: 0 }} transition={{ duration: 0.25 }}
          className="text-xl font-bold text-foreground/90 mb-2">{project.title}</motion.h3>
        <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{project.desc}</p>
        <div className="flex flex-wrap gap-1.5 mb-5">
          {project.tech.map((t) => (
            <span key={t} className="px-2 py-0.5 text-xs rounded font-mono"
              style={{ background: `${project.color}12`, color: `${project.color}cc`, border: `1px solid ${project.color}20` }}>{t}</span>
          ))}
        </div>
        <motion.a href={project.href} target="_blank" rel="noopener noreferrer"
          animate={{ opacity: hovered ? 1 : 0.4, x: hovered ? 0 : -6 }} transition={{ duration: 0.25 }}
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

/* ─── stat counter ─── */
function StatCounter({ value, label, delay, color }: { value: string; label: string; delay: number; color: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }} className="text-center">
      <motion.div className="text-4xl md:text-5xl font-bold font-mono mb-1 tabular-nums" style={{ color }}
        initial={{ scale: 0.5, opacity: 0 }} animate={inView ? { scale: 1, opacity: 1 } : {}}
        transition={{ duration: 0.5, delay: delay + 0.1, type: "spring", stiffness: 200 }}>{value}</motion.div>
      <div className="text-xs text-muted-foreground font-mono tracking-wider uppercase">{label}</div>
    </motion.div>
  );
}

/* ─── contact ─── */
const contactItems = [
  { href:"mailto:trongkhabgphan@gmail.com", icon:Mail, label:"Email", sub:"trongkhabgphan@gmail.com", ext:false, delay:0,    color:"#818cf8" },
  { href:"https://www.facebook.com/share/1CX6on9uGs/", icon:(p:React.SVGProps<SVGSVGElement>)=><svg viewBox="0 0 24 24" fill="currentColor"{...p}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>, label:"Facebook", sub:"Phan Trọng Khang", ext:true, delay:0.07, color:"#60a5fa" },
  { href:"https://t.me/+84352234521", icon:(p:React.SVGProps<SVGSVGElement>)=><svg viewBox="0 0 24 24" fill="currentColor"{...p}><path d="M21.198 2.433a2.242 2.242 0 0 0-1.022.215l-16.5 6.676a2.25 2.25 0 0 0 .126 4.238l3.813 1.205 1.837 5.494a.75.75 0 0 0 1.264.281l2.353-2.317 4.223 3.126a2.25 2.25 0 0 0 3.516-1.411l2.624-15.376a2.25 2.25 0 0 0-2.234-2.131zm-1.8 3.07-1.943 11.378-4.101-3.035a.75.75 0 0 0-.932.066l-1.4 1.379-.436-1.305 6.885-7.396a.75.75 0 0 0-.968-1.148L8.118 13.95l-2.92-.923 14.2-5.75.007 1.225z"/></svg>, label:"Telegram", sub:"+84 352 234 521", ext:true, delay:0.14, color:"#38bdf8" },
  { href:"https://github.com/khang26042012", icon:Github, label:"GitHub", sub:"@khang26042012", ext:true, delay:0.21, color:"#a78bfa" },
  { href:"tel:0352234521", icon:Phone, label:"Điện Thoại", sub:"0352 234 521", ext:false, delay:0.28, color:"#34d399" },
];

/* ═══════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════ */
export function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end end"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroY       = useTransform(scrollYProgress, [0, 0.15], [0, 80]);
  const heroScale   = useTransform(scrollYProgress, [0, 0.15], [1, 0.95]);

  return (
    <div ref={containerRef} className="min-h-screen bg-background selection:bg-violet-500/30">
      <CursorGlow />
      <Navigation />

      {/* ── HERO ── */}
      <section id="trang-chu" className="relative min-h-screen flex items-center justify-center pt-20 px-4 sm:px-6 overflow-hidden">
        {/* Three.js (dark only — component returns null in light mode) */}
        <ThreeScene className="absolute inset-0 z-0" />

        {/* light-mode hero gradient */}
        <div className="absolute inset-0 z-0 dark:hidden"
          style={{ background: "radial-gradient(ellipse 70% 55% at 50% 40%, rgba(124,111,255,0.08) 0%, rgba(100,180,255,0.05) 50%, transparent 80%)" }} />

        {/* dark-mode ambient glow */}
        <motion.div className="absolute inset-0 pointer-events-none z-0 hidden dark:block"
          animate={{ opacity: [0.4, 0.7, 0.4] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          style={{ background: "radial-gradient(ellipse 55% 45% at 50% 50%, rgba(100,80,255,0.07) 0%, transparent 70%)" }} />

        <motion.div style={{ opacity: heroOpacity, y: heroY, scale: heroScale }}
          className="relative z-10 max-w-4xl mx-auto flex flex-col items-center text-center gap-7 sm:gap-9">

          <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}>
            <AvatarOrb />
          </motion.div>

          <div className="space-y-3">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-mono tracking-wider"
              style={{ background: "rgba(124,111,255,0.1)", border: "1px solid rgba(124,111,255,0.25)", color: "#a78bfa" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              THCS Vĩnh Hòa · 2025
            </motion.div>

            <motion.h1 initial={{ y: 32, opacity: 0, filter: "blur(10px)" }} animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight text-foreground">
              <GlitchText text="Phan Trọng Khang" />
            </motion.h1>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }}
              className="flex items-center justify-center gap-2 text-lg md:text-2xl text-muted-foreground">
              <motion.div animate={{ rotate: [0, 12, -12, 0] }} transition={{ duration: 3.5, repeat: Infinity }}>
                <Zap className="w-5 h-5 text-violet-500" />
              </motion.div>
              <TypewriterTitle />
            </motion.div>
          </div>

          <motion.p initial={{ y: 20, opacity: 0, filter: "blur(4px)" }} animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.7, delay: 0.45 }}
            className="max-w-xl text-base md:text-lg text-muted-foreground leading-relaxed">
            Người điều khiển và sản xuất phần mềm bằng AI · Prompt Master · Kiến tạo tương lai từ hôm nay
          </motion.p>

          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, delay: 0.65 }}
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
            <motion.a href="#du-an" onClick={(e) => { e.preventDefault(); document.querySelector("#du-an")?.scrollIntoView({ behavior: "smooth" }); }}
              whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.97 }}
              className="px-8 py-4 rounded-full font-semibold flex items-center justify-center gap-2 text-sm md:text-base text-white"
              style={{ background: "linear-gradient(135deg,#7c6fff,#a78bfa)", boxShadow: "0 0 30px rgba(124,111,255,0.3)" }}>
              Xem Dự Án
              <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                <ArrowRight className="w-4 h-4" />
              </motion.span>
            </motion.a>
            <motion.a href="#lien-he" onClick={(e) => { e.preventDefault(); document.querySelector("#lien-he")?.scrollIntoView({ behavior: "smooth" }); }}
              whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.97 }}
              className="px-8 py-4 rounded-full font-semibold flex items-center justify-center text-sm md:text-base text-foreground/70 bg-foreground/5 border border-foreground/10">
              Liên Hệ
            </motion.a>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}>
              <ChevronDown className="w-5 h-5 text-foreground/25" />
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── STATS ── */}
      <section className="py-16 md:py-20 px-4 sm:px-6 relative border-y border-border">
        <div className="absolute inset-0 pointer-events-none dark:block hidden"
          style={{ background: "linear-gradient(180deg,transparent,rgba(100,80,255,0.03) 50%,transparent)" }} />
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-3 gap-6 md:gap-12">
            <StatCounter value="3+" label="Dự Án AI"     delay={0}    color="#a78bfa" />
            <StatCounter value="2+" label="Năm Học Tập"  delay={0.12} color="#60a5fa" />
            <StatCounter value="10+" label="Công Nghệ"   delay={0.24} color="#34d399" />
          </div>
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section id="gioi-thieu" className="py-24 md:py-32 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="mb-14 md:mb-20">
            <SectionLabel>Về tôi</SectionLabel>
            <SectionHeading>Giới Thiệu</SectionHeading>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-start">
            <div className="space-y-5">
              {[
                "Tôi là một người đam mê công nghệ, đặc biệt quan tâm đến lĩnh vực IoT và trí tuệ nhân tạo. Hiện tại, tôi đang phát triển NexoraGarden — hệ thống nông nghiệp thông minh sử dụng ESP32, cảm biến môi trường và nền tảng AI thời gian thực.",
                "Tôi có xu hướng tự học, thích khám phá và xây dựng các hệ thống từ đầu. Trong quá trình làm việc, tôi tập trung vào giải quyết vấn đề thực tế và tối ưu hóa trải nghiệm người dùng.",
                "Mục tiêu của tôi là phát triển các giải pháp AI có tính ứng dụng cao — đặc biệt trong nông nghiệp thông minh và tự động hóa phần mềm.",
              ].map((txt, i) => (
                <motion.p key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.1 }} className="text-muted-foreground leading-relaxed text-sm md:text-base">{txt}</motion.p>
              ))}

              {[
                { icon: Trophy, color: "#fbbf24", bg: "rgba(251,191,36,0.07)", border: "rgba(251,191,36,0.2)", title: "Giải Nhất — Tin Học Cấp Trường", sub: "THCS Vĩnh Hòa", delay: 0.35 },
                { icon: Sparkles, color: "#a78bfa", bg: "rgba(167,139,250,0.07)", border: "rgba(167,139,250,0.2)", title: "Prompt Master", sub: "Điều khiển & sản xuất phần mềm bằng AI", delay: 0.45 },
              ].map(({ icon: Ic, color, bg, border, title, sub, delay }) => (
                <motion.div key={title} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }} transition={{ duration: 0.5, delay }} whileHover={{ scale: 1.02 }}
                  className="mt-4 p-4 rounded-xl flex items-center gap-3"
                  style={{ background: bg, border: `1px solid ${border}` }}>
                  <motion.div animate={{ rotate: [0, 12, -12, 0] }} transition={{ duration: 4, repeat: Infinity }}>
                    <Ic className="w-5 h-5" style={{ color }} />
                  </motion.div>
                  <div>
                    <p className="font-semibold text-sm text-foreground/85">{title}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{sub}</p>
                  </div>
                  {title.includes("Giải") && <Star className="w-4 h-4 ml-auto" style={{ color }} />}
                </motion.div>
              ))}
            </div>

            <div className="space-y-6">
              <p className="text-xs font-mono text-muted-foreground tracking-wider uppercase mb-6">Kỹ năng & Công nghệ</p>
              {skillsData.map((sk, i) => <SkillBar key={sk.label} {...sk} delay={i * 0.08} />)}
            </div>
          </div>
        </div>
      </section>

      {/* ── TIMELINE ── */}
      <section className="py-24 md:py-32 px-4 sm:px-6 relative border-t border-border">
        <div className="absolute inset-0 pointer-events-none dark:block hidden"
          style={{ background: "radial-gradient(ellipse 60% 50% at 50% 30%, rgba(80,60,255,0.04) 0%, transparent 70%)" }} />
        <div className="max-w-3xl mx-auto relative z-10">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="mb-14 md:mb-20">
            <SectionLabel>Hành trình</SectionLabel>
            <SectionHeading>Lịch Sử</SectionHeading>
          </motion.div>
          {timelineData.map((item, i) => <TimelineItem key={item.year} item={item} i={i} />)}
        </div>
      </section>

      {/* ── PROJECTS ── */}
      <section id="du-an" className="py-24 md:py-32 px-4 sm:px-6 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="mb-14 md:mb-20">
            <SectionLabel>Công trình</SectionLabel>
            <SectionHeading>Dự Án</SectionHeading>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {projects.map((p, i) => <ProjectCard key={p.id} project={p} i={i} />)}
          </div>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }} className="mt-10 text-center">
            <a href="https://github.com/khang26042012" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-mono">
              <Github className="w-4 h-4" /> Xem thêm trên GitHub
            </a>
          </motion.div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section id="lien-he" className="py-24 md:py-32 px-4 sm:px-6 relative overflow-hidden border-t border-border">
        <motion.div className="absolute -right-60 top-0 w-[500px] h-[500px] rounded-full pointer-events-none dark:block hidden"
          style={{ background: "radial-gradient(circle,rgba(100,80,255,0.06) 0%,transparent 70%)" }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }} transition={{ duration: 8, repeat: Infinity }} />
        <div className="max-w-4xl mx-auto relative z-10">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="mb-14 md:mb-20">
            <SectionLabel>Kết nối</SectionLabel>
            <SectionHeading>Liên Hệ</SectionHeading>
          </motion.div>
          <div className="grid sm:grid-cols-2 gap-3 md:gap-4">
            {contactItems.map((item) => (
              <motion.a key={item.label} href={item.href} target={item.ext ? "_blank" : undefined}
                rel={item.ext ? "noopener noreferrer" : undefined}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ duration: 0.5, delay: item.delay, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -4, scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="p-4 md:p-5 rounded-2xl flex items-center gap-4 group transition-all duration-200"
                style={{ background: `${item.color}08`, border: `1px solid ${item.color}18` }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = `${item.color}38`; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = `${item.color}18`; }}>
                <motion.div whileHover={{ rotate: 15, scale: 1.12 }} transition={{ duration: 0.3 }}
                  className="w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: `${item.color}15`, border: `1px solid ${item.color}25` }}>
                  <item.icon className="w-4 h-4 md:w-5 md:h-5" style={{ color: item.color }} />
                </motion.div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-foreground/85">{item.label}</h3>
                  <p className="text-xs truncate mt-0.5" style={{ color: `${item.color}90` }}>{item.sub}</p>
                </div>
                <motion.div className="ml-auto flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="w-4 h-4" style={{ color: item.color }} />
                </motion.div>
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-10 md:py-12 text-center px-4 border-t border-border">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="space-y-2">
          <motion.p animate={{ opacity: [0.35, 0.65, 0.35] }} transition={{ duration: 5, repeat: Infinity }}
            className="text-xs font-mono text-muted-foreground tracking-[0.25em] uppercase">
            THCS Vĩnh Hòa &nbsp;·&nbsp; Kiến Tạo Tương Lai &nbsp;·&nbsp; 2025
          </motion.p>
          <p className="text-xs text-muted-foreground/50 font-mono">Built with React · Three.js · Framer Motion</p>
        </motion.div>
      </footer>
    </div>
  );
}
