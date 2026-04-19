import { useState, useEffect, useCallback } from "react";
import { Home, Wrench, MessageCircle, LucideIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import avatarImg from "@/assets/avatar_new.jpg";

const FONT = "'Plus Jakarta Sans', sans-serif";

type NavLink = { name: string; href: string; icon: LucideIcon; accent: string };

const NAV_LINKS: NavLink[] = [
  { name: "Trang chủ", href: "/",     icon: Home,          accent: "rgba(180,220,255,0.7)" },
  { name: "Tool",       href: "/tool", icon: Wrench,        accent: "rgba(180,255,210,0.7)" },
  { name: "Chat Bot",   href: "/chat", icon: MessageCircle, accent: "rgba(220,180,255,0.7)" },
];

function getActiveFromLocation(loc: string): string {
  if (loc.startsWith("/chat")) return "/chat";
  if (loc.startsWith("/tool")) return "/tool";
  return "/";
}

/* ── Spin Ring — CSS only ── */
function SpinRing({ inset, duration, reverse = false, opacity = 0.5, dashed = false }: {
  inset: number; duration: number; reverse?: boolean; opacity?: number; dashed?: boolean;
}) {
  return (
    <div
      className={reverse ? "ring-ccw" : "ring-cw"}
      style={{
        position: "absolute", inset, borderRadius: "50%",
        border: dashed
          ? `1px dashed rgba(255,255,255,${opacity})`
          : `1.5px solid transparent`,
        borderTopColor:   dashed ? undefined : `rgba(255,255,255,${opacity})`,
        borderRightColor: dashed ? undefined : `rgba(255,255,255,${opacity * 0.3})`,
        pointerEvents: "none",
        "--ring-speed": `${duration}s`,
      } as React.CSSProperties}
    />
  );
}

function SidebarToggleIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1.5" y="1.5" width="17" height="17" rx="3.5" stroke="rgba(255,255,255,0.75)" strokeWidth="1.5" />
      <motion.line
        y1="2" y2="18"
        stroke="rgba(255,255,255,0.75)"
        strokeWidth="1.5"
        strokeLinecap="round"
        animate={{ x1: isOpen ? 6 : 14, x2: isOpen ? 6 : 14 }}
        initial={false}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
      />
    </svg>
  );
}

