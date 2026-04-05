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
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: [0, -40, 0],
            x: [0, Math.random() * 20 - 10, 0],
            opacity: [0, 0.6, 0],
            scale: [0.5, 1.2, 0.5],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
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
    const move = (e: MouseEvent) => {
      x.set(e.clientX - 200);
      y.set(e.clientY - 200);
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, [x, y]);

  return (
    <motion.div
      className="pointer-events-none fixed z-0 w-[400px] h-[400px] rounded-full opacity-[0.06] dark:opacity-[0.08]"
      style={{
        left: springX,
        top: springY,
        background:
          "radial-gradient(circle, rgba(255,255,255,1) 0%, transparent 70%)",
      }}
    />
  );
}

function AvatarOrb() {
  return (
    <div className="relative flex items-center justify-center">
      {/* Outer rotating ring */}
      <motion.div
        className="absolute w-44 h-44 rounded-full border border-black/10 dark:border-white/10"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      >
        {[0, 90, 180, 270].map((deg) => (
          <div
            key={deg}
            className="absolute w-2 h-2 rounded-full bg-black/30 dark:bg-white/30"
            style={{
              top: "50%",
              left: "50%",
              transform: `rotate(${deg}deg) translateX(86px) translateY(-50%)`,
            }}
          />
        ))}
      </motion.div>

      {/* Middle pulsing ring */}
      <motion.div
        className="absolute w-36 h-36 rounded-full border border-black/15 dark:border-white/15"
        animate={{ scale: [1, 1.06, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Glow pulse */}
      <motion.div
        className="absolute w-32 h-32 rounded-full bg-black/5 dark:bg-white/10"
        animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />

      {/* Avatar image */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        whileHover={{ scale: 1.04 }}
        className="relative z-10 w-28 h-28 rounded-full overflow-hidden border-2 border-black/20 dark:border-white/20 shadow-2xl"
      >
        <img
          src={avatarImg}
          alt="Phan Trọng Khang"
          className="w-full h-full object-cover"
        />
        {/* Overlay shimmer on hover */}
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
    const interval = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 200);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="relative inline-block">
      {text}
      <AnimatePresence>
        {glitch && (
          <>
            <motion.span
              className="absolute inset-0 text-black/30 dark:text-white/30"
              initial={{ x: 0, opacity: 0 }}
              animate={{ x: [-3, 3, -1, 0], opacity: [0, 0.8, 0.4, 0] }}
              transition={{ duration: 0.2 }}
              style={{ clipPath: "inset(20% 0 60% 0)" }}
            >
              {text}
            </motion.span>
            <motion.span
              className="absolute inset-0 text-black/20 dark:text-white/20"
              initial={{ x: 0, opacity: 0 }}
              animate={{ x: [3, -3, 1, 0], opacity: [0, 0.6, 0.3, 0] }}
              transition={{ duration: 0.2 }}
              style={{ clipPath: "inset(60% 0 20% 0)" }}
            >
              {text}
            </motion.span>
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
      if (i < full.length) {
        setDisplayed(full.slice(0, i + 1));
        i++;
      } else {
        setDone(true);
        clearInterval(timer);
      }
    }, 80);
    return () => clearInterval(timer);
  }, []);

  return (
    <span>
      {displayed}
      {!done && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="inline-block w-0.5 h-6 bg-current ml-0.5 align-middle"
        />
      )}
    </span>
  );
}

