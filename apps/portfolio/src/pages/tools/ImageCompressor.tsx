import { Navigation } from "@/components/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Upload, Download, ImageDown, X, Loader2, AlertCircle } from "lucide-react";
import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { ToolVideoBg } from "@/components/ToolVideoBg";

const FONT = "'Plus Jakarta Sans', sans-serif";
const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

function AnimBorderCard({ children, speed = 4, color = "rgba(255,255,255,0.85)", radius = 16, innerStyle = {}, className = "" }: {
  children: React.ReactNode; speed?: number; color?: string; radius?: number; innerStyle?: React.CSSProperties; className?: string;
}) {
  return (
    <div className={`running-border ${className}`} style={{ "--rb-speed": `${speed}s`, "--rb-color": color, "--rb-radius": `${radius}px`, background: "rgba(255,255,255,0.04)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", ...innerStyle } as React.CSSProperties}>
      {children}
    </div>
  );
}

type Format = "webp" | "jpeg" | "png";
const FORMATS: { id: Format; label: string }[] = [
  { id: "webp", label: "WebP" },
  { id: "jpeg", label: "JPEG" },
  { id: "png", label: "PNG" },
];

function fmtSize(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

export function ImageCompressor() {
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [quality, setQuality] = useState(80);
  const [format, setFormat] = useState<Format>("webp");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ url: string; origSize: number; newSize: number; w: number; h: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  function handleFile(f: File) {
    if (!f.type.startsWith("image/")) { setError("Chỉ chấp nhận file ảnh (JPG, PNG, WebP, GIF...)"); return; }
    if (f.size > 20 * 1024 * 1024) { setError("File quá lớn — tối đa 20MB"); return; }
    setFile(f); setError(""); setResult(null);
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  async function compress() {
    if (!file) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("quality", quality.toString());
      fd.append("format", format);
      const res = await fetch(`${BASE}/api/compress`, { method: "POST", body: fd });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Lỗi server"); setLoading(false); return; }
      const origSize = parseInt(res.headers.get("X-Original-Size") ?? "0", 10);
      const newSize  = parseInt(res.headers.get("X-Compressed-Size") ?? "0", 10);
      const w = parseInt(res.headers.get("X-Width") ?? "0", 10);
      const h = parseInt(res.headers.get("X-Height") ?? "0", 10);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setResult({ url, origSize, newSize, w, h });
    } catch { setError("Không kết nối được server"); }
    finally { setLoading(false); }
  }

  function download() {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result.url; a.download = `compressed.${format}`; a.click();
  }

  function reset() { setFile(null); setPreview(""); setResult(null); setError(""); }

  const saving = result ? Math.round((1 - result.newSize / result.origSize) * 100) : 0;

  return (
    <div className="min-h-screen" style={{ background: "#050505", fontFamily: FONT }}>
      <ToolVideoBg />
      <Navigation />
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[60vw] h-[40vw] rounded-full" style={{ background: "radial-gradient(ellipse, rgba(255,255,255,0.03) 0%, transparent 70%)" }} />
      </div>

      <div className="relative max-w-2xl mx-auto px-5 pt-28 pb-20" style={{ zIndex: 1 }}>
        <motion.button initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} onClick={() => navigate("/tool")}
          className="flex items-center gap-2 mb-8 text-sm transition-colors" style={{ color: "rgba(255,255,255,0.35)" }}
          whileHover={{ color: "rgba(255,255,255,0.7)" }}>
          <ArrowLeft size={15} /> Quay lại Tool
        </motion.button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)" }}>
              <ImageDown size={20} style={{ color: "rgba(255,255,255,0.8)" }} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Image Compressor</h1>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.38)" }}>Nén ảnh giảm dung lượng — chọn chất lượng và định dạng, tải về ngay</p>
            </div>
          </div>
        </motion.div>

        {/* Upload */}
        {!file ? (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <AnimBorderCard speed={5} color={dragging ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.5)"} radius={18} innerStyle={{ padding: "0" }}>
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-4 py-16 px-8 cursor-pointer rounded-[17px] transition-all"
                style={{ background: dragging ? "rgba(255,255,255,0.07)" : "transparent" }}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
                  <Upload size={24} style={{ color: "rgba(255,255,255,0.5)" }} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-white/70">Kéo thả ảnh vào đây hoặc nhấn để chọn</p>
                  <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>JPG, PNG, WebP, GIF — tối đa 20MB</p>
                </div>
              </div>
            </AnimBorderCard>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Preview */}
            <AnimBorderCard speed={5} color="rgba(255,255,255,0.6)" radius={18} innerStyle={{ padding: "1rem" }}>
              <div className="flex items-start gap-4">
                <img src={preview} alt="" className="w-24 h-24 object-cover rounded-xl flex-shrink-0" style={{ border: "1px solid rgba(255,255,255,0.1)" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white/80 truncate">{file.name}</p>
                  <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>{fmtSize(file.size)} · {file.type}</p>
                  {result && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="text-xs px-2 py-1 rounded-lg" style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)" }}>
                        -{saving}% → {fmtSize(result.newSize)}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
                        {result.w}×{result.h}px
                      </span>
                    </div>
                  )}
                </div>
                <button onClick={reset} className="text-white/30 hover:text-white/70 transition-colors flex-shrink-0"><X size={18} /></button>
              </div>
            </AnimBorderCard>

            {/* Options */}
            <AnimBorderCard speed={7} color="rgba(255,255,255,0.4)" radius={16} innerStyle={{ padding: "1.25rem" }}>
              <div className="space-y-4">
                {/* Format */}
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>Định dạng xuất</label>
                  <div className="flex gap-2">
                    {FORMATS.map(f => (
                      <button key={f.id} onClick={() => setFormat(f.id)}
                        className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all border"
                        style={{ background: format === f.id ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)", borderColor: format === f.id ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.08)", color: format === f.id ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)" }}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Quality */}
                {format !== "png" && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>Chất lượng</label>
                      <span className="text-sm font-bold text-white">{quality}%</span>
                    </div>
                    <input type="range" min={10} max={100} value={quality} onChange={e => setQuality(+e.target.value)} className="w-full accent-white h-1 rounded-full" style={{ background: `linear-gradient(to right, rgba(255,255,255,0.7) ${quality}%, rgba(255,255,255,0.1) ${quality}%)` }} />
                    <div className="flex justify-between text-xs mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>
                      <span>Nén mạnh</span><span>Chất lượng cao</span>
                    </div>
                  </div>
                )}
              </div>
            </AnimBorderCard>

            {error && <div className="flex items-center gap-2 text-red-400 text-sm px-1"><AlertCircle size={14} />{error}</div>}

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={compress} disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                style={{ background: loading ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}>
                {loading ? <><Loader2 size={16} className="animate-spin" /> Đang nén...</> : <><ImageDown size={16} /> Nén ảnh</>}
              </button>
              {result && (
                <button onClick={download}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all"
                  style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.35)", color: "#4ade80" }}>
                  <Download size={16} /> Tải về
                </button>
              )}
            </div>

            {/* Compressed preview */}
            {result && (
              <AnimBorderCard speed={4} color="rgba(34,197,94,0.6)" radius={16} innerStyle={{ padding: "1rem" }}>
                <p className="text-xs font-semibold mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>Ảnh sau khi nén</p>
                <img src={result.url} alt="Compressed" className="w-full rounded-xl" style={{ border: "1px solid rgba(255,255,255,0.08)" }} />
              </AnimBorderCard>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