export function Navigation() {
  const [isOpen, setIsOpen]     = useState(false);
  const [location, navigate]    = useLocation();
  const [active, setActive]     = useState(() => getActiveFromLocation(location));
  const [hovered, setHovered]   = useState<string | null>(null);

  useEffect(() => {
    setActive(getActiveFromLocation(location));
  }, [location]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setIsOpen(false); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const handleNavClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      e.preventDefault();
      setIsOpen(false);
      navigate(href);
    },
    [navigate],
  );

  return (
    <>
      {/* ── Hamburger button ── */}
      <motion.header
        className="fixed top-0 left-0 right-0 z-[60] px-5 h-16 flex items-center pointer-events-none"
        style={{ background: "transparent" }}
      >
        <motion.button
          onClick={() => setIsOpen(v => !v)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          className="pointer-events-auto relative p-2.5 rounded-2xl"
          style={{
            background: isOpen ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.07)",
            border: isOpen ? "1px solid rgba(255,255,255,0.22)" : "1px solid rgba(255,255,255,0.14)",
            backdropFilter: "blur(16px)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
            transition: "background 0.25s ease, border-color 0.25s ease",
          }}
          aria-label={isOpen ? "Đóng menu" : "Mở menu"}
        >
          <SidebarToggleIcon isOpen={isOpen} />
        </motion.button>
      </motion.header>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* ── Overlay ── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-50"
              style={{ background: "rgba(0,0,0,0.55)" }}
            />

            {/* ── Sidebar ── */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="fixed top-0 left-0 bottom-0 w-72 max-w-[84vw] z-50 flex flex-col overflow-hidden"
              style={{
                background: "rgba(14,14,16,0.82)",
                backdropFilter: "blur(48px) saturate(160%)",
                borderRight: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "8px 0 60px rgba(0,0,0,0.7), inset -1px 0 0 rgba(255,255,255,0.05)",
                fontFamily: FONT,
              }}
            >
              {/* ── Ambient glow top-left ── */}
              <div
                className="absolute top-0 left-0 w-64 h-64 pointer-events-none"
                style={{
                  background: "radial-gradient(ellipse at 0% 0%, rgba(120,180,255,0.07) 0%, transparent 65%)",
                }}
              />
              {/* ── Ambient glow bottom-right ── */}
              <div
                className="absolute bottom-0 right-0 w-48 h-48 pointer-events-none"
                style={{
                  background: "radial-gradient(ellipse at 100% 100%, rgba(180,120,255,0.06) 0%, transparent 65%)",
                }}
              />

              {/* ── Header ── */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
                className="relative px-5 py-5 flex items-center justify-between flex-shrink-0"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
              >
                {/* Avatar + name */}
                <div className="flex items-center gap-3">
                  {/* Avatar ring */}
                  <div style={{ position: "relative", width: 44, height: 44 }}>
                    <SpinRing inset={-7} duration={22} reverse opacity={0.12} dashed />
                    <SpinRing inset={-3} duration={6} opacity={0.5} />
                    {/* Glow */}
                    <motion.div
                      animate={{ opacity: [0.25, 0.5, 0.25], scale: [1, 1.12, 1] }}
                      transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                      style={{
                        position: "absolute", inset: -4, borderRadius: "50%",
                        boxShadow: "0 0 20px 4px rgba(160,200,255,0.18)",
                        pointerEvents: "none",
                      }}
                    />
                    <div style={{
                      width: 44, height: 44, borderRadius: "50%", overflow: "hidden",
                      border: "2px solid rgba(255,255,255,0.18)",
                      boxShadow: "0 0 0 1px rgba(255,255,255,0.05)",
                    }}>
                      <img src={avatarImg} alt="Phan Trọng Khang" className="w-full h-full object-cover" />
                    </div>
                    {/* Online dot */}
                    <motion.div
                      animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                      transition={{ duration: 2.2, repeat: Infinity }}
                      style={{
                        position: "absolute", bottom: 1, right: 1,
                        width: 10, height: 10, borderRadius: "50%",
                        background: "#34d399",
                        border: "2px solid rgba(14,14,16,0.9)",
                        boxShadow: "0 0 8px rgba(52,211,153,0.6)",
                      }}
                    />
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <span
                      className="text-sm font-semibold"
                      style={{ color: "rgba(255,255,255,0.88)", fontFamily: FONT, letterSpacing: "-0.01em" }}
                    >
                      Phan Trọng Khang
                    </span>
                    <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)", fontFamily: FONT }}>
                      Portfolio
                    </span>
                  </div>
                </div>

                {/* Close button — dùng SidebarToggleIcon */}
                <motion.button
                  onClick={() => setIsOpen(false)}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 rounded-xl flex-shrink-0"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <SidebarToggleIcon isOpen={true} />
                </motion.button>
              </motion.div>

              {/* ── Label ── */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="px-5 pt-5 pb-2 text-[10px] font-semibold tracking-widest uppercase"
                style={{ color: "rgba(255,255,255,0.2)", fontFamily: FONT }}
              >
                Điều hướng
              </motion.p>

              {/* ── Nav links ── */}
              <nav className="flex-1 px-3 pb-4 flex flex-col gap-1.5 overflow-y-auto">
                {NAV_LINKS.map((link, i) => {
                  const Icon  = link.icon;
                  const isAct = active === link.href;
                  const isHov = hovered === link.href;

                  return (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 + i * 0.04, type: "tween", duration: 0.18, ease: "easeOut" }}
                    >
                      <motion.a
                        href={link.href}
                        onClick={(e) => handleNavClick(e, link.href)}
                        onMouseEnter={() => setHovered(link.href)}
                        onMouseLeave={() => setHovered(null)}
                        whileTap={{ scale: 0.97 }}
                        className="relative flex items-center gap-3 px-3 py-3 cursor-pointer select-none overflow-hidden"
                        style={{
                          borderRadius: 16,
                          background: isAct
                            ? "rgba(255,255,255,0.1)"
                            : isHov
                            ? "rgba(255,255,255,0.055)"
                            : "transparent",
                          border: isAct
                            ? "1px solid rgba(255,255,255,0.14)"
                            : "1px solid transparent",
                          transition: "background 0.22s ease, border-color 0.22s ease",
                          boxShadow: isAct
                            ? "0 2px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)"
                            : "none",
                        }}
                      >
                        {/* Active accent glow */}
                        <AnimatePresence>
                          {isAct && (
                            <motion.div
                              key="glow"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              style={{
                                position: "absolute", inset: 0, borderRadius: 16,
                                background: `radial-gradient(ellipse at 20% 50%, ${link.accent.replace("0.7", "0.08")} 0%, transparent 70%)`,
                                pointerEvents: "none",
                              }}
                            />
                          )}
                        </AnimatePresence>

                        {/* Active indicator bar */}
                        <AnimatePresence>
                          {isAct && (
                            <motion.div
                              layoutId="activeBar"
                              initial={{ scaleY: 0, opacity: 0 }}
                              animate={{ scaleY: 1, opacity: 1 }}
                              exit={{ scaleY: 0, opacity: 0 }}
                              transition={{ type: "spring", stiffness: 400, damping: 28 }}
                              style={{
                                position: "absolute", left: 0, top: "20%", bottom: "20%",
                                width: 3, borderRadius: "0 3px 3px 0",
                                background: link.accent,
                                boxShadow: `0 0 12px ${link.accent}`,
                              }}
                            />
                          )}
                        </AnimatePresence>

                        {/* Icon box */}
                        <motion.div
                          animate={isAct ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                          transition={{ duration: 2.5, repeat: isAct ? Infinity : 0, ease: "easeInOut" }}
                          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{
                            background: isAct
                              ? "rgba(255,255,255,0.13)"
                              : "rgba(255,255,255,0.05)",
                            border: isAct
                              ? `1px solid rgba(255,255,255,0.18)`
                              : "1px solid rgba(255,255,255,0.07)",
                            boxShadow: isAct
                              ? `0 0 16px ${link.accent.replace("0.7", "0.2")}, inset 0 1px 0 rgba(255,255,255,0.12)`
                              : "none",
                            transition: "all 0.25s ease",
                          }}
                        >
                          <Icon
                            className="w-4 h-4"
                            style={{ color: isAct ? link.accent : "rgba(255,255,255,0.38)", transition: "color 0.22s ease" }}
                          />
                        </motion.div>

                        {/* Label */}
                        <span
                          className="text-sm font-medium flex-1"
                          style={{
                            color: isAct ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.5)",
                            fontFamily: FONT,
                            letterSpacing: "-0.01em",
                            transition: "color 0.22s ease",
                          }}
                        >
                          {link.name}
                        </span>

                        {/* Active dot */}
                        <AnimatePresence>
                          {isAct && (
                            <motion.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              transition={{ type: "spring", stiffness: 500, damping: 22 }}
                              style={{
                                width: 6, height: 6, borderRadius: "50%",
                                background: link.accent,
                                boxShadow: `0 0 8px ${link.accent}`,
                                flexShrink: 0,
                              }}
                            />
                          )}
                        </AnimatePresence>

                        {/* Hover shimmer */}
                        <AnimatePresence>
                          {isHov && !isAct && (
                            <motion.div
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 10 }}
                              transition={{ duration: 0.18 }}
                              style={{
                                position: "absolute", inset: 0, borderRadius: 16,
                                background: "linear-gradient(90deg, rgba(255,255,255,0.03) 0%, transparent 70%)",
                                pointerEvents: "none",
                              }}
                            />
                          )}
                        </AnimatePresence>
                      </motion.a>
                    </motion.div>
                  );
                })}
              </nav>

              {/* ── Footer ── */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.18 }}
                className="px-5 py-5 flex-shrink-0"
                style={{
                  borderTop: "1px solid rgba(255,255,255,0.07)",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  {[
                    { color: "#ff5f57", size: 9 },
                    { color: "#febc2e", size: 9 },
                    { color: "#28c840", size: 9 },
                  ].map((dot, i) => (
                    <motion.div
                      key={i}
                      whileHover={{ scale: 1.4 }}
                      style={{
                        width: dot.size, height: dot.size,
                        borderRadius: "50%",
                        background: dot.color,
                        opacity: 0.6,
                        cursor: "default",
                        boxShadow: `0 0 6px ${dot.color}55`,
                      }}
                    />
                  ))}
                </div>
                <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.18)", fontFamily: FONT }}>
                  © 2026 Phan Trọng Khang
                </p>
              </motion.div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
