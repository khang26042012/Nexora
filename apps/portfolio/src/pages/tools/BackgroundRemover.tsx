import { Navigation } from "@/components/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Upload, Download, X, Loader2, Sparkles, ImageOff, CheckCircle2 } from "lucide-react";
import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { removeBackground } from "@imgly/background-removal";

const FONT = "'Plus Jakarta Sans', sans-serif";

function AnimBorderCard({ children, speed = 4, color = "rgba(255,255,255,0.85)", radius = 16, innerStyle = {}, className = "" }: {
  children: React.ReactNode; speed?: number; color?: string; radius?: number; innerStyle?: React.CSSProperties; className?: string;
}) {
  return (
    <div className={`running-border ${className}`} style={{ "--rb-speed": `${speed}s`, "--rb-color": color, "--rb-radius": `${radius}px`, background: "rgba(255,255,255,0.04)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", ...innerStyle } as React.CSSProperties}>
      {children}
    </div>
  );
}

type Stage = "idle" | "loading_model" | "processing" | "done" | "error";

const CHECKERS = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Crect width='8' height='8' fill='%23555'/%3E%3Crect x='8' y='8' width='8' height='8' fill='%23555'/%3E%3Crect x='8' y='0' width='8' height='8' fill='%23888'/%3E%3Crect x='0' y='8' width='8' height='8' fill='%23888'/%3E%3C/svg%3E")`;

