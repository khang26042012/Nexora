import { useState, useEffect, useCallback } from "react";
import { Home, Wrench, MessageCircle, FolderKanban, ChevronDown, LucideIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import avatarImg from "@/assets/avatar_new.jpg";
import avatarVideo from "@/assets/avatar-gojo.mp4";

const FONT = "'Plus Jakarta Sans', sans-serif";

type NavChild = { name: string; href: string; external?: boolean };
type NavItem = {
  name: string;
  href?: string;
  icon: LucideIcon;
  accent: string;
  children?: NavChild[];
};

const NAV_LINKS: NavItem[] = [
  { name: "Trang chủ", href: "/",     icon: Home,          accent: "rgba(180,220,255,0.7)" },
  { name: "Tool",       href: "/tool", icon: Wrench,        accent: "rgba(180,255,210,0.7)" },
  { name: "Chat Bot",   href: "/chat", icon: MessageCircle, accent: "rgba(220,180,255,0.7)" },
  { name: "Project",    href: "/project", icon: FolderKanban,  accent: "rgba(255,210,160,0.7)" },
];

function getActiveFromLocation(loc: string): string {
  if (loc.startsWith("/chat")) return "/chat";
  if (loc.startsWith("/tool")) return "/tool";
  if (loc.startsWith("/project")) return "/project";
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
  const [isOpen, setIsOpen]       = useState(false);
  const [location, navigate]      = useLocation();
  const [active, setActive]       = useState(() => getActiveFromLocation(location));
  const [hovered, setHovered]     = useState<string | null>(null);
  const [expanded, setExpanded]   = useState<string | null>(null);

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

  const handleChildClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, child: NavChild) => {
      e.preventDefault();
      if (child.external) {
        setIsOpen(false);
        window.location.href = child.href;
      } else {
        setIsOpen(false);
        navigate(child.href);
      }
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
          animate={{ opacity: isOpen ? 0 : 1, scale: isOpen ? 0.8 : 1 }}
          transition={{ duration: 0.18 }}
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.14)",
            backdropFilter: "blur(16px)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
            pointerEvents: isOpen ? "none" : "auto",
          }}
          aria-label="Mở menu"
        >
          <SidebarToggleIcon isOpen={false} />
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
              {/* ── Video background ── */}
              <video
                src="https://raw.githubusercontent.com/khang26042012/Nexora/main/public/sidebar-bg.mp4"
                autoPlay muted loop playsInline
                style={{
                  position: "absolute", inset: 0, width: "100%", height: "100%",
                  objectFit: "cover", objectPosition: "center",
                  opacity: 0.18, pointerEvents: "none", zIndex: 0,
                }}
              />
              {/* ── Overlay tối phủ lên video ── */}
              <div
                style={{
                  position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
                  background: "rgba(14,14,16,0.72)",
                }}
              />

              {/* ── Header ── */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
                className="relative px-5 py-5 flex items-center justify-between flex-shrink-0"
                style={{ borderBottom: "none", zIndex: 2 }}
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
                      <video
                        src={avatarVideo}
                        poster={avatarImg}
                        width={44}
                        height={44}
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="auto"
                        aria-label="Phan Trọng Khang"
                        className="w-full h-full object-cover"
                        style={{ display: "block" }}
                      />
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
                style={{ color: "rgba(255,255,255,0.2)", fontFamily: FONT, position: "relative", zIndex: 2 }}
              >
                Điều hướng
              </motion.p>

              {/* ── Nav links ── */}
              <nav className="flex-1 px-4 pt-3 pb-4 flex flex-col gap-2.5 overflow-y-auto" style={{ position: "relative", zIndex: 2 }}>
                {NAV_LINKS.map((link, i) => {
                  const Icon = link.icon;
                  const hasChildren = !!link.children;
                  const isAct = !hasChildren && active === link.href;
                  const isHov = hovered === link.name;
                  const isExp = expanded === link.name;

                  if (hasChildren) {
                    return (
                      <motion.div
                        key={link.name}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.04 + i * 0.04, duration: 0.18, ease: "easeOut" }}
                        className="flex flex-col"
                      >
                        <motion.button
                          type="button"
                          onClick={() => setExpanded(isExp ? null : link.name)}
                          onMouseEnter={() => setHovered(link.name)}
                          onMouseLeave={() => setHovered(null)}
                          whileTap={{ scale: 0.97 }}
                          className="flex items-center justify-center gap-2.5 py-3.5 px-5 cursor-pointer select-none"
                          style={{
                            borderRadius: 9999,
                            background: isExp
                              ? "rgba(255,255,255,0.1)"
                              : isHov
                              ? "rgba(255,255,255,0.07)"
                              : "rgba(255,255,255,0.04)",
                            border: isExp
                              ? "1px solid rgba(255,255,255,0.18)"
                              : "1px solid rgba(255,255,255,0.09)",
                            transition: "background 0.18s ease, border-color 0.18s ease",
                          }}
                        >
                          <Icon
                            size={17}
                            style={{
                              color: isExp ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.45)",
                              transition: "color 0.18s ease",
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              fontSize: 15,
                              fontWeight: isExp ? 600 : 400,
                              color: isExp ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.5)",
                              fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
                              letterSpacing: "-0.01em",
                              transition: "color 0.18s ease, font-weight 0.18s ease",
                            }}
                          >
                            {link.name}
                          </span>
                          <motion.span
                            animate={{ rotate: isExp ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                            style={{ display: "inline-flex", marginLeft: 2 }}
                          >
                            <ChevronDown size={14} style={{ color: "rgba(255,255,255,0.45)" }} />
                          </motion.span>
                        </motion.button>

                        <AnimatePresence initial={false}>
                          {isExp && (
                            <motion.div
                              key="children"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.22, ease: "easeOut" }}
                              style={{ overflow: "hidden" }}
                            >
                              <div className="flex flex-col gap-1.5 mt-2 px-2">
                                {link.children!.map((child) => {
                                  const childKey = `${link.name}::${child.name}`;
                                  const childHov = hovered === childKey;
                                  return (
                                    <motion.a
                                      key={child.name}
                                      href={child.href}
                                      onClick={(e) => handleChildClick(e, child)}
                                      onMouseEnter={() => setHovered(childKey)}
                                      onMouseLeave={() => setHovered(null)}
                                      whileTap={{ scale: 0.97 }}
                                      className="flex items-center gap-2 py-2.5 pl-6 pr-4 cursor-pointer select-none"
                                      style={{
                                        borderRadius: 9999,
                                        background: childHov
                                          ? "rgba(255,255,255,0.06)"
                                          : "rgba(255,255,255,0.025)",
                                        border: "1px solid rgba(255,255,255,0.07)",
                                        transition: "background 0.18s ease",
                                      }}
                                      target={child.external ? "_self" : undefined}
                                      rel={child.external ? "noopener" : undefined}
                                    >
                                      <span
                                        style={{
                                          width: 5, height: 5, borderRadius: "50%",
                                          background: link.accent,
                                          flexShrink: 0,
                                          boxShadow: `0 0 6px ${link.accent}`,
                                        }}
                                      />
                                      <span
                                        style={{
                                          fontSize: 13.5,
                                          fontWeight: 400,
                                          color: childHov ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.55)",
                                          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
                                          letterSpacing: "-0.01em",
                                          transition: "color 0.18s ease",
                                        }}
                                      >
                                        {child.name}
                                      </span>
                                    </motion.a>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  }

                  return (
                    <motion.a
                      key={link.href}
                      href={link.href}
                      onClick={(e) => handleNavClick(e, link.href!)}
                      onMouseEnter={() => setHovered(link.name)}
                      onMouseLeave={() => setHovered(null)}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.04 + i * 0.04, duration: 0.18, ease: "easeOut" }}
                      whileTap={{ scale: 0.97 }}
                      className="flex items-center justify-center gap-2.5 py-3.5 px-5 cursor-pointer select-none"
                      style={{
                        borderRadius: 9999,
                        background: isAct
                          ? "rgba(255,255,255,0.13)"
                          : isHov
                          ? "rgba(255,255,255,0.07)"
                          : "rgba(255,255,255,0.04)",
                        border: isAct
                          ? "1px solid rgba(255,255,255,0.22)"
                          : "1px solid rgba(255,255,255,0.09)",
                        transition: "background 0.18s ease, border-color 0.18s ease",
                      }}
                    >
                      <Icon
                        size={17}
                        style={{
                          color: isAct ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.45)",
                          transition: "color 0.18s ease",
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 15,
                          fontWeight: isAct ? 600 : 400,
                          color: isAct ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.5)",
                          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
                          letterSpacing: "-0.01em",
                          transition: "color 0.18s ease, font-weight 0.18s ease",
                        }}
                      >
                        {link.name}
                      </span>
                    </motion.a>
                  );
                })}
              </nav>

            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
