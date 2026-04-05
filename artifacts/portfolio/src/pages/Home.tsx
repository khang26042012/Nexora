import { Navigation } from "@/components/navigation";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  AnimatePresence,
} from "framer-motion";
import {
  ArrowRight,
  Github,
  Mail,
  BrainCircuit,
  ExternalLink,
  Cpu,
  Network,
  Zap,
  Phone,
  Trophy,
  Sparkles,
  Leaf,
} from "lucide-react";
import { Link } from "wouter";
import { useRef, useEffect, useState, useCallback } from "react";
import avatarImg from "@assets/IMG_20251219_183126_1775387730987.jpg";

const PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 2 + 1,
  duration: Math.random() * 10 + 12,
  delay: Math.random() * 6,
}));

const GRID_LINES = Array.from({ length: 8 }, (_, i) => i);

function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {PARTICLES.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-black/20 dark:bg-white/20"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
          animate={{ y: [0, -40, 0], x: [0, Math.random() * 20 - 10, 0], opacity: [0, 0.6, 0], scale: [0.5, 1.2, 0.5] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.04] dark:opacity-[0.06]">
      {GRID_LINES.map((i) => (
        <motion.div
          key={`h-${i}`}
          className="absolute left-0 right-0 h-px bg-black dark:bg-white"
          style={{ top: `${(i + 1) * (100 / (GRID_LINES.length + 1))}%` }}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 1.2, delay: i * 0.1, ease: "easeOut" }}
        />
      ))}
      {GRID_LINES.map((i) => (
        <motion.div
          key={`v-${i}`}
          className="absolute top-0 bottom-0 w-px bg-black dark:bg-white"
          style={{ left: `${(i + 1) * (100 / (GRID_LINES.length + 1))}%` }}
          initial={{ scaleY: 0, opacity: 0 }}
          animate={{ scaleY: 1, opacity: 1 }}
          transition={{ duration: 1.2, delay: i * 0.1 + 0.05, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

function CursorGlow() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 60, damping: 20 });
  const springY = useSpring(y, { stiffness: 60, damping: 20 });
  useEffect(() => {
    const move = (e: MouseEvent) => { x.set(e.clientX - 200); y.set(e.clientY - 200); };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, [x, y]);
  return (
    <motion.div
      className="pointer-events-none fixed z-0 w-[400px] h-[400px] rounded-full opacity-[0.06] dark:opacity-[0.08]"
      style={{ left: springX, top: springY, background: "radial-gradient(circle, rgba(255,255,255,1) 0%, transparent 70%)" }}
    />
  );
}

function AvatarOrb() {
  return (
    <div className="relative flex items-center justify-center">
      <motion.div
        className="absolute w-44 h-44 rounded-full border border-black/10 dark:border-white/10"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      >
        {[0, 90, 180, 270].map((deg) => (
          <div
            key={deg}
            className="absolute w-2 h-2 rounded-full bg-black/30 dark:bg-white/30"
            style={{ top: "50%", left: "50%", transform: `rotate(${deg}deg) translateX(86px) translateY(-50%)` }}
          />
        ))}
      </motion.div>
      <motion.div
        className="absolute w-36 h-36 rounded-full border border-black/15 dark:border-white/15"
        animate={{ scale: [1, 1.06, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute w-32 h-32 rounded-full bg-black/5 dark:bg-white/10"
        animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        whileHover={{ scale: 1.04 }}
        className="relative z-10 w-28 h-28 rounded-full overflow-hidden border-2 border-black/20 dark:border-white/20 shadow-2xl"
      >
        <img src={avatarImg} alt="Phan Trọng Khang" className="w-full h-full object-cover" />
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0"
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      </motion.div>
    </div>
  );
}

function GlitchText({ text }: { text: string }) {
  const [glitch, setGlitch] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => { setGlitch(true); setTimeout(() => setGlitch(false), 200); }, 5000);
    return () => clearInterval(interval);
  }, []);
  return (
    <span className="relative inline-block">
      {text}
      <AnimatePresence>
        {glitch && (
          <>
            <motion.span className="absolute inset-0 text-black/30 dark:text-white/30" initial={{ x: 0, opacity: 0 }} animate={{ x: [-3, 3, -1, 0], opacity: [0, 0.8, 0.4, 0] }} transition={{ duration: 0.2 }} style={{ clipPath: "inset(20% 0 60% 0)" }}>{text}</motion.span>
            <motion.span className="absolute inset-0 text-black/20 dark:text-white/20" initial={{ x: 0, opacity: 0 }} animate={{ x: [3, -3, 1, 0], opacity: [0, 0.6, 0.3, 0] }} transition={{ duration: 0.2 }} style={{ clipPath: "inset(60% 0 20% 0)" }}>{text}</motion.span>
          </>
        )}
      </AnimatePresence>
    </span>
  );
}

function TypewriterTitle() {
  const [displayed, setDisplayed] = useState("");
  const full = "AI Architect";
  const [done, setDone] = useState(false);
  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      if (i < full.length) { setDisplayed(full.slice(0, i + 1)); i++; }
      else { setDone(true); clearInterval(timer); }
    }, 80);
    return () => clearInterval(timer);
  }, []);
  return (
    <span>
      {displayed}
      {!done && (
        <motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.5, repeat: Infinity }} className="inline-block w-0.5 h-6 bg-current ml-0.5 align-middle" />
      )}
    </span>
  );
}

