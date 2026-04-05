import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setIsOpen(false); };
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("keydown", handleEsc);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("keydown", handleEsc);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const navLinks = [
    { name: "Trang chủ", href: "#trang-chu" },
    { name: "Giới Thiệu", href: "#gioi-thieu" },
    { name: "Dự Án", href: "#du-an" },
    { name: "Liên Hệ", href: "#lien-he" },
  ];

  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setIsOpen(false);
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <motion.header
        className="fixed top-0 left-0 right-0 z-40 p-5 flex justify-between items-center pointer-events-none transition-all duration-300"
        style={{ background: scrolled ? "rgba(2,0,8,0.75)" : "transparent", backdropFilter: scrolled ? "blur(16px)" : "none", borderBottom: scrolled ? "1px solid rgba(130,80,255,0.12)" : "1px solid transparent" }}>
        {/* Logo */}
        <div className="pointer-events-auto flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(100,50,220,0.2)", border: "1px solid rgba(130,80,255,0.3)" }}>
            <span className="text-xs font-bold font-mono" style={{ color: "#a78bfa" }}>PK</span>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="pointer-events-auto p-2.5 rounded-xl transition-colors"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
          aria-label="Mở menu">
          <Menu className="w-5 h-5 text-white/70" />
        </button>
      </motion.header>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-50"
              style={{ background: "rgba(2,0,8,0.85)", backdropFilter: "blur(8px)" }} />
            <motion.aside
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 220 }}
              className="fixed top-0 left-0 bottom-0 w-80 max-w-[80vw] z-50 flex flex-col"
              style={{ background: "rgba(8,4,20,0.98)", borderRight: "1px solid rgba(130,80,255,0.15)" }}>

              <div className="p-5 flex items-center justify-between"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(100,50,220,0.2)", border: "1px solid rgba(130,80,255,0.3)" }}>
                    <span className="text-xs font-bold font-mono" style={{ color: "#a78bfa" }}>PK</span>
                  </div>
                  <span className="text-sm font-mono text-white/50">Menu</span>
                </div>
                <button onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg transition-colors"
                  style={{ background: "rgba(255,255,255,0.05)" }}>
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>

              <nav className="flex-1 px-6 py-10 flex flex-col gap-2">
                {navLinks.map((link, i) => (
                  <motion.a
                    key={link.name}
                    href={link.href}
                    onClick={(e) => handleScroll(e, link.href)}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.08 + i * 0.08 }}
                    className="text-xl font-bold py-3 px-4 rounded-xl transition-colors flex items-center gap-3"
                    style={{ color: "rgba(255,255,255,0.55)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "white"; (e.currentTarget as HTMLElement).style.background = "rgba(130,80,255,0.1)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.55)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "rgba(130,80,255,0.5)" }} />
                    {link.name}
                  </motion.a>
                ))}
              </nav>

              <div className="p-6" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <p className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>
                  © 2025 Phan Trọng Khang
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  {["#a78bfa","#38bdf8","#34d399"].map(c => (
                    <div key={c} className="w-2 h-2 rounded-full" style={{ background: c, opacity: 0.6 }} />
                  ))}
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
