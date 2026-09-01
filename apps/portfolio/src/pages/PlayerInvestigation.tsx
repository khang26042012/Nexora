import { useState, useRef, useEffect } from "react";
import { Search, ShieldAlert, ShieldCheck, AlertTriangle, Clock, Sword, Skull, Loader2 } from "lucide-react";
import { Navigation } from "@/components/navigation";

const FONT = "'Plus Jakarta Sans', sans-serif";
const VIDEO_URL = "https://raw.githubusercontent.com/khang26042012/Nexora/main/apps/portfolio/public/hero-bg.mp4";

/* ── Types ── */
interface AnalysisResult {
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  summary: string;
  flags: string[];
  playtimeHours: number;
  keyStats: Record<string, number>;
}

/* ── Styles ── */
const cardStyle: React.CSSProperties = {
  background: "rgba(15, 20, 35, 0.75)",
  backdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  fontFamily: FONT,
};

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 12,
  color: "#fff",
  padding: "14px 18px",
  fontSize: 15,
  outline: "none",
  width: "100%",
  fontFamily: FONT,
};

/* ── Component ── */
export function PlayerInvestigation() {
  const [playerName, setPlayerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleSearch = async () => {
    if (!playerName.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/investigate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: playerName.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Lỗi không xác định");
        return;
      }
      setResult(data);
    } catch (e: any) {
      setError("Lỗi kết nối: " + (e.message || "Unknown"));
    } finally {
      setLoading(false);
    }
  };

  const riskColor = {
    LOW: "#4ade80",
    MEDIUM: "#fbbf24",
    HIGH: "#fb923c",
    CRITICAL: "#ef4444"
  };

  const riskIcon = {
    LOW: ShieldCheck,
    MEDIUM: AlertTriangle,
    HIGH: ShieldAlert,
    CRITICAL: ShieldAlert
  };

  return (
    <div style={{ minHeight: "100vh", position: "relative", overflow: "hidden", background: "#000" }}>
      {/* Video Background */}
      <video
        ref={videoRef}
        autoPlay muted loop playsInline
        style={{ position: "fixed", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: -2 }}
      >
        <source src={VIDEO_URL} type="video/mp4" />
      </video>

      {/* Overlay */}
      <div style={{ position: "fixed", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.7) 100%)", zIndex: -1 }} />

      <Navigation />

      {/* Main Content */}
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "120px 20px 60px", fontFamily: FONT }}>

        {/* Header Card */}
        <div style={{ ...cardStyle, padding: "40px 32px", marginBottom: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#fff", margin: "0 0 8px" }}>
            🔍 Điều Tra Player
          </h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, margin: 0 }}>
            Phân tích tự động bằng AI • Dữ liệu an toàn, không tiết lộ chi tiết nhạy cảm
          </p>
        </div>

        {/* Search Card */}
        <div style={{ ...cardStyle, padding: "28px 24px", marginBottom: 24 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <input
              type="text"
              placeholder="Nhập tên người chơi..."
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              style={inputStyle}
            />
            <button
              onClick={handleSearch}
              disabled={loading || !playerName.trim()}
              style={{
                background: loading ? "rgba(255,255,255,0.1)" : "rgba(100,180,255,0.2)",
                border: "1px solid rgba(100,180,255,0.3)",
                borderRadius: 12,
                padding: "0 24px",
                color: "#fff",
                cursor: loading ? "wait" : "pointer",
                display: "flex", alignItems: "center", gap: 8,
                fontSize: 14, fontWeight: 600,
                transition: "all 0.2s",
              }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
              {loading ? "Đang phân tích..." : "Kiểm tra"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ ...cardStyle, padding: "20px 24px", borderColor: "rgba(239,68,68,0.3)", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#fca5a5" }}>
              <AlertTriangle size={18} />
              <span style={{ fontSize: 14 }}>{error}</span>
            </div>
          </div>
        )}

        {/* Result Card */}
        {result && (
          <div style={{ ...cardStyle, padding: "32px 28px", borderColor: `${riskColor[result.riskLevel]}33` }}>

            {/* Risk Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: `${riskColor[result.riskLevel]}20`,
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                {(() => { const Icon = riskIcon[result.riskLevel]; return <Icon size={24} style={{ color: riskColor[result.riskLevel] }} />; })()}
              </div>
              <div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1 }}>
                  Mức độ rủi ro
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: riskColor[result.riskLevel] }}>
                  {result.riskLevel}
                </div>
              </div>
            </div>

            {/* Summary */}
            <div style={{
              padding: "16px 20px",
              background: "rgba(255,255,255,0.03)",
              borderRadius: 12,
              marginBottom: 20,
              color: "rgba(255,255,255,0.85)",
              fontSize: 15,
              lineHeight: 1.6
            }}>
              {result.summary}
            </div>

            {/* Flags */}
            {result.flags.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>
                  Điểm đáng chú ý
                </div>
                {result.flags.map((flag, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    padding: "10px 14px", marginBottom: 8,
                    background: "rgba(251,191,36,0.06)",
                    borderRadius: 8,
                    fontSize: 13, color: "rgba(255,255,255,0.75)"
                  }}>
                    <AlertTriangle size={14} style={{ marginTop: 2, flexShrink: 0, color: "#fbbf24" }} />
                    {flag}
                  </div>
                ))}
              </div>
            )}

            {/* Key Stats Mini */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              <div style={{ padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: 10, textAlign: "center" }}>
                <Clock size={16} style={{ color: "rgba(255,255,255,0.4)", marginBottom: 4 }} />
                <div style={{ fontSize: 18, fontWeight: 600, color: "#fff" }}>{result.playtimeHours.toFixed(1)}h</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>Playtime</div>
              </div>
              <div style={{ padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: 10, textAlign: "center" }}>
                <Skull size={16} style={{ color: "rgba(255,255,255,0.4)", marginBottom: 4 }} />
                <div style={{ fontSize: 18, fontWeight: 600, color: "#fff" }}>{result.keyStats.deaths ?? "-"}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>Deaths</div>
              </div>
              <div style={{ padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: 10, textAlign: "center" }}>
                <Sword size={16} style={{ color: "rgba(255,255,255,0.4)", marginBottom: 4 }} />
                <div style={{ fontSize: 18, fontWeight: 600, color: "#fff" }}>{result.keyStats.mob_kills ?? "-"}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>Mob Kills</div>
              </div>
            </div>

          </div>
        )}

        {/* Disclaimer */}
        <div style={{ textAlign: "center", marginTop: 32, color: "rgba(255,255,255,0.25)", fontSize: 11 }}>
          Kết quả chỉ mang tính tham khảo • Cần kiểm chứng thêm trước khi đưa ra quyết định
        </div>
      </div>
    </div>
  );
}