function ProjectCard({ project, i }: { project: { id: string; title: string; desc: string; tag: string; icon: React.ElementType; href: string }; i: number }) {
  const Icon = project.icon;
  const [hovered, setHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springRotX = useSpring(rotateX, { stiffness: 150, damping: 20 });
  const springRotY = useSpring(rotateY, { stiffness: 150, damping: 20 });
  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    rotateX.set(((e.clientY - cy) / (rect.height / 2)) * -8);
    rotateY.set(((e.clientX - cx) / (rect.width / 2)) * 8);
  }, [rotateX, rotateY]);
  const onMouseLeave = useCallback(() => { rotateX.set(0); rotateY.set(0); setHovered(false); }, [rotateX, rotateY]);

  return (
    <motion.div
      key={project.id}
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }}
      style={{ rotateX: springRotX, rotateY: springRotY, perspective: 800 }}
      ref={cardRef}
      onMouseMove={onMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={onMouseLeave}
      className="group glass-card rounded-2xl p-6 relative overflow-hidden cursor-pointer"
    >
      <motion.div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" animate={{ opacity: hovered ? 1 : 0 }} transition={{ duration: 0.3 }} />
      <motion.div className="absolute inset-0 rounded-2xl border border-black/20 dark:border-white/20" animate={{ opacity: hovered ? 1 : 0.3 }} transition={{ duration: 0.3 }} />

      <div className="absolute top-6 right-6 z-10">
        <motion.span animate={hovered ? { scale: 1.05 } : { scale: 1 }} transition={{ duration: 0.2 }} className="px-3 py-1 text-xs font-mono rounded-full border border-black/20 dark:border-white/20 bg-black/5 dark:bg-white/5">
          {project.tag}
        </motion.span>
      </div>

      <motion.div
        animate={hovered ? { scale: 1.1, rotate: 10 } : { scale: 1, rotate: 0 }}
        transition={{ duration: 0.4, ease: "backOut" }}
        className="w-12 h-12 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center mb-6 z-10 relative"
      >
        <Icon className="w-6 h-6 opacity-60" />
      </motion.div>

      <motion.h3 animate={hovered ? { x: 6 } : { x: 0 }} transition={{ duration: 0.3 }} className="text-xl font-bold mb-2 z-10 relative">
        {project.title}
      </motion.h3>
      <p className="text-black/60 dark:text-white/60 text-sm mb-10 z-10 relative">{project.desc}</p>

      <motion.div animate={{ opacity: hovered ? 1 : 0.4, x: hovered ? 0 : -8 }} transition={{ duration: 0.3 }} className="absolute bottom-6 left-6 z-10">
        <a href={project.href} target="_blank" rel="noopener noreferrer" className="text-sm font-medium flex items-center gap-2">
          Xem dự án <ExternalLink className="w-4 h-4" />
        </a>
      </motion.div>
    </motion.div>
  );
}