export function BackgroundRemover() {
  const [, navigate] = useLocation();
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string>("");
  const [resultUrl, setResultUrl] = useState<string>("");
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [fileName, setFileName] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStage("idle"); setError(""); setPreview(""); setResultUrl(""); setResultBlob(null); setFileName(""); setProgress(0);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    if (preview) URL.revokeObjectURL(preview);
  };

  const process = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) { setError("Chỉ hỗ trợ file ảnh (JPG, PNG, WebP)"); setStage("error"); return; }
    if (file.size > 20 * 1024 * 1024) { setError("Ảnh tối đa 20MB"); setStage("error"); return; }

    setFileName(file.name.replace(/\.[^.]+$/, ""));
    setPreview(URL.createObjectURL(file));
    setResultUrl(""); setResultBlob(null); setError(""); setProgress(0);
    setStage("loading_model");

    try {
      const resultBlob = await removeBackground(file, {
        publicPath: `https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.4.5/dist/`,
        progress: (key: string, current: number, total: number) => {
          if (key === "compute:inference") {
            setStage("processing");
            setProgress(total > 0 ? Math.round((current / total) * 100) : 50);
          } else if (current < total) {
            setStage("loading_model");
            setProgress(Math.round((current / total) * 100));
          }
        },
      });
      const url = URL.createObjectURL(resultBlob);
      setResultUrl(url);
      setResultBlob(resultBlob);
      setStage("done");
      setProgress(100);
    } catch (e: any) {
      setError(e?.message ?? "Lỗi xử lý ảnh. Thử lại với ảnh khác.");
      setStage("error");
    }
  }, []);

  const handleFile = (file: File) => process(file);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const handleDownload = () => {
    if (!resultBlob) return;
    const link = document.createElement("a");
    link.href = resultUrl;
    link.download = `${fileName || "result"}_no_bg.png`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const isProcessing = stage === "loading_model" || stage === "processing";

  return (
    <div className="min-h-screen" style={{ background: "#050505", fontFamily: FONT }}>
      <Navigation />
      <div className="max-w-lg mx-auto px-4 py-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="mb-8">
          <button onClick={() => navigate("/tool")} className="flex items-center gap-2 text-sm mb-6 transition-colors"
            style={{ color: "rgba(255,255,255,0.35)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}>
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <ImageOff className="w-5 h-5 text-white/70" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Background Remover</h1>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>Xóa nền ảnh bằng AI — chạy hoàn toàn trên thiết bị</p>
            </div>
          </div>
        </motion.div>

        {/* Upload zone */}
        {stage === "idle" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <AnimBorderCard speed={5} color={dragging ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)"} radius={20}
              innerStyle={{ marginBottom: 16 }}>
              <div
                className="flex flex-col items-center justify-center py-14 px-6 text-center cursor-pointer transition-all"
                style={{ borderRadius: 19 }}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
              >
                <motion.div animate={dragging ? { scale: 1.15 } : { scale: 1 }} transition={{ type: "spring", stiffness: 300 }}>
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <Upload className="w-7 h-7" style={{ color: "rgba(255,255,255,0.5)" }} />
                  </div>
                </motion.div>
                <p className="text-base font-semibold text-white/80 mb-1">
                  {dragging ? "Thả ảnh vào đây" : "Kéo thả hoặc nhấn để chọn ảnh"}
                </p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>JPG, PNG, WebP · Tối đa 20MB</p>
              </div>
            </AnimBorderCard>

            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />

            <div className="flex flex-col gap-2 mt-4">
              {[
                { icon: "🤖", text: "AI chạy trực tiếp trên trình duyệt — không upload lên server" },
                { icon: "🪄", text: "Xuất file PNG trong suốt, dùng được ngay trên Canva, PowerPoint" },
                { icon: "🔒", text: "Ảnh của bạn không rời khỏi thiết bị" },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-start gap-2.5 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                  <span className="text-base leading-none">{icon}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Processing */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}>
              <AnimBorderCard speed={1.8} color="rgba(255,255,255,0.6)" radius={20} innerStyle={{ marginBottom: 16 }}>
                <div className="py-10 px-6 flex flex-col items-center gap-5">
                  {preview && (
                    <div className="relative w-40 h-40 rounded-2xl overflow-hidden"
                      style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                      <img src={preview} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center"
                        style={{ background: "rgba(5,5,5,0.65)", backdropFilter: "blur(4px)" }}>
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                      </div>
                    </div>
                  )}
                  <div className="w-full text-center">
                    <p className="font-semibold text-white mb-1">
                      {stage === "loading_model" ? "Đang tải mô hình AI..." : "Đang xử lý ảnh..."}
                    </p>
                    <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>
                      {stage === "loading_model"
                        ? "Lần đầu chạy sẽ mất ~15s để tải model, lần sau tức thì"
                        : "AI đang tách từng pixel..."}
                    </p>
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                      <motion.div className="h-full rounded-full" animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                        style={{ background: "linear-gradient(90deg, rgba(255,255,255,0.4), rgba(255,255,255,0.9))" }} />
                    </div>
                    <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.3)" }}>{progress}%</p>
                  </div>
                </div>
              </AnimBorderCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result */}
        <AnimatePresence>
          {stage === "done" && resultUrl && (
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>

              {/* Preview card */}
              <AnimBorderCard speed={4} color="rgba(255,255,255,0.4)" radius={20} innerStyle={{ marginBottom: 16 }}>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-semibold text-white/80">Tách nền thành công!</span>
                  </div>

                  {/* Before / After */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <p className="text-xs mb-1.5 text-center" style={{ color: "rgba(255,255,255,0.35)" }}>Gốc</p>
                      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                        <img src={preview} alt="before" className="w-full object-cover" style={{ aspectRatio: "1/1", objectFit: "cover" }} />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs mb-1.5 text-center" style={{ color: "rgba(255,255,255,0.35)" }}>Đã xóa nền</p>
                      <div className="rounded-xl overflow-hidden" style={{ backgroundImage: CHECKERS, backgroundSize: "16px 16px", border: "1px solid rgba(255,255,255,0.1)" }}>
                        <img src={resultUrl} alt="result" className="w-full object-cover" style={{ aspectRatio: "1/1", objectFit: "contain" }} />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-center" style={{ color: "rgba(255,255,255,0.25)" }}>
                    Ô vuông = trong suốt — hoàn hảo để paste vào Canva, PowerPoint
                  </p>
                </div>
              </AnimBorderCard>

              {/* Download */}
              <AnimBorderCard speed={3.5} color="rgba(52,211,153,0.7)" radius={14} innerStyle={{ marginBottom: 12 }}>
                <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                  onClick={handleDownload}
                  className="w-full flex items-center justify-center gap-2.5 py-4 rounded-[13px] text-base font-bold text-white"
                  style={{ background: "rgba(5,150,105,0.15)" }}>
                  <Download className="w-5 h-5" />
                  Tải PNG trong suốt
                </motion.button>
              </AnimBorderCard>

              {/* Try another */}
              <button onClick={reset}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm transition-all"
                style={{ color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.08)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.65)")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}>
                <Sparkles className="w-4 h-4" /> Xử lý ảnh khác
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {stage === "error" && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="rounded-2xl p-5 mb-4 flex items-start gap-3"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <X className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-400 mb-0.5">Có lỗi xảy ra</p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>{error}</p>
                </div>
              </div>
              <button onClick={reset}
                className="w-full py-3 rounded-2xl text-sm font-semibold text-white/60 transition-all"
                style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.9)")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}>
                Thử lại
              </button>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
