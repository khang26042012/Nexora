import { Navigation } from "@/components/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, Copy, Download, QrCode, CheckCircle2, AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import QRCode from "qrcode";

const FONT = "'Plus Jakarta Sans', sans-serif";

function AnimBorderCard({
  children, speed = 4, color = "rgba(255,255,255,0.85)",
  radius = 16, innerStyle = {}, className = "",
}: {
  children: React.ReactNode; speed?: number; color?: string;
  radius?: number; innerStyle?: React.CSSProperties; className?: string;
}) {
  return (
    <div
      className={`running-border ${className}`}
      style={{
        "--rb-speed": `${speed}s`,
        "--rb-color": color,
        "--rb-radius": `${radius}px`,
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        ...innerStyle,
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

const SIZES = [128, 256, 512] as const;
type QrSize = typeof SIZES[number];

const ERROR_LEVELS = ["L", "M", "Q", "H"] as const;
type ErrLevel = typeof ERROR_LEVELS[number];

const ERROR_LABELS: Record<ErrLevel, string> = {
  L: "Thấp (7%)", M: "Trung bình (15%)", Q: "Cao (25%)", H: "Rất cao (30%)",
};

export function QRGenerator() {
  const [, navigate] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [text, setText] = useState("");
  const [size, setSize] = useState<QrSize>(256);
  const [fgColor, setFgColor] = useState("#ffffff");
  const [bgColor, setBgColor] = useState("#050505");
  const [errLevel, setErrLevel] = useState<ErrLevel>("M");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [hasQR, setHasQR] = useState(false);

  const generate = useCallback(async (val: string) => {
    if (!val.trim() || !canvasRef.current) { setHasQR(false); return; }
    setError("");
    try {
      await QRCode.toCanvas(canvasRef.current, val.trim(), {
        width: size,
        margin: 2,
        color: { dark: fgColor, light: bgColor },
        errorCorrectionLevel: errLevel,
      });
      setHasQR(true);
    } catch (e) {
      setError("Không thể tạo QR — nội dung quá dài hoặc không hợp lệ.");
      setHasQR(false);
    }
  }, [size, fgColor, bgColor, errLevel]);

  useEffect(() => { generate(text); }, [text, generate]);

  function download() {
    if (!canvasRef.current || !hasQR) return;
    const link = document.createElement("a");
    link.download = `nexora-qr-${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  }

  async function copyDataUrl() {
    if (!canvasRef.current || !hasQR) return;
    try {
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function reset() {
    setText("");
    setSize(256);
    setFgColor("#ffffff");
    setBgColor("#050505");
    setErrLevel("M");
    setHasQR(false);
    setError("");
  }

  return (
    <div className="min-h-screen" style={{ background: "#050505", fontFamily: FONT }}>
      <Navigation />

      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[60vw] h-[40vw] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(255,255,255,0.03) 0%, transparent 70%)" }} />
      </div>

      <div className="relative max-w-2xl mx-auto px-5 pt-28 pb-20" style={{ zIndex: 1 }}>

        {/* Back */}
        <motion.button
          initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate("/tool")}
          className="flex items-center gap-2 mb-8 text-sm transition-colors"
          style={{ color: "rgba(255,255,255,0.35)" }}
          whileHover={{ color: "rgba(255,255,255,0.7)" }}
        >
          <ArrowLeft size={15} /> Quay lại Tool
        </motion.button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)" }}>
              <QrCode size={20} style={{ color: "rgba(255,255,255,0.8)" }} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">QR Generator</h1>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.38)" }}>
                Tạo mã QR từ văn bản hoặc đường dẫn, tùy chỉnh màu sắc và tải về PNG
              </p>
            </div>
          </div>
        </motion.div>

        {/* Input */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-4"
        >
          <AnimBorderCard speed={5} color="rgba(255,255,255,0.6)" radius={16}
            innerStyle={{ padding: "1.25rem" }}>
            <label className="block text-xs font-semibold mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>
              Nội dung QR
            </label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Nhập URL, văn bản, số điện thoại, email..."
              rows={3}
              className="w-full resize-none text-sm text-white/80 outline-none rounded-xl px-3 py-2.5"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                fontFamily: FONT,
                caretColor: "rgba(255,255,255,0.7)",
              }}
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
                {text.length} ký tự
              </span>
              {text && (
                <button onClick={reset}
                  className="text-xs flex items-center gap-1 transition-colors"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}>
                  <RefreshCw size={11} /> Xoá
                </button>
              )}
            </div>
          </AnimBorderCard>
        </motion.div>

        {/* Options */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6"
        >
          <AnimBorderCard speed={7} color="rgba(255,255,255,0.4)" radius={16}
            innerStyle={{ padding: "1.25rem" }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Size */}
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Kích thước (px)
                </label>
                <div className="flex gap-2">
                  {SIZES.map(s => (
                    <button key={s} onClick={() => setSize(s)}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all border"
                      style={{
                        background: size === s ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
                        borderColor: size === s ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.08)",
                        color: size === s ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)",
                      }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error correction */}
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Mức sửa lỗi
                </label>
                <div className="flex gap-1 flex-wrap">
                  {ERROR_LEVELS.map(l => (
                    <button key={l} onClick={() => setErrLevel(l)}
                      className="px-3 py-2 rounded-xl text-xs font-semibold transition-all border"
                      title={ERROR_LABELS[l]}
                      style={{
                        background: errLevel === l ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
                        borderColor: errLevel === l ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.08)",
                        color: errLevel === l ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)",
                      }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fg color */}
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Màu QR
                </label>
                <div className="flex items-center gap-3">
                  <input type="color" value={fgColor} onChange={e => setFgColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border-0 outline-none"
                    style={{ background: "transparent", padding: 0 }} />
                  <span className="text-sm font-mono" style={{ color: "rgba(255,255,255,0.5)" }}>
                    {fgColor.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Bg color */}
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Màu nền
                </label>
                <div className="flex items-center gap-3">
                  <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border-0 outline-none"
                    style={{ background: "transparent", padding: 0 }} />
                  <span className="text-sm font-mono" style={{ color: "rgba(255,255,255,0.5)" }}>
                    {bgColor.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </AnimBorderCard>
        </motion.div>

        {/* Preview + Actions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <AnimBorderCard speed={4} color="rgba(255,255,255,0.7)" radius={18}
            innerStyle={{ padding: "1.5rem" }}>

            {/* Canvas preview */}
            <div className="flex flex-col items-center gap-5">
              <div className="relative rounded-2xl overflow-hidden flex items-center justify-center"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  minWidth: 200, minHeight: 200,
                }}>
                <canvas
                  ref={canvasRef}
                  className="rounded-xl"
                  style={{
                    display: hasQR ? "block" : "none",
                    maxWidth: "100%",
                    imageRendering: "pixelated",
                  }}
                />
                {!hasQR && (
                  <div className="flex flex-col items-center gap-3 py-12 px-8">
                    <QrCode size={40} style={{ color: "rgba(255,255,255,0.12)" }} />
                    <p className="text-sm text-center" style={{ color: "rgba(255,255,255,0.25)" }}>
                      Nhập nội dung để tạo QR
                    </p>
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              {/* Action buttons */}
              {hasQR && (
                <div className="flex gap-3 w-full justify-center flex-wrap">
                  <button onClick={copyDataUrl}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border"
                    style={{
                      background: copied ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.07)",
                      borderColor: copied ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.12)",
                      color: copied ? "rgba(34,197,94,0.9)" : "rgba(255,255,255,0.7)",
                    }}>
                    {copied ? <CheckCircle2 size={15} /> : <Copy size={15} />}
                    {copied ? "Đã sao chép" : "Sao chép ảnh"}
                  </button>

                  <button onClick={download}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border"
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      borderColor: "rgba(255,255,255,0.12)",
                      color: "rgba(255,255,255,0.7)",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.12)";
                      e.currentTarget.style.color = "rgba(255,255,255,0.9)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                      e.currentTarget.style.color = "rgba(255,255,255,0.7)";
                    }}>
                    <Download size={15} /> Tải PNG
                  </button>
                </div>
              )}
            </div>
          </AnimBorderCard>
        </motion.div>
      </div>
    </div>
  );
}
