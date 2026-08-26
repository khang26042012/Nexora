import { Navigation } from "@/components/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Coins, Server, Zap, ShieldCheck, Plus, RefreshCw, 
  ArrowUpRight, Play, Pause, AlertCircle, Clock, 
  CreditCard, Wallet, Search, CheckCircle2, ChevronRight
} from "lucide-react";
import { useState } from "react";

const FONT = "'Plus Jakarta Sans', sans-serif";

type Host = {
  id: string;
  name: string;
  type: string;
  ip: string;
  status: "running" | "paused" | "warning";
  fund: number; // Coin o quy host nay
  dailyCost: number; // Coin/ngay
  ram: string;
  cpu: string;
  accent: string;
  borderAccent: string;
  glowAccent: string;
};

const INITIAL_HOSTS: Host[] = [
  {
    id: "khangsmp2",
    name: "KhangSMP2 (Paper 26.2)",
    type: "Minecraft Java Host",
    ip: "smp2.nvnmc.cloud:25565",
    status: "running",
    fund: 1850,
    dailyCost: 100,
    ram: "11 GB",
    cpu: "2 vCPU",
    accent: "rgba(245,158,11,0.9)",
    borderAccent: "rgba(245,158,11,0.3)",
    glowAccent: "rgba(245,158,11,0.12)"
  },
  {
    id: "khangsmp1",
    name: "KhangSMP Survival",
    type: "Minecraft Paper 1.20",
    ip: "smp.nvnmc.cloud:25565",
    status: "running",
    fund: 1200,
    dailyCost: 50,
    ram: "8 GB",
    cpu: "2 vCPU",
    accent: "rgba(16,185,129,0.9)",
    borderAccent: "rgba(16,185,129,0.3)",
    glowAccent: "rgba(16,185,129,0.12)"
  },
  {
    id: "relay-gateway",
    name: "NvnBot Relay & Gateway",
    type: "Node.js / Python Svc",
    ip: "nvnmc.asia:26184",
    status: "running",
    fund: 500,
    dailyCost: 10,
    ram: "2 GB",
    cpu: "1 vCPU",
    accent: "rgba(99,102,241,0.9)",
    borderAccent: "rgba(99,102,241,0.3)",
    glowAccent: "rgba(99,102,241,0.12)"
  },
  {
    id: "ai-assistant",
    name: "AI Assistant Web App",
    type: "Next.js Production",
    ip: "app.nvnmc.asia:30100",
    status: "paused",
    fund: 250,
    dailyCost: 5,
    ram: "1 GB",
    cpu: "1 vCPU",
    accent: "rgba(168,85,247,0.9)",
    borderAccent: "rgba(168,85,247,0.3)",
    glowAccent: "rgba(168,85,247,0.12)"
  }
];

type Tx = {
  id: string;
  time: string;
  desc: string;
  amount: number;
  type: "topup" | "deduct" | "transfer";
};

const INITIAL_TXS: Tx[] = [
  { id: "tx-1", time: "Hôm nay 18:37", desc: "Tự động trừ quỹ host KhangSMP2 (1 ngày)", amount: -100, type: "deduct" },
  { id: "tx-2", time: "Hôm nay 12:00", desc: "Nạp Coin vào tài khoản chính", amount: +2000, type: "topup" },
  { id: "tx-3", time: "Hôm qua 21:15", desc: "Chuyển Coin vào quỹ host KhangSMP Survival", amount: -500, type: "transfer" },
  { id: "tx-4", time: "24/08/2026", desc: "Thưởng sự kiện quản trị viên", amount: +500, type: "topup" }
];

