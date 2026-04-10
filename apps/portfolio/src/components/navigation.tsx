import { useState, useEffect, useCallback } from "react";
import { Menu, X, Home, User, Clock, FolderOpen, Mail, Wrench, LucideIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import avatarImg from "@/assets/avatar_new.jpg";

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

/* ── Spin Ring — CSS only (GPU composited, không xoay DOM) ── */
function SpinRing({ inset, duration, reverse = false, opacity = 0.5, dashed = false }: {
  inset: number; duration: number; reverse?: boolean; opacity?: number; dashed?: boolean;
}) {
  return (
    <div
      className={reverse ? "ring-ccw" : "ring-cw"}
      style={{
        position: "absolute",
        inset,
        borderRadius: "50%",
        border: dashed
          ? `1px dashed rgba(255,255,255,${opacity})`
          : `1.5px solid transparent`,
        borderTopColor: dashed ? undefined : `rgba(255,255,255,${opacity})`,
        borderRightColor: dashed ? undefined : `rgba(255,255,255,${opacity * 0.3})`,
        pointerEvents: "none",
        "--ring-speed": `${duration}s`,
      } as React.CSSProperties}
    />
  );
}

/* ── Animated Border Item — đường sáng chạy theo viền (mask-composite) ── */
function AnimBorderItem({
  children, speed = 4, color = "rgba(255,255,255,0.85)", radius = 12, isActive = false,
  style: extraStyle = {}, className = "",
}: {
  children: React.ReactNode; speed?: number; color?: string;
  radius?: number; isActive?: boolean; style?: React.CSSProperties; className?: string;
}) {
  return (
    <div
      className={`running-border ${className}`}
      style={{
        "--rb-speed": isActive ? `${speed}s` : `${speed * 2}s`,
        "--rb-color": color,
        "--rb-radius": `${radius}px`,
        ...extraStyle,
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

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
        <motion.button
          onClick={() => setIsOpen(true)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.93 }}
          className="pointer-events-auto relative p-2.5 rounded-xl transition-all duration-200"
          style={{
            background: "rgba(0,0,0,0.55)",
            border: "1px solid rgba(255,255,255,0.14)",
            backdropFilter: "blur(10px)",
          }}
          aria-label="Mở menu"
        >
          <Menu className="w-5 h-5 text-white/70" />
        </motion.button>
      </motion.header>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-50"
              style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
            />

            {/* Sidebar */}
            <motion.aside
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 240 }}
              className="fixed top-0 left-0 bottom-0 w-72 max-w-[82vw] z-50 flex flex-col overflow-hidden"
              style={{
                background: "#080808",
                borderRight: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "8px 0 50px rgba(0,0,0,0.8)",
                fontFamily: FONT,
              }}
            >
              {/* Top glow orb */}
              <motion.div
                animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.15, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-0 left-0 w-56 h-56 pointer-events-none"
                style={{ background: "radial-gradient(ellipse at 0% 0%, rgba(255,255,255,0.04) 0%, transparent 70%)" }}
              />

              {/* Header with animated avatar */}
              <div
                className="relative px-5 h-20 flex items-center justify-between flex-shrink-0"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
              >
                <motion.div
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                  className="flex items-center gap-3"
                >
                  {/* Animated avatar */}
                  <div style={{ position: "relative", width: 40, height: 40 }}>
                    <SpinRing inset={-8} duration={20} reverse opacity={0.15} dashed />
                    <SpinRing inset={-4} duration={7} opacity={0.55} />
                    <motion.div
                      animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.55, 0.3] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      style={{
                        position: "absolute", inset: -3, borderRadius: "50%",
                        boxShadow: "0 0 16px 3px rgba(255,255,255,0.12)",
                        pointerEvents: "none",
                      }}
                    />
                    <div
                      style={{
                        width: 40, height: 40, borderRadius: "50%", overflow: "hidden",
                        border: "2px solid rgba(255,255,255,0.2)",
                        boxShadow: "0 0 20px rgba(255,255,255,0.08)",
                      }}
                    >
                      <img src={avatarImg} alt="Phan Trọng Khang" className="w-full h-full object-cover" />
                    </div>
                    {/* Online dot */}
                    <motion.div
                      animate={{ scale: [1, 1.2, 1], opacity: [1, 0.6, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      style={{
                        position: "absolute", bottom: 1, right: 1,
                        width: 9, height: 9, borderRadius: "50%",
                        background: "#34d399", border: "1.5px solid #080808",
                      }}
                    />
                  </div>

                  <motion.span
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.18, duration: 0.4 }}
                    className="text-sm font-semibold text-white/65"
                    style={{ fontFamily: FONT }}
                  >
                    Phan Trọng Khang
                  </motion.span>
                </motion.div>

                <motion.button
                  onClick={() => setIsOpen(false)}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  className="p-2 rounded-xl transition-all duration-150"
                  style={{ border: "1px solid rgba(255,255,255,0.09)" }}
                >
                  <X className="w-4 h-4 text-white/45" />
                </motion.button>
              </div>

              {/* Nav links */}
              <nav className="flex-1 px-3 py-5 flex flex-col gap-1.5 overflow-y-auto">
                {NAV_LINKS.map((link, i) => {
                  const Icon = link.icon;
                  const isActive = active === link.href;
                  return (
                    <motion.div
                      key={link.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.06 + i * 0.055, type: "spring", stiffness: 300, damping: 24 }}
                    >
                      {isActive ? (
                      <AnimBorderItem
                        speed={4 + i * 0.5}
                        color="rgba(255,255,255,0.45)"
                        radius={12}
                        isActive={true}
                      >
                        <motion.a
                          href={link.href}
                          onClick={(e) => handleNavClick(e, link.href, link.route)}
                          whileHover={{ x: 3 }}
                          whileTap={{ scale: 0.97 }}
                          transition={{ type: "spring", stiffness: 400, damping: 20 }}
                          className="relative flex items-center gap-3 px-3 py-3 rounded-[11px] transition-all duration-150 cursor-pointer"
                          style={{
                            background: isActive ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.01)",
                          }}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="activeBar"
                              className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-white/70"
                            />
                          )}

                          <motion.div
                            whileHover={{ scale: 1.12, rotate: isActive ? 0 : 8 }}
                            transition={{ type: "spring", stiffness: 400, damping: 15 }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{
                              background: isActive ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
                              border: isActive ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(255,255,255,0.07)",
                            }}
                          >
                            <Icon
                              className="w-4 h-4"
                              style={{ color: isActive ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.40)" }}
                            />
                          </motion.div>

                          <span
                            className="text-sm font-medium flex-1"
                            style={{ color: isActive ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.55)" }}
                          >
                            {link.name}
                          </span>

                          {isActive && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-1.5 h-1.5 rounded-full bg-white/50"
                            />
                          )}
                        </motion.a>
                      </AnimBorderItem>
                      ) : (
                        <motion.a
                          href={link.href}
                          onClick={(e) => handleNavClick(e, link.href, link.route)}
                          whileHover={{ x: 3 }}
                          whileTap={{ scale: 0.97 }}
                          transition={{ type: "spring", stiffness: 400, damping: 20 }}
                          className="relative flex items-center gap-3 px-3 py-3 rounded-[11px] transition-all duration-150 cursor-pointer"
                          style={{ background: "rgba(255,255,255,0.01)", borderRadius: 12 }}
                        >
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                          >
                            <Icon className="w-4 h-4" style={{ color: "rgba(255,255,255,0.40)" }} />
                          </div>
                          <span className="text-sm font-medium flex-1" style={{ color: "rgba(255,255,255,0.55)" }}>
                            {link.name}
                          </span>
                        </motion.a>
                      )}
                    </motion.div>
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
                    <motion.div
                      key={idx}
                      animate={{ opacity: [op, op * 2, op] }}
                      transition={{ duration: 2, repeat: Infinity, delay: idx * 0.4 }}
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
