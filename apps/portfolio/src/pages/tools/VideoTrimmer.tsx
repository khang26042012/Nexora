import { Navigation } from "@/components/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Scissors, Upload, Clock, Play, X, Film, AlertCircle, Download, Loader2, CheckCircle2 } from "lucide-react";
import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { ToolVideoBg } from "@/components/ToolVideoBg";

const FONT = "'Inter', sans-serif";
const MAX_MB = 500;

function parseTime(raw: string): number | null {
  const clean = raw.trim().toLowerCase().replace(/\s+/g, "");
  const patterns = [
    /^(\d+)p(\d+)s?$/,
    /^(\d+)p$/,
    /^(\d+):(\d+)$/,
    /^(\d+):(\d+):(\d+)$/
  ];
  for (const re of patterns) {
    const m = clean.match(re);
    if (m) {
      if (re === patterns[0]) return parseInt(m[1]) * 60 + parseInt(m[2]);
      if (re === patterns[1]) return parseInt(m[1]) * 60;
      if (re === patterns[2]) return parseInt(m[1]) * 60 + parseInt(m[2]);
      if (re === patterns[3]) return parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseInt(m[3]);
    }
  }
  const asNum = parseFloat(clean);
  if (!isNaN(asNum)) return asNum;
  return null;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}p${String(s).padStart(2, "0")}s`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

type TrimState = "idle" | "trimming" | "done" | "error";

export function VideoTrimmer() {
  const [, setLocation] = useLocation();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [startRaw, setStartRaw] = useState("0p00s");
  const [endRaw, setEndRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [trimState, setTrimState] = useState<TrimState>("idle");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState<string>("trimmed.mp4");
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const downloadRef = useRef<HTMLAnchorElement>(null);

  const startSec = parseTime(startRaw);
  const endSec = parseTime(endRaw);
  const isValid =
    startSec !== null &&
    endSec !== null &&
    startSec < endSec &&
    (duration === null || endSec <= duration + 0.5);

  const handleFile = useCallback((f: File) => {
    setError(null);
    setTrimState("idle");
    setDownloadUrl(null);
    if (!f.type.startsWith("video/")) {
      setError("File phải là video (mp4, mov, avi, mkv...)");
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`File tối đa ${MAX_MB}MB. File này: ${formatSize(f.size)}`);
      return;
    }
    const url = URL.createObjectURL(f);
    setFile(f);
    setPreviewUrl(url);
    setStartRaw("0p00s");
    setEndRaw("");
    setDuration(null);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const onVideoLoaded = () => {
    if (videoRef.current) {
      const d = videoRef.current.duration;
      setDuration(d);
      setEndRaw(formatTime(d));
    }
  };

  const removeFile = () => {
    setFile(null);
    setPreviewUrl(null);
    setDuration(null);
    setError(null);
    setStartRaw("0p00s");
    setEndRaw("");
    setTrimState("idle");
    setDownloadUrl(null);
  };

  const handleTrim = async () => {
    if (!file || !isValid || startSec === null || endSec === null) return;
    setTrimState("trimming");
    setError(null);
    setDownloadUrl(null);

    try {
      const formData = new FormData();
      formData.append("video", file);
      formData.append("start", String(startSec));
      formData.append("end", String(endSec));

      const res = await fetch("/api/trim", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        let msg = `Lỗi server: ${res.status}`;
        try {
          const json = await res.json();
          if (json.error) msg = json.error;
        } catch {}
        throw new Error(msg);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const baseName = file.name.replace(/\.[^.]+$/, "").slice(0, 60) || "video";
      const ext = file.name.match(/\.[^.]+$/)?.[0] ?? ".mp4";
      const name = `${baseName}_trimmed${ext}`;

      setDownloadUrl(url);
      setDownloadName(name);
      setTrimState("done");

      setTimeout(() => {
        if (downloadRef.current) downloadRef.current.click();
      }, 200);
    } catch (e: unknown) {
      setTrimState("error");
      setError(e instanceof Error ? e.message : "Cắt video thất bại");
    }
  };

  const trimSec = isValid && startSec !== null && endSec !== null
    ? endSec - startSec
    : null;

  const glassCard: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 16,
    padding: 20,
  };

  const inputStyle: React.CSSProperties = {
    fontFamily: FONT, fontSize: 15, fontWeight: 600,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 10, padding: "10px 14px",
    color: "#fff", width: "100%", outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: FONT, fontSize: 12, color: "rgba(255,255,255,0.45)",
    marginBottom: 6, display: "block", letterSpacing: "0.05em",
    textTransform: "uppercase",
  };

  const isBusy = trimState === "trimming";

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0a", fontFamily: FONT }}>
      <ToolVideoBg />
      <Navigation />
      <div className="max-w-xl mx-auto px-4 pt-24 pb-16">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <button
            onClick={() => setLocation("/tool")}
            className="flex items-center gap-2 text-sm mb-6"
            style={{ color: "rgba(255,255,255,0.45)", background: "none", border: "none", cursor: "pointer" }}
          >
            <ArrowLeft size={15} /> Về Trang Tools
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, padding: 10 }}>
              <Scissors size={22} color="rgba(255,255,255,0.85)" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Video Trimmer</h1>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>Cắt video theo mốc thời gian</p>
            </div>
          </div>
        </motion.div>

        <div className="flex flex-col gap-4 mt-6">
          {/* Upload */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}>
            {!file ? (
              <div
                onClick={() => inputRef.current?.click()}
                onDrop={onDrop}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                style={{
                  ...glassCard, padding: 32,
                  border: `2px dashed ${dragOver ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.14)"}`,
                  textAlign: "center", cursor: "pointer",
                  transition: "border-color .2s",
                }}
              >
                <Upload size={30} color="rgba(255,255,255,0.3)" style={{ margin: "0 auto 12px" }} />
                <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 15, fontWeight: 600 }}>Kéo thả hoặc click để tải video</p>
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, marginTop: 6 }}>MP4, MOV, AVI, MKV · Tối đa {MAX_MB}MB</p>
                <input ref={inputRef} type="file" accept="video/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </div>
            ) : (
              <div style={glassCard}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Film size={16} color="rgba(255,255,255,0.5)" />
                    <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, fontWeight: 600, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</span>
                    <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>· {formatSize(file.size)}</span>
                  </div>
                  <button onClick={removeFile} disabled={isBusy} style={{ background: "none", border: "none", cursor: isBusy ? "not-allowed" : "pointer", padding: 4, opacity: isBusy ? 0.3 : 1 }}>
                    <X size={16} color="rgba(255,255,255,0.4)" />
                  </button>
                </div>
                {previewUrl && (
                  <video ref={videoRef} src={previewUrl} controls onLoadedMetadata={onVideoLoaded}
                    style={{ width: "100%", borderRadius: 10, maxHeight: 220, background: "#000" }} />
                )}
                {duration && (
                  <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, marginTop: 6 }}>
                    <Clock size={11} style={{ display: "inline", marginRight: 4 }} />
                    Tổng thời lượng: {formatTime(duration)}
                  </p>
                )}
              </div>
            )}
          </motion.div>

          {/* Error */}
          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ ...glassCard, padding: "12px 16px", border: "1px solid rgba(255,80,80,0.25)", display: "flex", alignItems: "center", gap: 10 }}>
              <AlertCircle size={16} color="rgba(255,100,100,0.85)" />
              <span style={{ color: "rgba(255,120,120,0.9)", fontSize: 13 }}>{error}</span>
            </motion.div>
          )}

          {/* Time inputs */}
          {file && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4 }}>
              <div style={glassCard}>
                <p style={{ ...labelStyle, marginBottom: 16, fontSize: 11 }}>Định dạng: 1p15s · 3p · 1:15 · 90 (giây)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label style={labelStyle}>Mốc bắt đầu</label>
                    <input
                      style={{ ...inputStyle, borderColor: startSec !== null ? "rgba(255,255,255,0.2)" : "rgba(255,80,80,0.5)" }}
                      value={startRaw}
                      onChange={e => { setStartRaw(e.target.value); setTrimState("idle"); }}
                      placeholder="0p00s"
                      disabled={isBusy}
                    />
                    {startSec !== null && (
                      <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 4 }}>{startSec}s</p>
                    )}
                  </div>
                  <div>
                    <label style={labelStyle}>Mốc kết thúc</label>
                    <input
                      style={{ ...inputStyle, borderColor: endSec !== null ? "rgba(255,255,255,0.2)" : "rgba(255,80,80,0.5)" }}
                      value={endRaw}
                      onChange={e => { setEndRaw(e.target.value); setTrimState("idle"); }}
                      placeholder="3p"
                      disabled={isBusy}
                    />
                    {endSec !== null && (
                      <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 4 }}>{endSec}s</p>
                    )}
                  </div>
                </div>

                {/* Preview bar */}
                {isValid && duration && startSec !== null && endSec !== null && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden", position: "relative" }}>
                      <div style={{
                        position: "absolute", top: 0, bottom: 0,
                        left: `${(startSec / duration) * 100}%`,
                        width: `${((endSec - startSec) / duration) * 100}%`,
                        background: "rgba(255,255,255,0.6)", borderRadius: 4,
                      }} />
                    </div>
                    <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, marginTop: 8 }}>
                      Đoạn cắt: <span style={{ color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>{formatTime(startSec)} → {formatTime(endSec)}</span>
                      {trimSec !== null && <>&nbsp;· Dài {formatTime(trimSec)}</>}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Action */}
          {file && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              {/* Done state - show download button */}
              {trimState === "done" && downloadUrl && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{ ...glassCard, padding: "14px 18px", border: "1px solid rgba(100,255,150,0.2)", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} color="rgba(100,255,150,0.85)" />
                    <span style={{ color: "rgba(180,255,200,0.9)", fontSize: 13, fontWeight: 600 }}>Cắt xong!</span>
                    <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>· {downloadName}</span>
                  </div>
                  <a
                    ref={downloadRef}
                    href={downloadUrl}
                    download={downloadName}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      background: "rgba(100,255,150,0.12)",
                      border: "1px solid rgba(100,255,150,0.25)",
                      borderRadius: 8, padding: "6px 14px",
                      color: "rgba(150,255,180,0.9)", fontSize: 13, fontWeight: 600,
                      textDecoration: "none", cursor: "pointer",
                    }}
                  >
                    <Download size={14} /> Tải về
                  </a>
                </motion.div>
              )}

              {/* Trim button */}
              <button
                disabled={!isValid || isBusy}
                onClick={handleTrim}
                style={{
                  width: "100%", padding: "14px 0", borderRadius: 12,
                  background: isBusy
                    ? "rgba(255,255,255,0.06)"
                    : isValid
                      ? "rgba(255,255,255,0.92)"
                      : "rgba(255,255,255,0.08)",
                  border: "none",
                  cursor: (!isValid || isBusy) ? "not-allowed" : "pointer",
                  color: isBusy ? "rgba(255,255,255,0.4)" : isValid ? "#000" : "rgba(255,255,255,0.25)",
                  fontFamily: FONT, fontSize: 15, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "all .2s",
                }}
              >
                {isBusy ? (
                  <>
                    <Loader2 size={17} style={{ animation: "spin 1s linear infinite" }} />
                    Đang cắt video...
                  </>
                ) : (
                  <>
                    <Play size={17} />
                    {trimState === "done" ? "Cắt lại" : "Cắt Video"}
                  </>
                )}
              </button>

              {!isValid && file && !isBusy && (
                <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 12, textAlign: "center", marginTop: 8 }}>
                  Nhập mốc thời gian hợp lệ để tiếp tục
                </p>
              )}

              {isBusy && (
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, textAlign: "center", marginTop: 8 }}>
                  Đang xử lý trên server, vui lòng chờ...
                </p>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Spin animation */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
