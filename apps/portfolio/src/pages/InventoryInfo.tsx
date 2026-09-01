import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, User, Heart, Star, MapPin, Box, Package, AlertCircle, Search, Backpack, X, Sword, Shield, Zap, Eye } from "lucide-react";
import { Navigation } from "@/components/navigation";

const FONT = "'Plus Jakarta Sans', sans-serif";
const VIDEO_URL = "https://raw.githubusercontent.com/khang26042012/Nexora/main/apps/portfolio/public/hero-bg.mp4";
const PLAYER_DB_URL = "https://files.catbox.moe/gj3i7r.json";

const glass: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 20,
};

function AnimBorderCard({
  children, className = "", speed = 4, color = "rgba(255,255,255,0.85)",
  radius = 20, innerStyle = {}, animate = true,
}: {
  children: React.ReactNode; className?: string; speed?: number; color?: string;
  radius?: number; innerStyle?: React.CSSProperties; animate?: boolean;
}) {
  return (
    <div
      className={`running-border ${!animate ? "animation-paused" : ""} ${className}`}
      style={{
        "--rb-speed": `${speed}s`, "--rb-color": color, "--rb-radius": `${radius}px`,
        background: "rgba(255,255,255,0.04)", ...innerStyle,
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

/* ── StatRow with optional progress bar ── */
function StatRow({ icon: Icon, label, value, sub, delay, progress, progressColor }: {
  icon: any; label: string; value: string; sub?: string; delay: number;
  progress?: number; progressColor?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="flex flex-col gap-1.5 py-2.5"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <Icon size={16} style={{ color: "rgba(255,255,255,0.6)" }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold tracking-widest uppercase text-white/30">{label}</p>
          <p className="text-sm font-medium text-white/75 truncate">{value}</p>
          {sub && <p className="text-[10px] text-white/30 truncate">{sub}</p>}
        </div>
      </div>
      {progress !== undefined && (
        <div className="h-1.5 rounded-full overflow-hidden ml-12" style={{ background: "rgba(255,255,255,0.06)" }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            transition={{ duration: 0.8, ease: "easeOut", delay: delay + 0.1 }}
            className="h-full rounded-full"
            style={{ background: progressColor || "linear-gradient(90deg, rgba(139,92,246,0.7), rgba(59,130,246,0.7))" }}
          />
        </div>
      )}
    </motion.div>
  );
}

/* ── Item Badge with icon ── */
function ItemBadge({ id, count, size = "normal" }: { id: string; count: number; size?: "normal" | "small" }) {
  const getIcon = (itemId: string) => {
    const i = itemId.toLowerCase();
    if (i.includes("sword") || i.includes("axe")) return "⚔️";
    if (i.includes("pickaxe")) return "⛏️";
    if (i.includes("shovel")) return "🪓";
    if (i.includes("bow")) return "🏹";
    if (i.includes("shield")) return "🛡️";
    if (i.includes("helmet") || i.includes("chestplate") || i.includes("leggings") || i.includes("boots")) return "🛡️";
    if (i.includes("diamond")) return "💎";
    if (i.includes("gold") || i.includes("golden")) return "✨";
    if (i.includes("iron")) return "⬜";
    if (i.includes("emerald")) return "💚";
    if (i.includes("apple") || i.includes("food") || i.includes("bread") || i.includes("meat") || i.includes("fish") || i.includes("cookie") || i.includes("cake")) return "🍎";
    if (i.includes("potion")) return "🧪";
    if (i.includes("book") || i.includes("enchanted")) return "📖";
    if (i.includes("block") || i.includes("stone") || i.includes("dirt") || i.includes("wood") || i.includes("log") || i.includes("plank")) return "🧱";
    if (i.includes("torch")) return "🔥";
    if (i.includes("bucket")) return "🪣";
    if (i.includes("arrow")) return "➡️";
    if (i.includes("ender") || i.includes("pearl")) return "🟣";
    if (i.includes("tnt")) return "💣";
    if (i.includes("bed")) return "🛏️";
    if (i.includes("chest")) return "📦";
    if (i.includes("furnace")) return "🔥";
    if (i.includes("crafting")) return "🔨";
    return "📦";
  };

  const isSmall = size === "small";
  return (
    <div
      className={`flex items-center gap-1.5 rounded-lg transition-all hover:scale-105 ${isSmall ? "px-1.5 py-0.5 text-[9px]" : "px-2.5 py-1.5 text-[10px]"}`}
      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <span className="select-none">{getIcon(id)}</span>
      <span className="text-white/50 truncate max-w-[100px]">{id}</span>
      <span className="text-white/30 font-mono">×{count}</span>
    </div>
  );
}

/* ═══════════════════════ NBT Parser ═══════════════════════ */
type NbtValue = number | bigint | string | NbtValue[] | { [key: string]: NbtValue } | null;

class NbtReader {
  private view: DataView;
  private pos: number;
  constructor(buffer: ArrayBuffer) { this.view = new DataView(buffer); this.pos = 0; }
  readByte(): number { const v = this.view.getInt8(this.pos); this.pos += 1; return v; }
  readUByte(): number { const v = this.view.getUint8(this.pos); this.pos += 1; return v; }
  readShort(): number { const v = this.view.getInt16(this.pos, false); this.pos += 2; return v; }
  readInt(): number { const v = this.view.getInt32(this.pos, false); this.pos += 4; return v; }
  readLong(): bigint { const hi = this.view.getInt32(this.pos, false); const lo = this.view.getUint32(this.pos + 4, false); this.pos += 8; return (BigInt(hi) << 32n) | BigInt(lo); }
  readFloat(): number { const v = this.view.getFloat32(this.pos, false); this.pos += 4; return v; }
  readDouble(): number { const v = this.view.getFloat64(this.pos, false); this.pos += 8; return v; }
  readString(): string { const len = this.readShort(); const bytes = new Uint8Array(this.view.buffer, this.view.byteOffset + this.pos, len); this.pos += len; return new TextDecoder().decode(bytes); }
  readIntArray(): number[] { const len = this.readInt(); const arr: number[] = []; for (let i = 0; i < len; i++) arr.push(this.readInt()); return arr; }
  readLongArray(): bigint[] { const len = this.readInt(); const arr: bigint[] = []; for (let i = 0; i < len; i++) arr.push(this.readLong()); return arr; }
  readList(): NbtValue[] { const tagType = this.readByte(); const len = this.readInt(); const list: NbtValue[] = []; for (let i = 0; i < len; i++) list.push(this.readPayload(tagType)); return list; }
  readCompound(): { [key: string]: NbtValue } {
    const obj: { [key: string]: NbtValue } = {};
    while (true) { const tagType = this.readByte(); if (tagType === 0) break; const name = this.readString(); obj[name] = this.readPayload(tagType); }
    return obj;
  }
  readPayload(type: number): NbtValue {
    switch (type) {
      case 1: return this.readByte(); case 2: return this.readShort(); case 3: return this.readInt();
      case 4: return this.readLong(); case 5: return this.readFloat(); case 6: return this.readDouble();
      case 7: { const len = this.readInt(); const arr = new Uint8Array(this.view.buffer, this.view.byteOffset + this.pos, len); this.pos += len; return Array.from(arr); }
      case 8: return this.readString(); case 9: return this.readList(); case 10: return this.readCompound();
      case 11: return this.readIntArray(); case 12: return this.readLongArray(); default: return null;
    }
  }
  parse(): { name: string; value: NbtValue } {
    const type = this.readByte(); if (type === 0) return { name: "", value: null };
    const name = this.readString(); return { name, value: this.readPayload(type) };
  }
}

async function decompressGzip(data: ArrayBuffer): Promise<ArrayBuffer> {
  const stream = new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream("gzip")));
  return await stream.arrayBuffer();
}

interface ItemData { id: string; count: number; slot: number; }
interface PlayerData {
  fileName: string; uuid: string; displayName: string;
  health: number; foodLevel: number; xpLevel: number; xpTotal: number;
  pos: [number, number, number]; dimension: string;
  inventory: ItemData[]; enderItems: ItemData[];
}

function extractItems(list: NbtValue): ItemData[] {
  if (!Array.isArray(list)) return [];
  return list.map((item: any) => ({
    id: String(item.id || "unknown").replace("minecraft:", ""),
    count: Number(item.Count || item.count || 0),
    slot: Number(item.Slot || item.slot || -1),
  })).filter(i => i.id !== "unknown" && i.count > 0);
}

function uuidFromNbt(nbt: any): string {
  if (nbt.UUID) return String(nbt.UUID);
  if (nbt.uuid) return String(nbt.uuid);
  return "";
}

async function parseDatFile(file: File): Promise<PlayerData> {
  const buf = await file.arrayBuffer();
  let decompressed: ArrayBuffer;
  try {
    decompressed = await decompressGzip(buf);
  } catch {
    throw new Error(`"${file.name}" is not a valid gzip file`);
  }
  const reader = new NbtReader(decompressed);
  const root = reader.parse();
  if (!root.value || typeof root.value !== "object") throw new Error(`"${file.name}" has invalid NBT structure`);
  const data = root.value as Record<string, NbtValue>;
  const rawUuid = uuidFromNbt(data);
  const pos = Array.isArray(data.Pos) ? data.Pos.map(Number) as [number, number, number] : [0, 0, 0];
  return {
    fileName: file.name.replace(/\.dat$/, ""),
    uuid: rawUuid,
    displayName: rawUuid || file.name.replace(/\.dat$/, ""),
    health: Number(data.Health || 0),
    foodLevel: Number(data.foodLevel || 0),
    xpLevel: Number(data.XpLevel || 0),
    xpTotal: Number(data.XpTotal || 0),
    pos,
    dimension: String(data.Dimension || "overworld"),
    inventory: extractItems(data.Inventory),
    enderItems: extractItems(data.EnderItems),
  };
}

/* ═══════════════════════ Component ═══════════════════════ */
export function InventoryInfo() {
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [playerDb, setPlayerDb] = useState<Map<string, string>>(new Map());
  const [dbLoaded, setDbLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    fetch(PLAYER_DB_URL)
      .then(r => r.json())
      .then((data: { uuid: string; name: string }[]) => {
        const map = new Map<string, string>();
        for (const p of data) {
          map.set(p.uuid.toLowerCase(), p.name);
          map.set(p.name.toLowerCase(), p.uuid);
        }
        setPlayerDb(map);
        setDbLoaded(true);
      })
      .catch(() => setDbLoaded(true));
  }, []);

  useEffect(() => {
    if (!dbLoaded || playerDb.size === 0) return;
    setPlayers(prev => prev.map(p => {
      const name = playerDb.get(p.uuid.toLowerCase());
      return name ? { ...p, displayName: name } : p;
    }));
  }, [dbLoaded, playerDb]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const start = () => vid.play().catch(() => {});
    if ("requestIdleCallback" in window) {
      (window as any).requestIdleCallback(start, { timeout: 1500 });
    } else {
      setTimeout(start, 600);
    }
  }, []);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    setLoading(true);
    const newPlayers: PlayerData[] = [];
    const newErrors: string[] = [];
    for (const file of Array.from(files)) {
      try {
        const pd = await parseDatFile(file);
        const resolvedName = playerDb.get(pd.uuid.toLowerCase());
        if (resolvedName) pd.displayName = resolvedName;
        newPlayers.push(pd);
      } catch (e: any) {
        newErrors.push(e.message || `Failed to parse ${file.name}`);
      }
    }
    setPlayers(prev => [...prev, ...newPlayers]);
    setErrors(prev => [...prev, ...newErrors]);
    setLoading(false);
  }, [playerDb]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const filteredPlayers = players.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return p.displayName.toLowerCase().includes(q) || p.uuid.toLowerCase().includes(q) || p.fileName.toLowerCase().includes(q);
  });

  const clearAll = () => { setPlayers([]); setErrors([]); setSearchQuery(""); };

  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ fontFamily: FONT, background: "rgba(0,0,0,0.0)" }}>
      {/* Video BG */}
      <div className="fixed inset-0" style={{ zIndex: -2 }}>
        <video
          ref={videoRef}
          loop muted playsInline preload="metadata" autoPlay
          className="w-full h-full object-cover"
          style={{ opacity: 0.38, backgroundColor: "#000010" }}
        >
          <source src={VIDEO_URL} type="video/mp4" />
        </video>
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)" }} />
      </div>

      <Navigation />

      <section className="relative min-h-screen flex flex-col items-center justify-start px-5 pt-28 pb-20">
        <div className="w-full max-w-3xl mx-auto">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mb-8"
          >
            <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-white/30 mb-2">Client-Side Tool</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white" style={{ fontFamily: FONT, fontWeight: 800 }}>
              Trình Search Inventory Player by Phan Trọng Khang
            </h2>
            <div className="mt-3 h-px rounded-full" style={{ width: 60, background: "linear-gradient(to right, rgba(255,255,255,0.5), transparent)" }} />
          </motion.div>

          {/* Search Box Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mb-6"
          >
            <AnimBorderCard speed={6} color="rgba(255,255,255,0.45)" radius={20} innerStyle={{ padding: "20px 24px" }}>
              <div className="relative group">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white/60 transition-colors" />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo UUID hoặc tên người chơi..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-sm text-white/90 placeholder:text-white/25 pl-12 pr-10 py-3"
                  style={{ fontFamily: FONT }}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                    <X size={16} />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3 mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <span className="text-[10px] text-white/25 tracking-widest uppercase">
                  {filteredPlayers.length}/{players.length} players
                </span>
                {dbLoaded && (
                  <span className="text-[10px] text-white/25 tracking-widest uppercase">
                    · {playerDb.size / 2} names loaded
                  </span>
                )}
              </div>
            </AnimBorderCard>
          </motion.div>

          {/* Upload Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mb-8"
          >
            <AnimBorderCard speed={7} color="rgba(255,255,255,0.4)" radius={20} innerStyle={{ padding: "24px" }}>
              <div
                onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"; }}
                onDragLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
                onDrop={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; onDrop(e); }}
                className="border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all"
                style={{ borderColor: "rgba(255,255,255,0.1)" }}
              >
                <label className="cursor-pointer flex flex-col items-center gap-3">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Upload size={32} className="text-white/30" />
                  </motion.div>
                  <div>
                    <p className="text-sm font-medium text-white/60">Kéo thả file .dat hoặc nhấn để chọn</p>
                    <p className="text-[10px] text-white/25 mt-1">Hỗ trợ nhiều file · Xử lý local · Không upload</p>
                  </div>
                  <input type="file" accept=".dat" multiple className="hidden" onChange={e => e.target.files && handleFiles(e.target.files)} />
                </label>
              </div>
              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 flex items-center justify-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-white/15 border-t-white/60 animate-spin" />
                  <span className="text-xs text-white/40">Đang phân tích...</span>
                </motion.div>
              )}
            </AnimBorderCard>
          </motion.div>

          {/* Errors */}
          <AnimatePresence>
            {errors.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="mb-6 overflow-hidden"
              >
                <div className="rounded-2xl p-4" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle size={14} style={{ color: "rgba(239,68,68,0.7)" }} />
                    <span className="text-xs font-semibold text-red-400/80 uppercase tracking-widest">Lỗi Parse</span>
                  </div>
                  {errors.map((err, i) => <p key={i} className="text-xs text-red-300/60 ml-5">· {err}</p>)}
                  <button onClick={() => setErrors([])} className="mt-3 ml-5 text-[10px] text-red-400/50 hover:text-red-400/80 transition-colors uppercase tracking-widest">Xóa</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Player Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredPlayers.map((player, i) => (
                <motion.div
                  key={`${player.uuid}-${player.fileName}`}
                  layout
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -20 }}
                  transition={{ duration: 0.5, delay: Math.min(i * 0.08, 0.4), ease: [0.16, 1, 0.3, 1] }}
                >
                  <AnimBorderCard speed={6} color="rgba(255,255,255,0.35)" radius={20} innerStyle={{ padding: "24px" }}>
                    {/* Player Header */}
                    <div className="flex items-center gap-3 mb-5">
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
                        <User size={20} style={{ color: "rgba(255,255,255,0.7)" }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-bold text-white/90 truncate" style={{ fontFamily: FONT }}>{player.displayName}</h3>
                        <p className="text-[10px] text-white/30 truncate font-mono">{player.uuid || player.fileName}</p>
                      </div>
                    </div>

                    {/* Stats Rows with Progress Bars */}
                    <div className="flex flex-col">
                      <StatRow
                        icon={Heart} label="Health"
                        value={`${player.health.toFixed(1)} / 20`}
                        delay={0.05}
                        progress={(player.health / 20) * 100}
                        progressColor="linear-gradient(90deg, rgba(239,68,68,0.7), rgba(251,146,60,0.7))"
                      />
                      <StatRow
                        icon={Star} label="XP Level"
                        value={String(player.xpLevel)}
                        sub={`${player.xpTotal} total XP`}
                        delay={0.1}
                        progress={Math.min(100, (player.xpLevel / 30) * 100)}
                        progressColor="linear-gradient(90deg, rgba(52,211,153,0.7), rgba(56,189,248,0.7))"
                      />
                      <StatRow
                        icon={Package} label="Food Level"
                        value={`${player.foodLevel} / 20`}
                        delay={0.15}
                        progress={(player.foodLevel / 20) * 100}
                        progressColor="linear-gradient(90deg, rgba(251,191,36,0.7), rgba(245,158,11,0.7))"
                      />
                      <StatRow
                        icon={MapPin} label="Position"
                        value={`${Math.round(player.pos[0])}, ${Math.round(player.pos[1])}, ${Math.round(player.pos[2])}`}
                        sub={player.dimension}
                        delay={0.2}
                      />
                    </div>

                    {/* Inventory Summary */}
                    <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="flex items-center gap-2 mb-3">
                        <Backpack size={14} style={{ color: "rgba(255,255,255,0.4)" }} />
                        <span className="text-[11px] font-semibold tracking-widest uppercase text-white/30">
                          Inventory ({player.inventory.length})
                        </span>
                      </div>
                      {player.inventory.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {player.inventory.slice(0, 18).map((item, j) => (
                            <ItemBadge key={j} id={item.id} count={item.count} />
                          ))}
                          {player.inventory.length > 18 && (
                            <span className="text-[10px] text-white/20 px-2 py-1">+{player.inventory.length - 18} more</span>
                          )}
                        </div>
                      ) : (
                        <p className="text-[10px] text-white/20 italic">Trống</p>
                      )}
                    </div>

                    {/* Ender Chest */}
                    {player.enderItems.length > 0 && (
                      <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                        <div className="flex items-center gap-2 mb-2">
                          <Box size={12} style={{ color: "rgba(255,255,255,0.3)" }} />
                          <span className="text-[10px] font-semibold tracking-widest uppercase text-white/25">
                            Ender Chest ({player.enderItems.length})
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {player.enderItems.slice(0, 12).map((item, j) => (
                            <ItemBadge key={j} id={item.id} count={item.count} size="small" />
                          ))}
                          {player.enderItems.length > 12 && <span className="text-[9px] text-white/15 px-1">+{player.enderItems.length - 12}</span>}
                        </div>
                      </div>
                    )}
                  </AnimBorderCard>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Empty State */}
          {!loading && players.length === 0 && errors.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
              className="text-center py-16"
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Package className="w-16 h-16 text-white/10 mx-auto mb-4" />
              </motion.div>
              <p className="text-sm text-white/20">Chưa có dữ liệu người chơi</p>
              <p className="text-[10px] text-white/10 mt-1">Upload file .dat từ world/playerdata/</p>
            </motion.div>
          )}

          {/* Clear button */}
          {players.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mt-8">
              <button
                onClick={clearAll}
                className="text-[11px] uppercase tracking-[0.2em] text-white/25 hover:text-white/50 transition-colors px-6 py-2 rounded-full hover:bg-white/5"
                style={{ border: "1px solid rgba(255,255,255,0.08)" }}
              >
                Xóa tất cả
              </button>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}