function ProjectCard({
  project,
  i,
}: {
  project: { id: string; title: string; desc: string; icon: React.ElementType };
  i: number;
}) {
  const Icon = project.icon;
  const [hovered, setHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springRotX = useSpring(rotateX, { stiffness: 150, damping: 20 });
  const springRotY = useSpring(rotateY, { stiffness: 150, damping: 20 });

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const card = cardRef.current;
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      rotateX.set(((e.clientY - cy) / (rect.height / 2)) * -8);
      rotateY.set(((e.clientX - cx) / (rect.width / 2)) * 8);
    },
    [rotateX, rotateY]
  );

  const onMouseLeave = useCallback(() => {
    rotateX.set(0);
    rotateY.set(0);
    setHovered(false);
  }, [rotateX, rotateY]);

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
      {/* Animated shimmer on hover */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />

      {/* Border glow */}
      <motion.div
        className="absolute inset-0 rounded-2xl border border-black/20 dark:border-white/20"
        animate={{ opacity: hovered ? 1 : 0.3 }}
        transition={{ duration: 0.3 }}
      />

      <div className="absolute top-6 right-6 z-10">
        <motion.span
          animate={hovered ? { scale: 1.05 } : { scale: 1 }}
          transition={{ duration: 0.2 }}
          className="px-3 py-1 text-xs font-mono rounded-full border border-black/20 dark:border-white/20 bg-black/5 dark:bg-white/5"
        >
          Sắp Ra Mắt
        </motion.span>
      </div>

      <motion.div
        animate={hovered ? { scale: 1.1, rotate: 10 } : { scale: 1, rotate: 0 }}
        transition={{ duration: 0.4, ease: "backOut" }}
        className="w-12 h-12 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center mb-6 z-10 relative"
      >
        <Icon className="w-6 h-6 opacity-60" />
      </motion.div>

      <motion.h3
        animate={hovered ? { x: 6 } : { x: 0 }}
        transition={{ duration: 0.3 }}
        className="text-xl font-bold mb-2 z-10 relative"
      >
        {project.title}
      </motion.h3>

      <p className="text-black/60 dark:text-white/60 text-sm mb-10 z-10 relative">
        {project.desc}
      </p>

      <motion.div
        animate={{ opacity: hovered ? 1 : 0.4, x: hovered ? 0 : -8 }}
        transition={{ duration: 0.3 }}
        className="absolute bottom-6 left-6 z-10"
      >
        <Link
          href={`/du-an-${project.id}`}
          className="text-sm font-medium flex items-center gap-2"
        >
          Chi tiết <ExternalLink className="w-4 h-4" />
        </Link>
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
      <motion.div
        className="text-4xl md:text-5xl font-bold font-mono mb-1"
        initial={{ scale: 0.5 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: delay + 0.1, type: "spring", stiffness: 200 }}
      >
        {value}
      </motion.div>
      <div className="text-sm text-black/50 dark:text-white/50 font-mono">{label}</div>
    </motion.div>
  );
}

