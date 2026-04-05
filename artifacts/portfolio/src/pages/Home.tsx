import { Navigation } from "@/components/navigation";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Github, Mail, BrainCircuit, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { useRef } from "react";

export function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.2], [0, 100]);

  const projects = [
    { id: "1", title: "Hệ thống AI Tự Động", desc: "Dự án đang được phát triển..." },
    { id: "2", title: "Mô hình Phân Tích Dữ Liệu", desc: "Dự án đang được phát triển..." },
    { id: "3", title: "Chatbot Kiến Trúc", desc: "Dự án đang được phát triển..." }
  ];

  return (
    <div ref={containerRef} className="min-h-screen noise-bg selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
      <Navigation />

      {/* Hero Section */}
      <section id="trang-chu" className="relative min-h-screen flex items-center justify-center pt-20 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-black/5 via-transparent to-transparent dark:from-white/5 dark:via-transparent dark:to-transparent pointer-events-none" />
        
        <motion.div 
          style={{ opacity: heroOpacity, y: heroY }}
          className="relative z-10 max-w-4xl mx-auto flex flex-col items-center text-center gap-8"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-24 h-24 rounded-full glass-card flex items-center justify-center relative group"
          >
            <div className="absolute inset-0 rounded-full border border-black/20 dark:border-white/20 group-hover:scale-110 transition-transform duration-500" />
            <span className="text-2xl font-bold font-mono tracking-tighter">PTK</span>
          </motion.div>

          <div className="space-y-4">
            <motion.h1 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-5xl md:text-7xl font-bold tracking-tight"
            >
              Phan Trọng Khang
            </motion.h1>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex items-center justify-center gap-3 text-xl md:text-2xl font-mono text-black/60 dark:text-white/60"
            >
              <BrainCircuit className="w-6 h-6" />
              <span>AI Architect</span>
            </motion.div>
          </div>

          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="max-w-2xl text-lg md:text-xl text-black/70 dark:text-white/70 leading-relaxed"
          >
            Một học sinh đam mê trí tuệ nhân tạo, đang kiến tạo những hệ thống thông minh định hình tương lai. Khám phá ranh giới của công nghệ với tư duy của một kiến trúc sư.
          </motion.p>

          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 pt-4"
          >
            <a 
              href="#du-an"
              className="px-8 py-4 rounded-full bg-black text-white dark:bg-white dark:text-black font-medium flex items-center justify-center gap-2 hover:scale-105 transition-transform"
            >
              Xem Dự Án <ArrowRight className="w-4 h-4" />
            </a>
            <a 
              href="#lien-he"
              className="px-8 py-4 rounded-full glass-card font-medium flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              Liên Hệ
            </a>
          </motion.div>
        </motion.div>
      </section>

      {/* Projects Section */}
      <section id="du-an" className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <h2 className="text-4xl font-bold tracking-tight mb-4">Dự Án</h2>
            <div className="w-12 h-1 bg-black dark:bg-white rounded-full" />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project, i) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group glass-card rounded-2xl p-6 hover:bg-white/10 dark:hover:bg-white/5 transition-colors relative overflow-hidden"
              >
                <div className="absolute top-6 right-6">
                  <span className="px-3 py-1 text-xs font-mono rounded-full border border-black/20 dark:border-white/20 bg-black/5 dark:bg-white/5">
                    Coming Soon
                  </span>
                </div>
                
                <div className="w-12 h-12 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center mb-6">
                  <BrainCircuit className="w-6 h-6 opacity-50" />
                </div>
                
                <h3 className="text-xl font-bold mb-2 group-hover:translate-x-2 transition-transform">
                  {project.title}
                </h3>
                
                <p className="text-black/60 dark:text-white/60 text-sm mb-8">
                  {project.desc}
                </p>

                <Link href={`/du-an-${project.id}`} className="absolute bottom-6 left-6 text-sm font-medium flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                  Chi tiết <ExternalLink className="w-4 h-4" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="lien-he" className="py-32 px-6 border-t border-black/5 dark:border-white/5">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <h2 className="text-4xl font-bold tracking-tight mb-4">Liên Hệ</h2>
            <div className="w-12 h-1 bg-black dark:bg-white rounded-full" />
          </motion.div>

          <div className="grid gap-6">
            <motion.a
              href="https://github.com/khang26042012"
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="glass-card p-6 rounded-2xl flex items-center justify-between group hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center">
                  <Github className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold">GitHub</h3>
                  <p className="text-sm text-black/60 dark:text-white/60">@khang26042012</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all" />
            </motion.a>

            <motion.a
              href="mailto:contact@example.com"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="glass-card p-6 rounded-2xl flex items-center justify-between group hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold">Email</h3>
                  <p className="text-sm text-black/60 dark:text-white/60">hello@example.com</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all" />
            </motion.a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center border-t border-black/5 dark:border-white/5">
        <p className="text-sm font-mono text-black/40 dark:text-white/40">
          THCS Vĩnh Hòa • Kiến tạo tương lai
        </p>
      </footer>
    </div>
  );
}
