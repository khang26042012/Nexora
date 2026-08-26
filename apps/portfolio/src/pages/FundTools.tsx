import { Navigation } from "@/components/navigation";
import { motion } from "framer-motion";
import { 
  Coins, Server, Zap, RefreshCw, 
  Clock, Wallet, Search, CheckCircle2, Cpu, HardDrive,
  Activity, AlertTriangle, Radio, Play, Settings, List
} from "lucide-react";
import { useState, useEffect } from "react";

const FONT = "'Plus Jakarta Sans', sans-serif";

type FundResult = {
  hostId: string;
  hostName: string;
  status: "success" | "error";
  message: string;
  data?: any;
};

export default function FundTools() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<FundResult[]>([]);
  const [selectedHosts, setSelectedHosts] = useState<string[]>([]);
  const [limit, setLimit] = useState<number>(5);
  const [availableHosts, setAvailableHosts] = useState<{id: string, name: string}[]>([]);

  // Lấy danh sách host từ API panel (tái sử dụng logic cũ)
  useEffect(() => {
    fetch('/api/panel/hosts')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.hosts) {
          setAvailableHosts(data.hosts.map((h: any) => ({ id: h.id, name: h.name })));
        }
      })
      .catch(err => console.error("Lỗi tải danh sách host:", err));
  }, []);

  const handleRunTool = async () => {
    setIsLoading(true);
    setResults([]);
    
    try {
      const res = await fetch('/api/fund-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hosts: selectedHosts.length > 0 ? selectedHosts : availableHosts.map(h => h.id),
          limit: limit
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setResults(data.results || []);
      } else {
        alert("Lỗi: " + data.error);
      }
    } catch (err) {
      alert("Không thể kết nối server");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleHost = (id: string) => {
    setSelectedHosts(prev => 
      prev.includes(id) ? prev.filter(h => h !== id) : [...prev, id]
    );
  };

  return (
    <div className={`min-h-screen bg-[#0a0a0f] text-white font-sans selection:bg-purple-500/30`} style={{ fontFamily: FONT }}>
      <Navigation />
      
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
            Get Quỹ Tự Động
          </h1>
          <p className="text-gray-400">Công cụ gộp 3 script Python để truy vấn và xử lý quỹ host.</p>
        </motion.div>

        {/* Control Panel */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 mb-8 shadow-2xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Host Selection */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-4">
                <List className="w-4 h-4 text-purple-400" />
                Chọn Host Mục Tiêu
              </label>
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                {availableHosts.map(host => (
                  <div 
                    key={host.id}
                    onClick={() => toggleHost(host.id)}
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${selectedHosts.includes(host.id) ? 'bg-purple-500/20 border border-purple-500/50' : 'bg-white/5 border border-white/5 hover:bg-white/10'}`}
                  >
                    <span className="text-sm">{host.name}</span>
                    {selectedHosts.includes(host.id) && <CheckCircle2 className="w-4 h-4 text-purple-400" />}
                  </div>
                ))}
              </div>
              <button 
                onClick={() => setSelectedHosts(availableHosts.map(h => h.id))}
                className="mt-2 text-xs text-purple-400 hover:text-purple-300 underline"
              >
                Chọn tất cả
              </button>
            </div>

            {/* Settings */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-4">
                <Settings className="w-4 h-4 text-blue-400" />
                Cấu Hình Quét
              </label>
              
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-400">Số lượng tối đa</span>
                    <span className="text-sm font-bold text-white">{limit}</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="50" 
                    value={limit} 
                    onChange={(e) => setLimit(parseInt(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                </div>

                <button
                  onClick={handleRunTool}
                  disabled={isLoading}
                  className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${isLoading ? 'bg-gray-700 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:scale-[1.02] shadow-lg shadow-purple-500/20'}`}
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 fill-current" />
                      Chạy Công Cụ
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Results Area */}
        {results.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {results.map((res, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`p-6 rounded-2xl border ${res.status === 'success' ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg">{res.hostName}</h3>
                  {res.status === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  )}
                </div>
                <p className="text-sm text-gray-300 font-mono break-all">{res.message}</p>
                {res.data && (
                  <pre className="mt-4 p-3 bg-black/30 rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(res.data, null, 2)}
                  </pre>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
