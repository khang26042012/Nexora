import { Navigation } from "@/components/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Youtube, ArrowLeft, Download, Search, Clock, User,
  CheckCircle2, AlertCircle, Film, Loader2
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/* ── Helpers ── */
function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function isYouTubeUrl(url: string) {
  return /youtube\.com\/watch|youtu\.be\//.test(url);
}

/* ── Quality badge colors ── */
const qualityColors: Record<string, string> = {
  "1080p": "#a78bfa",
  "720p": "#34d399",
  "480p": "#fbbf24",
  "360p": "#94a3b8",
  "Best": "#60a5fa",
};

type VideoInfo = {
  title: string;
  thumbnail: string;
  duration: number;
  channel: string;
  formats: { itag: string; quality: string; ext: string; size?: string; url: string }[];
};

/* ── Main Component ── */
export function YtDownloader() {
  const [, navigate] = useLocation();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState<VideoInfo | null>(null);
  const [selectedItag, setSelectedItag] = useState("");

  const handleFetch = async () => {
    if (!url.trim()) return;
    if (!isYouTubeUrl(url)) {
      setError("Link không hợp lệ. Vui lòng nhập link YouTube.");
      return;
    }
    setLoading(true);
    setError("");
    setInfo(null);
    setSelectedItag("");

    try {
      const res = await fetch(`${API_BASE}/api/yt/info?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lỗi không xác định");
      setInfo(data);
      if (data.formats?.length > 0) setSelectedItag(data.formats[0].itag);
    } catch (e: any) {
      setError(e.message ?? "Không lấy được thông tin video");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!info || !selectedItag) return;
    const fmt = info.formats.find(f => f.itag === selectedItag);
    if (!fmt) return;
    /* Mở URL Invidious proxy trực tiếp — trình duyệt tự tải xuống */
    const link = document.createElement("a");
    link.href = fmt.url;
    link.download = `${info.title}.${fmt.ext}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen" style={{ background: "#020008" }}>
      <Navigation />

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(255,68,68,0.05) 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 right-0 w-[40vw] h-[40vw] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(124,58,237,0.04) 0%, transparent 70%)" }} />
      </div>

      <div className="relative max-w-2xl mx-auto px-5 pt-28 pb-24">

        {/* Back button */}
        <motion.button
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          onClick={() => navigate("/tool")}
          className="flex items-center gap-2 mb-8 text-sm transition-colors duration-200"
          style={{ color: "rgba(255,255,255,0.4)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.8)")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại Tool Box
        </motion.button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(255,68,68,0.12)", border: "1px solid rgba(255,68,68,0.2)" }}>
              <Youtube className="w-5 h-5" style={{ color: "#ff4444" }} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">YouTube Downloader</h1>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                Tải video chất lượng cao · 1080p · 720p · 480p
              </p>
            </div>
          </div>
        </motion.div>

        {/* URL Input */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6"
        >
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Youtube className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: "rgba(255,68,68,0.5)" }} />
              <input
                type="text"
                placeholder="Dán link YouTube vào đây..."
                value={url}
                onChange={e => { setUrl(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && handleFetch()}
                className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm text-white/80 outline-none transition-all duration-200"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  caretColor: "#ff4444",
                }}
                onFocus={e => {
                  e.target.style.border = "1px solid rgba(255,68,68,0.4)";
                  e.target.style.background = "rgba(255,68,68,0.05)";
                }}
                onBlur={e => {
                  e.target.style.border = "1px solid rgba(255,255,255,0.08)";
                  e.target.style.background = "rgba(255,255,255,0.04)";
                }}
              />
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleFetch}
              disabled={loading || !url.trim()}
              className="flex items-center gap-2 px-5 py-3.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg, #ff4444 0%, #cc2222 100%)" }}
            >
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Search className="w-4 h-4" />}
              {loading ? "Đang tìm..." : "Tìm"}
            </motion.button>
          </div>
        </motion.div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-2.5 mb-6 px-4 py-3 rounded-xl text-sm"
              style={{ background: "rgba(255,68,68,0.08)", border: "1px solid rgba(255,68,68,0.2)", color: "#ff8080" }}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Video Info Card */}
        <AnimatePresence>
          {info && (
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Thumbnail + Meta */}
              <div className="rounded-2xl overflow-hidden mb-4"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>

                <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
                  <img
                    src={info.thumbnail}
                    alt={info.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0"
                    style={{ background: "linear-gradient(to top, rgba(2,0,8,0.8) 0%, transparent 50%)" }} />
                  {info.duration > 0 && (
                    <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-white"
                      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
                      <Clock className="w-3 h-3" />
                      {formatDuration(info.duration)}
                    </div>
                  )}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs"
                    style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", color: "rgba(255,255,255,0.7)" }}>
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                    Tìm thấy video
                  </div>
                </div>

                <div className="px-5 py-4">
                  <h2 className="text-base font-bold text-white leading-snug mb-2 line-clamp-2">
                    {info.title}
                  </h2>
                  <div className="flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                    <User className="w-3.5 h-3.5" />
                    <span className="text-xs">{info.channel}</span>
                  </div>
                </div>
              </div>

              {/* Quality Selection */}
              <div className="mb-4">
                <p className="text-xs font-semibold mb-3 tracking-wider uppercase"
                  style={{ color: "rgba(255,255,255,0.35)" }}>
                  Chọn chất lượng
                </p>
                <div className="flex flex-wrap gap-2">
                  {info.formats.map(f => {
                    const active = selectedItag === f.itag;
                    const color = qualityColors[f.quality] ?? "#60a5fa";
                    return (
                      <motion.button
                        key={f.itag}
                        whileTap={{ scale: 0.94 }}
                        onClick={() => setSelectedItag(f.itag)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
                        style={{
                          background: active ? `${color}18` : "rgba(255,255,255,0.04)",
                          border: active ? `1px solid ${color}50` : "1px solid rgba(255,255,255,0.08)",
                          color: active ? color : "rgba(255,255,255,0.5)",
                        }}
                      >
                        <Film className="w-3.5 h-3.5" />
                        {f.quality}
                        {f.size && (
                          <span className="text-[10px] opacity-60">{f.size}</span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Download Button */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleDownload}
                disabled={!selectedItag}
                className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl text-base font-bold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(135deg, #ff4444 0%, #cc2222 100%)",
                  boxShadow: "0 8px 32px rgba(255,68,68,0.3)",
                }}
              >
                <Download className="w-5 h-5" />
                Tải xuống
              </motion.button>

              <p className="text-center text-xs mt-3" style={{ color: "rgba(255,255,255,0.3)" }}>
                Video sẽ mở trong tab mới · nhấn tải xuống trong trình duyệt nếu cần
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {!loading && !info && !error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(255,68,68,0.06)", border: "1px solid rgba(255,68,68,0.1)" }}>
              <Youtube className="w-7 h-7" style={{ color: "rgba(255,68,68,0.4)" }} />
            </div>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.25)" }}>
              Dán link YouTube và nhấn Tìm để bắt đầu
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