const statsData = [
  { label: "Dự Án AI", value: "3+" },
  { label: "Năm Học Tập", value: "2+" },
  { label: "Công Nghệ", value: "10+" },
];

function AnimatedStat({ value, label, delay }: { value: string; label: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      className="text-center"
    >
      <motion.div className="text-4xl md:text-5xl font-bold font-mono mb-1" initial={{ scale: 0.5 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: delay + 0.1, type: "spring", stiffness: 200 }}>
        {value}
      </motion.div>
      <div className="text-sm text-black/50 dark:text-white/50 font-mono">{label}</div>
    </motion.div>
  );
}

const skills = [
  "Trí Tuệ Nhân Tạo",
  "IoT / ESP32",
  "Prompt Engineering",
  "Python",
  "Nông Nghiệp Thông Minh",
  "Chatbot AI",
  "Lưu Trữ Đám Mây",
  "Phát Triển Phần Mềm",
];

const contactItems = [
  { href: "mailto:trongkhabgphan@gmail.com", icon: Mail, label: "Email", sub: "trongkhabgphan@gmail.com", external: false, delay: 0 },
  { href: "https://www.facebook.com/share/1CX6on9uGs/", icon: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
  ), label: "Facebook", sub: "Phan Trọng Khang", external: true, delay: 0.08 },
  { href: "https://t.me/+84352234521", icon: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M21.198 2.433a2.242 2.242 0 0 0-1.022.215l-16.5 6.676a2.25 2.25 0 0 0 .126 4.238l3.813 1.205 1.837 5.494a.75.75 0 0 0 1.264.281l2.353-2.317 4.223 3.126a2.25 2.25 0 0 0 3.516-1.411l2.624-15.376a2.25 2.25 0 0 0-2.234-2.131zm-1.8 3.07-1.943 11.378-4.101-3.035a.75.75 0 0 0-.932.066l-1.4 1.379-.436-1.305 6.885-7.396a.75.75 0 0 0-.968-1.148L8.118 13.95l-2.92-.923 14.2-5.75.007 1.225z"/></svg>
  ), label: "Telegram", sub: "+84 352 234 521", external: true, delay: 0.16 },
  { href: "https://github.com/khang26042012", icon: Github, label: "GitHub", sub: "@khang26042012", external: true, delay: 0.24 },
  { href: "tel:0352234521", icon: Phone, label: "Điện Thoại", sub: "0352 234 521", external: false, delay: 0.32 },
];

