import { Navigation } from "@/components/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Coins, Server, Zap, RefreshCw, 
  Clock, Wallet, Search, CheckCircle2, Cpu, HardDrive,
  Activity, AlertTriangle, Radio, Play, Settings, List,
  ExternalLink, Copy, Check, Sparkles, ShieldCheck, Layers, Terminal
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";

const FONT = "'Plus Jakarta Sans', sans-serif";

type HostInfo = {
  id: string;
  name: string;
  node: string;
  status: string;
  fund: number;
  dailyCost: number;
  ramFormatted: string;
};

type GeneratedLinkItem = {
  status: "success" | "error";
  player: string;
  link?: string;
  message?: string;
};

type HostExecutionResult = {
  hostId: string;
  hostName: string;
  status: "success" | "error";
  message: string;
  data: GeneratedLinkItem[];
};

export default function FundTools() {
  const [hosts, setHosts] = useState<HostInfo[]>([]);
  const [selectedHosts, setSelectedHosts] = useState<string[]>([]);
  const [limit, setLimit] = useState<number>(3);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingHosts, setIsFetchingHosts] = useState(true);
  const [results, setResults] = useState<HostExecutionResult[]>([]);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Fetch server hosts data
  const loadHostData = useCallback(async () => {
    setIsFetchingHosts(true);
    try {
      const r = await fetch("/api/panel/hosts");
      if (r.ok) {
        const d = await r.json();
        if (d.success && d.hosts) {
          setHosts(d.hosts);
          // Default select all hosts
          if (selectedHosts.length === 0) {
            setSelectedHosts(d.hosts.map((h: any) => h.id));
          }
        }
      }
    } catch (e) {
      console.error("Lỗi tải thông tin hosts:", e);
    } finally {
      setIsFetchingHosts(false);
    }
  }, []);

  useEffect(() => {
    loadHostData();
  }, [loadHostData]);

  const toggleSelectHost = (id: string) => {
    setSelectedHosts(prev => 
      prev.includes(id) ? prev.filter(h => h !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedHosts(hosts.map(h => h.id));
  const deselectAll = () => setSelectedHosts([]);

  const handleRunTool = async () => {
    if (selectedHosts.length === 0) {
      alert("Vui lòng chọn ít nhất 1 máy chủ mục tiêu!");
      return;
    }

    setIsLoading(true);
    setResults([]);

    try {
      const res = await fetch("/api/fund-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hosts: selectedHosts,
          limit: limit
        })
      });

      const data = await res.json();
      if (data.success && data.results) {
        setResults(data.results);
      } else {
        alert("Lỗi hệ thống: " + (data.error || "Không thể khởi chạy tool"));
      }
    } catch (err: any) {
      alert("Lỗi kết nối tới máy chủ API: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(text);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  const totalLinksGenerated = results.reduce((acc, hostRes) => {
    return acc + (hostRes.data ? hostRes.data.filter(d => d.status === "success").length : 0);
  }, 0);

  return (
    <div className="min-h-screen text-white relative overflow-hidden" style={{ background: "#050508", fontFamily: FONT }}>
      <Navigation />

      {/* Ambient glowing background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.35, 0.2] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-15%] right-[15%] w-[45vw] h-[45vw] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 70%)" }}
        />
        <motion.div
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[-10%] left-[10%] w-[50vw] h-[50vw] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(16,185,129,0.1) 0%, transparent 70%)" }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-28 pb-20 relative z-10">
        {/* Header Title Banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> NVN AUTOMATED LINK GENERATOR PROTOCOL (v3.3 NATIVE)
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white/90 to-white/60">
              Hệ Thống Tự Động Sinh Link Đóng Góp Quỹ Host
            </h1>
            <p className="text-sm text-white/50 mt-1">
              Gộp 3 công cụ NVN Link Tool — Tùy chỉnh máy chủ mục tiêu &amp; số lượng link tự động bằng mã hóa HMAC-SHA256.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadHostData}
              disabled={isFetchingHosts}
              className="px-4 py-2.5 rounded-2xl border border-white/10 bg-white/5 text-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetchingHosts ? "animate-spin text-indigo-400" : ""}`} />
              Làm Mới Trạng Thái Máy Chủ
            </button>
          </div>
        </motion.div>

        {/* Top Control Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">
          {/* Target Host Selection Panel (8 Cols) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-8 p-6 md:p-8 rounded-[28px] border border-white/10 bg-white/[0.03] backdrop-blur-2xl relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-white">Chọn Máy Chủ Mục Tiêu</h2>
                  <p className="text-xs text-white/40">Tích chọn các máy chủ muốn thực hiện sinh link đóng góp</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={selectAll}
                  className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-[11px] font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-all"
                >
                  Chọn Tất Cả
                </button>
                <button
                  onClick={deselectAll}
                  className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-[11px] font-semibold text-white/50 hover:text-white/80 transition-all"
                >
                  Bỏ Chọn
                </button>
              </div>
            </div>

            {isFetchingHosts && (
              <div className="p-8 text-center text-white/40 text-xs font-medium">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-400" />
                Đang tải dữ liệu telemetry máy chủ...
              </div>
            )}

            {!isFetchingHosts && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {hosts.map((host) => {
                  const isSelected = selectedHosts.includes(host.id);
                  const isRunning = host.status === "running";

                  return (
                    <div
                      key={host.id}
                      onClick={() => toggleSelectHost(host.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all relative group select-none ${
                        isSelected 
                          ? "bg-indigo-500/10 border-indigo-500/50 shadow-lg shadow-indigo-500/5" 
                          : "bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-[10px] font-bold font-mono tracking-wider text-white/50 uppercase px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
                          {host.node}
                        </span>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                          isSelected ? "bg-indigo-500 border-indigo-400 text-white" : "border-white/20 bg-black/40"
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>

                      <h3 className="text-base font-extrabold text-white mb-1 group-hover:text-indigo-300 transition-colors">
                        {host.name}
                      </h3>

                      <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-white/5 text-white/50">
                        <span className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${isRunning ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
                          {isRunning ? "ĐANG CHẠY" : "ĐÃ TẮT"}
                        </span>
                        <span className="font-mono text-amber-300 font-bold">{host.fund.toFixed(2)} 🪙</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Config & Action Execution Panel (4 Cols) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-4 p-6 md:p-8 rounded-[28px] border border-white/10 bg-white/[0.03] backdrop-blur-2xl relative overflow-hidden flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-2.5 mb-6">
                <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-white">Cấu Hình &amp; Thực Thao</h2>
                  <p className="text-xs text-white/40">Thiết lập tham số chạy tự động</p>
                </div>
              </div>

              {/* Slider count */}
              <div className="mb-6 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="flex justify-between items-center text-xs mb-3">
                  <span className="text-white/60 font-medium">Số lượng link mỗi host:</span>
                  <span className="text-lg font-black font-mono text-amber-300">{limit} <span className="text-xs text-white/40 font-normal">link</span></span>
                </div>

                <input
                  type="range"
                  min="1"
                  max="15"
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="w-full h-2 rounded-lg bg-white/10 appearance-none cursor-pointer accent-amber-400"
                />
                <div className="flex justify-between text-[10px] text-white/30 font-mono mt-1.5">
                  <span>1 link</span>
                  <span>5 links</span>
                  <span>15 links</span>
                </div>
              </div>

              <div className="text-xs text-white/50 space-y-2 mb-6">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span>Máy chủ đã chọn:</span>
                  <strong className="text-white">{selectedHosts.length} / {hosts.length}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span>Dự kiến tạo tổng:</span>
                  <strong className="text-indigo-300 font-mono">{selectedHosts.length * limit} links</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span>Giao thức mã hóa:</span>
                  <strong className="text-emerald-400 font-mono">HMAC-SHA256</strong>
                </div>
              </div>
            </div>

            {/* Run Button */}
            <button
              onClick={handleRunTool}
              disabled={isLoading || selectedHosts.length === 0}
              className={`w-full py-4 rounded-2xl font-extrabold text-sm tracking-wide flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95 ${
                isLoading || selectedHosts.length === 0
                  ? "bg-white/10 text-white/30 cursor-not-allowed border border-white/5"
                  : "bg-gradient-to-r from-amber-500 via-indigo-600 to-purple-600 text-white border border-white/20 hover:shadow-indigo-500/25"
              }`}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  ĐANG KHỞI CHẠY HMAC PROTOCOL...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current text-amber-300" />
                  BẮT ĐẦU SINH LINK TỰ ĐỘNG
                </>
              )}
            </button>
          </motion.div>
        </div>

        {/* Results Console Log Section */}
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-emerald-400" />
                <h2 className="text-xl font-bold text-white">Kết Quả Sinh Link Trực Tiếp</h2>
              </div>
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-bold">
                TỔNG THÀNH CÔNG: {totalLinksGenerated} LINKS
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {results.map((hostRes) => {
                const hasSuccess = hostRes.data && hostRes.data.some(d => d.status === "success");

                return (
                  <div
                    key={hostRes.hostId}
                    className={`p-6 rounded-[24px] border bg-white/[0.02] backdrop-blur-xl relative overflow-hidden transition-all ${
                      hasSuccess ? "border-emerald-500/30 shadow-lg shadow-emerald-500/5" : "border-rose-500/30"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
                      <div>
                        <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                          {hostRes.hostName}
                        </h3>
                        <span className="text-[10px] font-mono text-white/40">ID: {hostRes.hostId}</span>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                        hasSuccess ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}>
                        {hasSuccess ? "THÀNH CÔNG" : "CÓ LỖI"}
                      </span>
                    </div>

                    <p className="text-xs text-white/60 mb-4">{hostRes.message}</p>

                    {/* Generated links list */}
                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                      {hostRes.data && hostRes.data.map((item, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-xl border text-xs ${
                            item.status === "success" 
                              ? "bg-emerald-500/[0.04] border-emerald-500/20 text-emerald-200" 
                              : "bg-rose-500/[0.04] border-rose-500/20 text-rose-300"
                          }`}
                        >
                          <div className="flex justify-between items-center mb-1 font-mono text-[11px]">
                            <span className="text-white/50">Player: <strong className="text-white">{item.player}</strong></span>
                            {item.status === "success" && <span className="text-emerald-400 text-[10px] font-bold">LINK4M READY</span>}
                          </div>

                          {item.status === "success" && item.link && (
                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
                              <input
                                type="text"
                                readOnly
                                value={item.link}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-amber-300 truncate focus:outline-none"
                              />

                              <button
                                onClick={() => copyToClipboard(item.link!)}
                                className="p-1.5 rounded-lg border border-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10 transition-all shrink-0"
                                title="Sao chép link"
                              >
                                {copiedLink === item.link ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>

                              <a
                                href={item.link}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/20 text-indigo-300 hover:text-white hover:bg-indigo-500/30 transition-all shrink-0"
                                title="Mở link trực tiếp"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          )}

                          {item.status === "error" && (
                            <p className="text-[11px] text-rose-300 mt-1">{item.message}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