export function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end end"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.18], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.18], [0, 80]);
  const heroScale = useTransform(scrollYProgress, [0, 0.18], [1, 0.96]);

  const projects = [
    { id: "1", title: "Hệ Thống AI Tự Động", desc: "Dự án đang được phát triển...", icon: BrainCircuit },
    { id: "2", title: "Mô Hình Phân Tích Dữ Liệu", desc: "Dự án đang được phát triển...", icon: Network },
    { id: "3", title: "Chatbot Kiến Trúc", desc: "Dự án đang được phát triển...", icon: Cpu },
  ];

  return (
    <div
      ref={containerRef}
      className="min-h-screen noise-bg selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black"
    >
      <CursorGlow />
      <Navigation />

      {/* ── HERO ── */}
      <section
        id="trang-chu"
        className="relative min-h-screen flex items-center justify-center pt-20 px-6 overflow-hidden"
      >
        <GridBackground />
        <FloatingParticles />

        {/* Radial glow */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          style={{
            background:
              "radial-gradient(ellipse 60% 40% at 50% 40%, rgba(0,0,0,0.04) 0%, transparent 70%)",
          }}
        />

        <motion.div
          style={{ opacity: heroOpacity, y: heroY, scale: heroScale }}
          className="relative z-10 max-w-4xl mx-auto flex flex-col items-center text-center gap-8"
        >
          {/* Avatar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <AvatarOrb />
          </motion.div>

          {/* Name */}
          <div className="space-y-3">
            <motion.h1
              initial={{ y: 30, opacity: 0, filter: "blur(8px)" }}
              animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="text-5xl md:text-7xl font-bold tracking-tight"
            >
              <GlitchText text="Phan Trọng Khang" />
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.55 }}
              className="flex items-center justify-center gap-3 text-xl md:text-2xl font-mono text-black/55 dark:text-white/55"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <Zap className="w-5 h-5" />
              </motion.div>
              <TypewriterTitle />
            </motion.div>
          </div>

          {/* Bio */}
          <motion.p
            initial={{ y: 20, opacity: 0, filter: "blur(4px)" }}
            animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="max-w-2xl text-lg md:text-xl text-black/65 dark:text-white/65 leading-relaxed"
          >
            Một học sinh đam mê trí tuệ nhân tạo, đang kiến tạo những hệ thống thông minh định hình tương lai.
            Khám phá ranh giới của công nghệ với tư duy của một kiến trúc sư.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 pt-2"
          >
            <motion.a
              href="#du-an"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="px-8 py-4 rounded-full bg-black text-white dark:bg-white dark:text-black font-semibold flex items-center justify-center gap-2 shadow-lg"
            >
              Xem Dự Án
              <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                <ArrowRight className="w-4 h-4" />
              </motion.span>
            </motion.a>
            <motion.a
              href="#lien-he"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="px-8 py-4 rounded-full glass-card font-semibold flex items-center justify-center"
            >
              Liên Hệ
            </motion.a>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="w-5 h-8 rounded-full border border-black/20 dark:border-white/20 flex items-start justify-center pt-1.5"
            >
              <div className="w-1 h-2 rounded-full bg-black/40 dark:bg-white/40" />
            </motion.div>
            <span className="text-xs font-mono text-black/30 dark:text-white/30 tracking-widest uppercase">Cuộn</span>
          </motion.div>
        </motion.div>
      </section>

      {/* ── STATS ── */}
      <section className="py-20 px-6 border-y border-black/5 dark:border-white/5 overflow-hidden">
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-3 gap-8">
            {statsData.map((s, i) => (
              <AnimatedStat key={s.label} value={s.value} label={s.label} delay={i * 0.12} />
            ))}
          </div>
        </div>
      </section>

      {/* ── PROJECTS ── */}
      <section id="du-an" className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mb-16"
          >
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-xs font-mono tracking-widest uppercase text-black/40 dark:text-white/40 mb-3"
            >
              Công trình
            </motion.p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Dự Án</h2>
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="w-16 h-1 bg-black dark:bg-white rounded-full origin-left"
            />
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
        {/* background orb */}
        <motion.div
          className="absolute -right-40 top-0 w-96 h-96 rounded-full bg-black/2 dark:bg-white/3 blur-3xl pointer-events-none"
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="max-w-4xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mb-16"
          >
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-xs font-mono tracking-widest uppercase text-black/40 dark:text-white/40 mb-3"
            >
              Kết nối
            </motion.p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Liên Hệ</h2>
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="w-16 h-1 bg-black dark:bg-white rounded-full origin-left"
            />
          </motion.div>

          <div className="grid gap-4">
            {[
              {
                href: "https://github.com/khang26042012",
                icon: Github,
                label: "GitHub",
                sub: "@khang26042012",
                external: true,
                delay: 0,
              },
              {
                href: "mailto:hello@example.com",
                icon: Mail,
                label: "Email",
                sub: "hello@example.com",
                external: false,
                delay: 0.1,
              },
            ].map((item) => (
              <motion.a
                key={item.label}
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noopener noreferrer" : undefined}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: item.delay, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ x: 6 }}
                className="glass-card p-6 rounded-2xl flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <motion.div
                    whileHover={{ rotate: 15, scale: 1.1 }}
                    transition={{ duration: 0.3 }}
                    className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center"
                  >
                    <item.icon className="w-6 h-6" />
                  </motion.div>
                  <div>
                    <h3 className="font-bold">{item.label}</h3>
                    <p className="text-sm text-black/55 dark:text-white/55">{item.sub}</p>
                  </div>
                </div>
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  whileHover={{ opacity: 1, x: 0 }}
                  className="opacity-0 group-hover:opacity-100 transition-all"
                >
                  <ArrowRight className="w-5 h-5" />
                </motion.div>
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="py-10 text-center border-t border-black/5 dark:border-white/5"
      >
        <motion.p
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="text-sm font-mono text-black/40 dark:text-white/40 tracking-widest"
        >
          THCS VĨNH HÒA &nbsp;·&nbsp; KIẾN TẠO TƯƠNG LAI &nbsp;·&nbsp; 2025
        </motion.p>
      </motion.footer>
    </div>
  );
}
