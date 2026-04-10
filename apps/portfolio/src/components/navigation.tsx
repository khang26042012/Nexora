import { useState, useEffect, useCallback } from "react";
import { Menu, X, Home, User, Clock, FolderOpen, Mail, Wrench, LucideIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";

const FONT = "'Plus Jakarta Sans', sans-serif";

type NavLink = { name: string; href: string; icon: LucideIcon; route?: boolean };

const NAV_LINKS: NavLink[] = [
  { name: "Trang chủ",  href: "#trang-chu",  icon: Home },
  { name: "Giới thiệu", href: "#gioi-thieu", icon: User },
  { name: "Lịch sử",    href: "#lich-su",    icon: Clock },
  { name: "Dự án",      href: "#du-an",      icon: FolderOpen },
  { name: "Liên hệ",    href: "#lien-he",    icon: Mail },
  { name: "Tool",        href: "/tool",       icon: Wrench, route: true },
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

  const handleNavClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string, isRoute?: boolean) => {
      e.preventDefault();
      setIsOpen(false);
      setActive(href);
      if (isRoute) {
        navigate(href);
      } else {
        if (location !== "/") {
          navigate("/");
          setTimeout(() => {
            document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
          }, 120);
        } else {
          document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
        }
      }
    },
    [location, navigate],
  );

  return (
    <>
      {/* Header bar */}
      <motion.header
        className="fixed top-0 left-0 right-0 z-40 px-5 h-16 flex items-center pointer-events-none transition-all duration-300"
        style={{
          background: scrolled ? "rgba(0,0,0,0.75)" : "transparent",
          backdropFilter: scrolled ? "blur(18px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(255,255,255,0.07)" : "1px solid transparent",
        }}
      >
        <button
          onClick={() => setIsOpen(true)}
          className="pointer-events-auto relative p-2.5 rounded-xl transition-all duration-200"
          style={{
            background: "rgba(0,0,0,0.55)",
            border: "1px solid rgba(255,255,255,0.14)",
            backdropFilter: "blur(10px)",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = "rgba(30,30,30,0.85)";
            (e.currentTarget as HTMLElement).style.border = "1px solid rgba(255,255,255,0.25)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.55)";
            (e.currentTarget as HTMLElement).style.border = "1px solid rgba(255,255,255,0.14)";
          }}
          aria-label="Mở menu"
        >
          <Menu className="w-5 h-5 text-white/70" />
        </button>
      </motion.header>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-50"
              style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)" }}
            />

            {/* Sidebar */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 240 }}
              className="fixed top-0 left-0 bottom-0 w-72 max-w-[82vw] z-50 flex flex-col overflow-hidden"
              style={{
                background: "#0a0a0a",
                borderRight: "1px solid rgba(255,255,255,0.09)",
                boxShadow: "8px 0 40px rgba(0,0,0,0.7)",
                fontFamily: FONT,
              }}
            >
              {/* Subtle top glow */}
              <div
                className="absolute top-0 left-0 w-64 h-40 pointer-events-none"
                style={{ background: "radial-gradient(ellipse at 0% 0%, rgba(255,255,255,0.03) 0%, transparent 70%)" }}
              />

              {/* Header */}
              <div
                className="relative px-5 h-16 flex items-center justify-between flex-shrink-0"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{
                      background: "#1a1a1a",
                      border: "1px solid rgba(255,255,255,0.15)",
                    }}
                  >
                    <span className="text-white text-xs font-black" style={{ fontFamily: FONT }}>N</span>
                  </div>
                  <span className="text-sm font-semibold text-white/60" style={{ fontFamily: FONT }}>
                    Phan Trọng Khang
                  </span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-xl transition-all duration-150"
                  style={{ border: "1px solid rgba(255,255,255,0.09)" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                >
                  <X className="w-4 h-4 text-white/45" />
                </button>
              </div>

              {/* Nav links */}
              <nav className="flex-1 px-3 py-5 flex flex-col gap-1 overflow-y-auto">
                {NAV_LINKS.map((link, i) => {
                  const Icon = link.icon;
                  const isActive = active === link.href;
                  return (
                    <motion.a
                      key={link.name}
                      href={link.href}
                      onClick={(e) => handleNavClick(e, link.href, link.route)}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 + i * 0.055, type: "spring", stiffness: 300, damping: 24 }}
                      className="relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-150 group"
                      style={{
                        background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
                        border: isActive ? "1px solid rgba(255,255,255,0.14)" : "1px solid transparent",
                        cursor: "pointer",
                      }}
                      onMouseEnter={e => {
                        if (isActive) return;
                        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                        (e.currentTarget as HTMLElement).style.border = "1px solid rgba(255,255,255,0.09)";
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.background = isActive ? "rgba(255,255,255,0.08)" : "transparent";
                        (e.currentTarget as HTMLElement).style.border = isActive ? "1px solid rgba(255,255,255,0.14)" : "1px solid transparent";
                      }}
                    >
                      {/* Active indicator */}
                      {isActive && (
                        <motion.div
                          layoutId="activeBar"
                          className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-white/60"
                        />
                      )}

                      {/* Icon */}
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          background: isActive ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.04)",
                          border: isActive ? "1px solid rgba(255,255,255,0.18)" : "1px solid rgba(255,255,255,0.07)",
                        }}
                      >
                        <Icon
                          className="w-4 h-4"
                          style={{ color: isActive ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.40)" }}
                        />
                      </div>

                      <span
                        className="text-sm font-medium flex-1"
                        style={{ color: isActive ? "rgba(255,255,255,0.90)" : "rgba(255,255,255,0.55)" }}
                      >
                        {link.name}
                      </span>
                    </motion.a>
                  );
                })}
              </nav>

              {/* Footer */}
              <div
                className="px-5 py-5 flex-shrink-0"
                style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
              >
                <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.18)", fontFamily: FONT }}>
                  © 2026 Phan Trọng Khang
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  {[0.5, 0.3, 0.15].map((op, idx) => (
                    <div
                      key={idx}
                      className="w-1.5 h-1.5 rounded-full bg-white"
                      style={{ opacity: op }}
                    />
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