export function PanelCoinHost() {
  const [userBalance, setUserBalance] = useState(12450);
  const [hosts, setHosts] = useState<Host[]>(INITIAL_HOSTS);
  const [txs, setTxs] = useState<Tx[]>(INITIAL_TXS);
  const [search, setSearch] = useState("");
  const [selectedHost, setSelectedHost] = useState<Host | null>(null);
  const [fundAddAmount, setFundAddAmount] = useState("200");
  const [mainTopUpOpen, setMainTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("1000");

  const totalDailyCost = hosts.reduce((acc, h) => acc + (h.status === "running" ? h.dailyCost : 0), 0);
  const totalHostFunds = hosts.reduce((acc, h) => acc + h.fund, 0);

  const handleAddFundToHost = () => {
    if (!selectedHost) return;
    const val = parseInt(fundAddAmount) || 0;
    if (val <= 0) return;
    if (val > userBalance) {
      alert("Số dư Coin tài khoản không đủ!");
      return;
    }

    setUserBalance(prev => prev - val);
    setHosts(prev => prev.map(h => h.id === selectedHost.id ? { ...h, fund: h.fund + val } : h));
    setTxs(prev => [
      { id: "tx-" + Date.now(), time: "Vừa xong", desc: `Chuyển quỹ vào host ${selectedHost.name}`, amount: -val, type: "transfer" },
      ...prev
    ]);
    setSelectedHost(null);
  };

  const handleTopUpMain = () => {
    const val = parseInt(topUpAmount) || 0;
    if (val <= 0) return;
    setUserBalance(prev => prev + val);
    setTxs(prev => [
      { id: "tx-" + Date.now(), time: "Vừa xong", desc: "Nạp Coin vào ví chính", amount: +val, type: "topup" },
      ...prev
    ]);
    setMainTopUpOpen(false);
  };

  const filteredHosts = hosts.filter(h => 
    h.name.toLowerCase().includes(search.toLowerCase()) || 
    h.ip.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen text-white relative overflow-hidden" style={{ background: "#050505", fontFamily: FONT }}>
      {/* Top Floating Sidebar Navigation */}
      <Navigation />

      {/* Ambient background glow orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.25, 0.4, 0.25] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-15%] left-[20%] w-[50vw] h-[50vw] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(245,158,11,0.08) 0%, transparent 70%)" }}
        />
        <motion.div
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.35, 0.2] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[-10%] right-[10%] w-[45vw] h-[45vw] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(99,102,241,0.07) 0%, transparent 70%)" }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-28 pb-20 relative z-10">
        {/* Header Title */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs font-semibold mb-3">
              <Coins className="w-3.5 h-3.5" /> PANEL COIN HOST DASHBOARD
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white/90 to-white/60">
              Quản Lý Coin &amp; Quỹ Host
            </h1>
            <p className="text-sm text-white/50 mt-1">
              Theo dõi số dư tài khoản, số quỹ còn lại của riêng từng host và quản lý gia hạn tự động.
            </p>
          </div>

          <button
            onClick={() => setMainTopUpOpen(true)}
            className="self-start md:self-auto inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl font-semibold text-sm text-black bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 shadow-[0_10px_30px_rgba(245,158,11,0.35)] hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" /> Nạp Coin Tự Động
          </button>
        </motion.div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {/* Card 1: Balance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 rounded-[24px] border border-white/10 bg-white/[0.03] backdrop-blur-xl relative overflow-hidden group hover:border-amber-500/40 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Số Dư Ví Chính</span>
              <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-amber-300 tracking-tight flex items-baseline gap-1.5">
              {userBalance.toLocaleString()} <span className="text-sm font-bold text-amber-400/70">🪙</span>
            </div>
            <div className="text-xs text-white/40 mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Đủ duy trì ví chính
            </div>
          </motion.div>

          {/* Card 2: Total Host Funds */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-6 rounded-[24px] border border-white/10 bg-white/[0.03] backdrop-blur-xl relative overflow-hidden group hover:border-emerald-500/40 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Tổng Quỹ Đang Khóa Host</span>
              <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Coins className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-emerald-300 tracking-tight flex items-baseline gap-1.5">
              {totalHostFunds.toLocaleString()} <span className="text-sm font-bold text-emerald-400/70">🪙</span>
            </div>
            <div className="text-xs text-white/40 mt-2">
              Nằm riêng trong 4 máy chủ
            </div>
          </motion.div>

          {/* Card 3: Daily Burn Rate */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-6 rounded-[24px] border border-white/10 bg-white/[0.03] backdrop-blur-xl relative overflow-hidden group hover:border-indigo-500/40 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Tiêu Thụ Tự Động</span>
              <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Zap className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-indigo-300 tracking-tight flex items-baseline gap-1.5">
              {totalDailyCost} <span className="text-sm font-bold text-indigo-400/70">Coin/ngày</span>
            </div>
            <div className="text-xs text-white/40 mt-2">
              Trừ quỹ tự động lúc 00:00
            </div>
          </motion.div>

          {/* Card 4: Active Hosts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-6 rounded-[24px] border border-white/10 bg-white/[0.03] backdrop-blur-xl relative overflow-hidden group hover:border-purple-500/40 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Máy Chủ Hoạt Động</span>
              <div className="p-2.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <Server className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-purple-300 tracking-tight flex items-baseline gap-2">
              {hosts.filter(h => h.status === "running").length} / {hosts.length}
            </div>
            <div className="text-xs text-white/40 mt-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> 22 GB RAM đã cấp
            </div>
          </motion.div>
        </div>

        {/* Search & Filter Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold tracking-tight text-white/90 flex items-center gap-2">
            <Server className="w-5 h-5 text-amber-400" /> Bảng Quỹ Chi Tiết Của Riêng Từng Host
          </h2>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm host hoặc IP..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/[0.05] border border-white/10 text-sm text-white placeholder-white/40 focus:outline-none focus:border-amber-500/50 transition-all"
            />
          </div>
        </div>

        {/* Individual Host Fund Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-14">
          {filteredHosts.map((host, idx) => {
            const daysLeft = host.dailyCost > 0 ? (host.fund / host.dailyCost).toFixed(1) : "∞";

            return (
              <motion.div
                key={host.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * idx }}
                className="p-7 rounded-[28px] border bg-white/[0.03] backdrop-blur-xl relative overflow-hidden group hover:scale-[1.01] transition-all"
                style={{ 
                  borderColor: host.borderAccent,
                  boxShadow: `0 10px 30px ${host.glowAccent}`
                }}
              >
                {/* Status Header */}
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <span className="text-[11px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-lg border bg-white/5" style={{ color: host.accent, borderColor: host.borderAccent }}>
                      {host.type}
                    </span>
                    <h3 className="text-xl font-extrabold text-white mt-2 flex items-center gap-2">
                      {host.name}
                    </h3>
                    <p className="text-xs font-mono text-white/40 mt-1">{host.ip}</p>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                    host.status === "running" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${host.status === "running" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                    {host.status === "running" ? "Đang Chạy" : "Tạm Dừng"}
                  </span>
                </div>

                {/* Fund Focus Box */}
                <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.02] mb-5 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-white/40 font-medium">Số Quỹ Riêng Đang Có</span>
                    <div className="text-2xl font-black text-amber-300 mt-0.5 flex items-baseline gap-1">
                      {host.fund.toLocaleString()} <span className="text-xs font-bold text-amber-400/60">🪙</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-white/40 font-medium">Thời Gian Chạy Dự Kiến</span>
                    <div className="text-base font-bold text-emerald-400 mt-0.5 flex items-center justify-end gap-1">
                      <Clock className="w-4 h-4 text-emerald-400" /> ~{daysLeft} ngày
                    </div>
                  </div>
                </div>

                {/* Info row */}
                <div className="grid grid-cols-3 gap-2 text-xs text-white/60 mb-6 pb-4 border-b border-white/5">
                  <div>
                    <span className="text-white/30 block text-[10px] uppercase">Chi phí</span>
                    <span className="font-semibold text-white/80">{host.dailyCost} Coin/ngày</span>
                  </div>
                  <div>
                    <span className="text-white/30 block text-[10px] uppercase">RAM</span>
                    <span className="font-semibold text-white/80">{host.ram}</span>
                  </div>
                  <div>
                    <span className="text-white/30 block text-[10px] uppercase">vCPU</span>
                    <span className="font-semibold text-white/80">{host.cpu}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedHost(host)}
                    className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs text-black bg-amber-400 hover:bg-amber-300 transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20"
                  >
                    <Plus className="w-3.5 h-3.5" /> + Nạp Thêm Quỹ
                  </button>

                  <button 
                    onClick={() => {
                      setHosts(prev => prev.map(h => h.id === host.id ? { ...h, status: h.status === "running" ? "paused" : "running" } : h));
                    }}
                    className="p-2.5 rounded-xl border border-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10 transition-all"
                    title={host.status === "running" ? "Tạm dừng host" : "Khởi chạy host"}
                  >
                    {host.status === "running" ? <Pause className="w-4 h-4 text-amber-400" /> : <Play className="w-4 h-4 text-emerald-400" />}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Transaction History Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="p-8 rounded-[30px] border border-white/10 bg-white/[0.03] backdrop-blur-xl"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-amber-400" /> Lịch Sử Giao Dịch &amp; Trừ Quỹ Coin
            </h3>
            <span className="text-xs text-white/40">Tự động lưu real-time</span>
          </div>

          <div className="space-y-3">
            {txs.map(tx => (
              <div 
                key={tx.id}
                className="p-4 rounded-2xl border border-white/5 bg-white/[0.02] flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${
                    tx.type === "topup" ? "bg-emerald-500/10 text-emerald-400" :
                    tx.type === "transfer" ? "bg-amber-500/10 text-amber-400" : "bg-rose-500/10 text-rose-400"
                  }`}>
                    {tx.type === "topup" ? <Plus className="w-4 h-4" /> :
                     tx.type === "transfer" ? <RefreshCw className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="font-semibold text-white/90 text-sm">{tx.desc}</p>
                    <p className="text-white/30 text-[11px] mt-0.5">{tx.time}</p>
                  </div>
                </div>

                <div className={`font-mono font-extrabold text-sm ${
                  tx.amount > 0 ? "text-emerald-400" : "text-amber-300"
                }`}>
                  {tx.amount > 0 ? `+${tx.amount.toLocaleString()}` : tx.amount.toLocaleString()} 🪙
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Modal 1: Add Fund to Specific Host */}
      <AnimatePresence>
        {selectedHost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setSelectedHost(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md p-7 rounded-[30px] border border-amber-500/30 bg-[#0f0f15] text-white shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Coins className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold">Nạp Quỹ Vào Host</h3>
                  <p className="text-xs text-white/40">{selectedHost.name}</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-5 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/40">Số dư ví chính hiện có:</span>
                  <span className="font-bold text-amber-300">{userBalance.toLocaleString()} Coin</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Quỹ hiện tại của host:</span>
                  <span className="font-bold text-emerald-400">{selectedHost.fund.toLocaleString()} Coin</span>
                </div>
              </div>

              <label className="block text-xs font-semibold text-white/60 mb-2">
                Nhập Số Coin Muốn Chuyển Vào Quỹ Host:
              </label>
              <input
                type="number"
                value={fundAddAmount}
                onChange={e => setFundAddAmount(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-mono font-bold text-base focus:outline-none focus:border-amber-400 mb-5"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedHost(null)}
                  className="flex-1 py-3 rounded-2xl border border-white/10 bg-white/5 text-xs font-bold text-white/70 hover:bg-white/10"
                >
                  Hủy
                </button>
                <button
                  onClick={handleAddFundToHost}
                  className="flex-1 py-3 rounded-2xl bg-amber-400 text-black text-xs font-black hover:bg-amber-300 shadow-lg shadow-amber-500/30"
                >
                  Xác Nhận Nạp Quỹ
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal 2: Top-up Main Balance */}
      <AnimatePresence>
        {mainTopUpOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setMainTopUpOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md p-7 rounded-[30px] border border-amber-500/30 bg-[#0f0f15] text-white shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold">Nạp Coin Vào Ví Chính</h3>
                  <p className="text-xs text-white/40">Mô phỏng nạp tự động qua QR / Banking</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-5 text-xs text-white/60">
                Tốc độ xử lý: <span className="text-emerald-400 font-bold">Real-time (Tự động)</span>
              </div>

              <label className="block text-xs font-semibold text-white/60 mb-2">
                Chọn / Nhập Số Coin Cần Nạp:
              </label>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[500, 1000, 5000].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTopUpAmount(String(amt))}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      topUpAmount === String(amt) 
                        ? "bg-amber-400 text-black border-amber-400" 
                        : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    +{amt.toLocaleString()} 🪙
                  </button>
                ))}
              </div>

              <input
                type="number"
                value={topUpAmount}
                onChange={e => setTopUpAmount(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-mono font-bold text-base focus:outline-none focus:border-amber-400 mb-5"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => setMainTopUpOpen(false)}
                  className="flex-1 py-3 rounded-2xl border border-white/10 bg-white/5 text-xs font-bold text-white/70 hover:bg-white/10"
                >
                  Đóng
                </button>
                <button
                  onClick={handleTopUpMain}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 text-black text-xs font-black hover:opacity-90 shadow-lg shadow-amber-500/30"
                >
                  Xác Nhận Nạp
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
