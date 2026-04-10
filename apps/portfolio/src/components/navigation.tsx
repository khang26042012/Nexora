import { useState, useEffect, useCallback } from "react";
import { Menu, X, Home, User, FolderOpen, Mail, Wrench, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";

const NAV_SECTIONS = [
  {
    label: "Điều hướng",
    links: [
      { name: "Trang chủ", href: "#trang-chu", icon: Home },
      { name: "Dự Án",     href: "#du-an",     icon: FolderOpen },
    ],
  },
  {
    label: "Khám phá",
    links: [
      { name: "Tool",     href: "/tool",    icon: Wrench,        route: true },
      { name: "Hỏi Đáp", href: "#hoi-dap", icon: MessageCircle, badge: "Sắp có" },
    ],
  },
];

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("#trang-chu");
  const [location, navigate] = useLocation();

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

  const handleNavClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, href: string, isRoute?: boolean) => {
    e.preventDefault();
    setIsOpen(false);
    setActive(href);
    if (isRoute) {
      navigate(href);
    } else {
      // Nếu đang ở trang khác (vd: /tool), navigate về "/" trước rồi mới scroll
      if (location !== "/") {
        navigate("/");
        setTimeout(() => {
          document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
        }, 120);
      } else {
        document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [location, navigate]);

  return (
    <>
      {/* Header bar */}
      <motion.header
        className="fixed top-0 left-0 right-0 z-40 px-5 h-16 flex items-center pointer-events-none transition-all duration-300"
        style={{
          background: scrolled ? "rgba(2,0,12,0.80)" : "transparent",
          backdropFilter: scrolled ? "blur(20px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(139,92,246,0.15)" : "1px solid transparent",
        }}>
        <button
          onClick={() => setIsOpen(true)}
          className="pointer-events-auto relative p-2.5 rounded-xl transition-all duration-200 group"
          style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}
          aria-label="Mở menu">
          <Menu className="w-5 h-5 text-violet-300/80 group-hover:text-violet-200 transition-colors" />
        </button>
      </motion.header>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-50"
              style={{ background: "rgba(2,0,12,0.75)", backdropFilter: "blur(10px)" }} />

            {/* Sidebar */}
            <motion.aside
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 240 }}
              className="fixed top-0 left-0 bottom-0 w-72 max-w-[82vw] z-50 flex flex-col overflow-hidden"
              style={{
                background: "linear-gradient(160deg, #0d0018 0%, #0a0014 60%, #050010 100%)",
                borderRight: "1px solid rgba(139,92,246,0.18)",
                boxShadow: "8px 0 40px rgba(0,0,0,0.6)",
              }}>

              {/* Glow top-left */}
              <div className="absolute top-0 left-0 w-48 h-48 pointer-events-none"
                style={{ background: "radial-gradient(ellipse at 0% 0%, rgba(139,92,246,0.15) 0%, transparent 70%)" }} />

              {/* Header */}
              <div className="relative px-5 h-16 flex items-center justify-between flex-shrink-0"
                style={{ borderBottom: "1px solid rgba(139,92,246,0.12)" }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)", boxShadow: "0 0 10px rgba(124,58,237,0.4)" }}>
                    <span className="text-white text-xs font-black">N</span>
                  </div>
                  <span className="text-sm font-semibold text-white/70 tracking-wide">NexoraX</span>
                </div>
                <button onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg transition-all duration-150 hover:bg-white/5"
                  style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                  <X className="w-4 h-4 text-white/50" />
                </button>
              </div>

              {/* Nav sections */}
              <nav className="flex-1 px-3 py-5 flex flex-col gap-6 overflow-y-auto">
                {NAV_SECTIONS.map((section, si) => (
                  <div key={section.label}>
                    <p className="text-[10px] font-mono tracking-[0.18em] uppercase px-3 mb-2"
                      style={{ color: "rgba(139,92,246,0.5)" }}>
                      {section.label}
                    </p>
                    <div className="flex flex-col gap-0.5">
                      {section.links.map((link, i) => {
                        const Icon = link.icon;
                        const isActive = active === link.href;
                        const isSoon = !!link.badge;
                        return (
                          <motion.a
                            key={link.name}
                            href={link.href}
                            onClick={(e) => !isSoon && handleNavClick(e, link.href, (link as any).route)}
                            initial={{ opacity: 0, x: -16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.06 + si * 0.1 + i * 0.07, type: "spring", stiffness: 300, damping: 24 }}
                            className="relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-150 group"
                            style={{
                              background: isActive ? "rgba(139,92,246,0.14)" : "transparent",
                              border: isActive ? "1px solid rgba(139,92,246,0.25)" : "1px solid transparent",
                              cursor: isSoon ? "default" : "pointer",
                              opacity: isSoon ? 0.6 : 1,
                            }}
                            onMouseEnter={(e) => {
                              if (isSoon) return;
                              (e.currentTarget as HTMLElement).style.background = "rgba(139,92,246,0.10)";
                              (e.currentTarget as HTMLElement).style.border = "1px solid rgba(139,92,246,0.18)";
                            }}
                            onMouseLeave={(e) => {
                              if (isSoon) return;
                              (e.currentTarget as HTMLElement).style.background = isActive ? "rgba(139,92,246,0.14)" : "transparent";
                              (e.currentTarget as HTMLElement).style.border = isActive ? "1px solid rgba(139,92,246,0.25)" : "1px solid transparent";
                            }}>

                            {/* Active indicator */}
                            {isActive && (
                              <motion.div layoutId="activeBar"
                                className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full"
                                style={{ background: "linear-gradient(to bottom, #7c3aed, #4f46e5)" }} />
                            )}

                            {/* Icon */}
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-150"
                              style={{
                                background: isActive
                                  ? "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(79,70,229,0.2))"
                                  : "rgba(255,255,255,0.04)",
                                border: isActive
                                  ? "1px solid rgba(139,92,246,0.3)"
                                  : "1px solid rgba(255,255,255,0.06)",
                              }}>
                              <Icon className="w-4 h-4 transition-colors duration-150"
                                style={{ color: isActive ? "#a78bfa" : "rgba(255,255,255,0.45)" }} />
                            </div>

                            <span className="text-sm font-medium transition-colors duration-150 flex-1"
                              style={{ color: isActive ? "#e2d9ff" : "rgba(255,255,255,0.6)" }}>
                              {link.name}
                            </span>

                            {/* Badge */}
                            {link.badge && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md tracking-wide"
                                style={{ background: "rgba(124,58,237,0.2)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.25)" }}>
                                {link.badge}
                              </span>
                            )}
                          </motion.a>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>

              {/* Footer */}
              <div className="px-5 py-5 flex-shrink-0"
                style={{ borderTop: "1px solid rgba(139,92,246,0.1)" }}>
                <p className="text-[11px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>
                  © 2026 Phan Trọng Khang
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  {[
                    { color: "#a78bfa", shadow: "rgba(167,139,250,0.5)" },
                    { color: "#38bdf8", shadow: "rgba(56,189,248,0.5)" },
                    { color: "#34d399", shadow: "rgba(52,211,153,0.5)" },
                  ].map(({ color, shadow }) => (
                    <div key={color} className="w-1.5 h-1.5 rounded-full"
                      style={{ background: color, boxShadow: `0 0 6px ${shadow}`, opacity: 0.7 }} />
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