export function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end end"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.18], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.18], [0, 80]);
  const heroScale = useTransform(scrollYProgress, [0, 0.18], [1, 0.96]);

  const projects = [
    { id: "1", title: "NexoraGarden", desc: "Hệ thống trồng cây Công Nghệ Cao — sử dụng ESP32, cảm biến môi trường và giao tiếp thời gian thực để tối ưu hóa chăm sóc cây trồng.", tag: "IoT · AI", icon: Leaf, href: "https://github.com/khang26042012" },
    { id: "2", title: "NexoraNode", desc: "Hệ thống lưu trữ code đa năng — tổ chức, quản lý và chia sẻ mã nguồn một cách thông minh và hiệu quả.", tag: "Cloud · Dev", icon: Network, href: "https://github.com/khang26042012" },
    { id: "3", title: "Nexorax", desc: "Chatbot AI đa mô hình — tích hợp nhiều mô hình ngôn ngữ lớn để cung cấp trải nghiệm hội thoại thông minh nhất.", tag: "AI · Chatbot", icon: Cpu, href: "https://github.com/khang26042012" },
  ];

  return (
    <div ref={containerRef} className="min-h-screen noise-bg selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
      <CursorGlow />
      <Navigation />

      {/* ── HERO ── */}
      <section id="trang-chu" className="relative min-h-screen flex items-center justify-center pt-20 px-6 overflow-hidden">
        <GridBackground />
        <FloatingParticles />
        <motion.div className="absolute inset-0 pointer-events-none" animate={{ opacity: [0.5, 0.9, 0.5] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} style={{ background: "radial-gradient(ellipse 60% 40% at 50% 40%, rgba(0,0,0,0.04) 0%, transparent 70%)" }} />

        <motion.div style={{ opacity: heroOpacity, y: heroY, scale: heroScale }} className="relative z-10 max-w-4xl mx-auto flex flex-col items-center text-center gap-8">
          <motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
            <AvatarOrb />
          </motion.div>

          <div className="space-y-3">
            <motion.h1 initial={{ y: 30, opacity: 0, filter: "blur(8px)" }} animate={{ y: 0, opacity: 1, filter: "blur(0px)" }} transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }} className="text-5xl md:text-7xl font-bold tracking-tight">
              <GlitchText text="Phan Trọng Khang" />
            </motion.h1>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.55 }} className="flex items-center justify-center gap-3 text-xl md:text-2xl font-mono text-black/55 dark:text-white/55">
              <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
                <Zap className="w-5 h-5" />
              </motion.div>
              <TypewriterTitle />
            </motion.div>
          </div>

          <motion.p initial={{ y: 20, opacity: 0, filter: "blur(4px)" }} animate={{ y: 0, opacity: 1, filter: "blur(0px)" }} transition={{ duration: 0.7, delay: 0.4 }} className="max-w-2xl text-lg md:text-xl text-black/65 dark:text-white/65 leading-relaxed">
            Người điều khiển và sản xuất phần mềm bằng AI · Prompt Master · THCS Vĩnh Hòa
          </motion.p>

          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, delay: 0.6 }} className="flex flex-col sm:flex-row gap-4 pt-2">
            <motion.a href="#du-an" whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.97 }} className="px-8 py-4 rounded-full bg-black text-white dark:bg-white dark:text-black font-semibold flex items-center justify-center gap-2 shadow-lg">
              Xem Dự Án
              <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                <ArrowRight className="w-4 h-4" />
              </motion.span>
            </motion.a>
            <motion.a href="#lien-he" whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.97 }} className="px-8 py-4 rounded-full glass-card font-semibold flex items-center justify-center">
              Liên Hệ
            </motion.a>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} className="w-5 h-8 rounded-full border border-black/20 dark:border-white/20 flex items-start justify-center pt-1.5">
              <div className="w-1 h-2 rounded-full bg-black/40 dark:bg-white/40" />
            </motion.div>
            <span className="text-xs font-mono text-black/30 dark:text-white/30 tracking-widest uppercase">Cuộn</span>
          </motion.div>
        </motion.div>
      </section>

      {/* ── STATS ── */}
      <section className="py-20 px-6 border-y border-black/5 dark:border-white/5">
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-3 gap-8">
            {statsData.map((s, i) => (
              <AnimatedStat key={s.label} value={s.value} label={s.label} delay={i * 0.12} />
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section id="gioi-thieu" className="py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="mb-16">
            <p className="text-xs font-mono tracking-widest uppercase text-black/40 dark:text-white/40 mb-3">Về tôi</p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Giới Thiệu</h2>
            <motion.div initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }} className="w-16 h-1 bg-black dark:bg-white rounded-full origin-left" />
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12 items-start">
            {/* Bio */}
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="space-y-5">
              <p className="text-black/70 dark:text-white/70 leading-relaxed">
                Tôi là một người đam mê công nghệ, đặc biệt quan tâm đến lĩnh vực IoT và trí tuệ nhân tạo. Hiện tại, tôi đang phát triển dự án NexoraGarden — một hệ thống nông nghiệp thông minh sử dụng ESP32, cảm biến môi trường và nền tảng giao tiếp thời gian thực nhằm tối ưu hóa việc chăm sóc cây trồng.
              </p>
              <p className="text-black/70 dark:text-white/70 leading-relaxed">
                Tôi có xu hướng tự học, thích khám phá và cải tiến hệ thống để đạt hiệu quả cao hơn. Trong quá trình làm việc, tôi tập trung vào việc giải quyết vấn đề thực tế, tối ưu hóa hiệu suất và nâng cao trải nghiệm người dùng.
              </p>
              <p className="text-black/70 dark:text-white/70 leading-relaxed">
                Mục tiêu của tôi là phát triển các giải pháp công nghệ có tính ứng dụng cao, đặc biệt trong lĩnh vực nông nghiệp thông minh, góp phần nâng cao năng suất và giảm thiểu công sức cho con người.
              </p>

              {/* Award badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                whileHover={{ scale: 1.02 }}
                className="glass-card rounded-xl p-4 flex items-center gap-3 mt-6"
              >
                <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
                  <Trophy className="w-6 h-6 text-black/60 dark:text-white/60" />
                </motion.div>
                <div>
                  <p className="font-semibold text-sm">Giải Nhất — Tin Học Cấp Trường</p>
                  <p className="text-xs text-black/50 dark:text-white/50 font-mono mt-0.5">THCS Vĩnh Hòa</p>
                </div>
              </motion.div>
            </motion.div>

            {/* Skills */}
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.15 }}>
              <p className="text-sm font-mono text-black/40 dark:text-white/40 mb-6 tracking-wider uppercase">Kỹ năng & Công nghệ</p>
              <div className="flex flex-wrap gap-3">
                {skills.map((skill, i) => (
                  <motion.span
                    key={skill}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.07 }}
                    whileHover={{ scale: 1.06, y: -2 }}
                    className="px-4 py-2 rounded-full glass-card text-sm font-medium border border-black/10 dark:border-white/10 cursor-default"
                  >
                    {skill}
                  </motion.span>
                ))}
              </div>

              {/* Prompt Master badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="mt-8 glass-card rounded-xl p-4 flex items-center gap-3"
              >
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}>
                  <Sparkles className="w-6 h-6 text-black/60 dark:text-white/60" />
                </motion.div>
                <div>
                  <p className="font-semibold text-sm">Prompt Master</p>
                  <p className="text-xs text-black/50 dark:text-white/50 font-mono mt-0.5">Điều khiển & sản xuất phần mềm bằng AI</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── PROJECTS ── */}
      <section id="du-an" className="py-32 px-6 border-t border-black/5 dark:border-white/5">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="mb-16">
            <p className="text-xs font-mono tracking-widest uppercase text-black/40 dark:text-white/40 mb-3">Công trình</p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Dự Án</h2>
            <motion.div initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }} className="w-16 h-1 bg-black dark:bg-white rounded-full origin-left" />
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project, i) => (
              <ProjectCard key={project.id} project={project} i={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section id="lien-he" className="py-32 px-6 border-t border-black/5 dark:border-white/5 relative overflow-hidden">
        <motion.div className="absolute -right-40 top-0 w-96 h-96 rounded-full bg-black/2 dark:bg-white/3 blur-3xl pointer-events-none" animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />
        <div className="max-w-4xl mx-auto relative z-10">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="mb-16">
            <p className="text-xs font-mono tracking-widest uppercase text-black/40 dark:text-white/40 mb-3">Kết nối</p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Liên Hệ</h2>
            <motion.div initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }} className="w-16 h-1 bg-black dark:bg-white rounded-full origin-left" />
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-4">
            {contactItems.map((item) => (
              <motion.a
                key={item.label}
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noopener noreferrer" : undefined}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: item.delay, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="glass-card p-5 rounded-2xl flex items-center gap-4 group border border-black/5 dark:border-white/5 hover:border-black/15 dark:hover:border-white/15 transition-colors"
              >
                <motion.div whileHover={{ rotate: 15, scale: 1.1 }} transition={{ duration: 0.3 }} className="w-11 h-11 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5" />
                </motion.div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm">{item.label}</h3>
                  <p className="text-xs text-black/55 dark:text-white/55 truncate mt-0.5">{item.sub}</p>
                </div>
                <motion.div className="ml-auto flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" animate={{}}>
                  <ArrowRight className="w-4 h-4" />
                </motion.div>
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <motion.footer initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="py-10 text-center border-t border-black/5 dark:border-white/5">
        <motion.p animate={{ opacity: [0.4, 0.7, 0.4] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="text-sm font-mono text-black/40 dark:text-white/40 tracking-widest">
          THCS VĨNH HÒA &nbsp;·&nbsp; KIẾN TẠO TƯƠNG LAI &nbsp;·&nbsp; 2025
        </motion.p>
      </motion.footer>
    </div>
  );
}
