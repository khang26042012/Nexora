import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"loading" | "done">("loading");

  useEffect(() => {
    let current = 0;
    const tick = setInterval(() => {
      current += Math.random() * 14 + 4;
      if (current >= 100) {
        current = 100;
        clearInterval(tick);
        setProgress(100);
        setTimeout(() => {
          setPhase("done");
          setTimeout(onDone, 700);
        }, 300);
      } else {
        setProgress(Math.floor(current));
      }
    }, 80);
    return () => clearInterval(tick);
  }, [onDone]);

  const RUNE_COUNT = 12;
  const RING_RADII = [48, 72, 96];

  return (
    <AnimatePresence>
      {phase === "loading" && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none"
          style={{ background: "radial-gradient(ellipse at 50% 40%, #0a0028 0%, #04000f 55%, #000000 100%)" }}
        >
          {/* Ambient glow */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: "radial-gradient(ellipse at 50% 50%, rgba(100,0,255,0.08) 0%, transparent 65%)"
          }} />

          {/* Rune portal animation */}
          <div className="relative flex items-center justify-center mb-10" style={{ width: 220, height: 220 }}>
            {/* Outer glow */}
            <div className="absolute inset-0 rounded-full" style={{
              background: "radial-gradient(ellipse, rgba(120,0,255,0.12) 0%, transparent 70%)",
              filter: "blur(20px)",
            }} />

            {/* Rotating rings with rune dots */}
            {RING_RADII.map((r, ri) => (
              <motion.div
                key={ri}
                className="absolute rounded-full border"
                style={{
                  width: r * 2,
                  height: r * 2,
                  borderColor: `rgba(${ri === 0 ? "180,80,255" : ri === 1 ? "80,120,255" : "120,40,255"},0.25)`,
                  top: "50%", left: "50%",
                  transform: "translate(-50%,-50%)",
                }}
                animate={{ rotate: ri % 2 === 0 ? 360 : -360 }}
                transition={{ duration: 8 + ri * 4, repeat: Infinity, ease: "linear" }}
              >
                {Array.from({ length: RUNE_COUNT }).map((_, di) => {
                  const angle = (di / RUNE_COUNT) * 360;
                  const isLit = di % 3 === 0;
                  return (
                    <div
                      key={di}
                      className="absolute rounded-full"
                      style={{
                        width: isLit ? 5 : 3,
                        height: isLit ? 5 : 3,
                        background: isLit
                          ? `rgba(${ri === 0 ? "200,100,255" : ri === 1 ? "100,160,255" : "160,80,255"},0.9)`
                          : "rgba(180,100,255,0.3)",
                        top: "50%",
                        left: "50%",
                        transform: `rotate(${angle}deg) translateY(-${r}px) translate(-50%,-50%)`,
                        boxShadow: isLit ? `0 0 6px rgba(160,80,255,0.8)` : "none",
                      }}
                    />
                  );
                })}
              </motion.div>
            ))}

            {/* Core pulse */}
            <motion.div
              className="relative rounded-full"
              style={{ width: 64, height: 64 }}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="absolute inset-0 rounded-full" style={{
                background: "radial-gradient(ellipse, rgba(140,60,255,0.55) 0%, rgba(80,20,200,0.3) 50%, transparent 80%)",
                filter: "blur(4px)",
              }} />
              <div className="absolute inset-3 rounded-full" style={{
                background: "radial-gradient(ellipse, rgba(200,120,255,0.8) 0%, rgba(120,40,255,0.6) 60%, transparent 90%)",
              }} />
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ border: "1px solid rgba(200,120,255,0.5)" }}
                animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
              />
            </motion.div>
          </div>

          {/* Brand */}
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <h1 className="text-2xl font-black tracking-[0.12em] mb-1" style={{
              background: "linear-gradient(135deg, #cc88ff 0%, #6644ff 50%, #00aaff 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              NEXORA X
            </h1>
            <p className="text-xs tracking-[0.25em] uppercase font-mono" style={{ color: "rgba(160,100,255,0.6)" }}>
              Phan Trọng Khang
            </p>
          </motion.div>

          {/* Progress bar */}
          <div className="w-52">
            <div className="h-px rounded-full overflow-hidden mb-2" style={{ background: "rgba(120,60,255,0.15)" }}>
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: "linear-gradient(90deg, #5500ff, #aa44ff, #00aaff)",
                  width: `${progress}%`,
                  boxShadow: "0 0 8px rgba(160,80,255,0.8)",
                }}
                transition={{ ease: "easeOut" }}
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-mono tracking-widest" style={{ color: "rgba(160,100,255,0.4)" }}>
                INITIALIZING
              </span>
              <span className="text-[10px] font-mono" style={{ color: "rgba(160,100,255,0.5)" }}>
                {progress}%
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
