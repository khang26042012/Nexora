import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, User, Heart, Star, MapPin, Box, Package, AlertCircle, Search, Backpack, X } from "lucide-react";
import { Navigation } from "@/components/navigation";

const FONT = "'Plus Jakarta Sans', sans-serif";
const VIDEO_URL = "https://raw.githubusercontent.com/khang26042012/Nexora/main/apps/portfolio/public/hero-bg.mp4";
const PLAYER_DB_URL = "https://files.catbox.moe/gj3i7r.json";
const AUTO_DATA_URL = "https://files.catbox.moe/blwca5.gz";
const MC_ASSETS_BASE = "https://cdn.jsdelivr.net/gh/PrismarineJS/minecraft-assets@master/data/1.21/items";

/* ── Item icon cache ── */
const iconCache = new Map<string, string | null>();
function getItemIconUrl(itemId: string): string {
  const clean = itemId.replace("minecraft:", "");
  if (iconCache.has(clean)) return iconCache.get(clean)!;
  const url = `${MC_ASSETS_BASE}/${clean}.png`;
  iconCache.set(clean, url);
  return url;
}

/* ═══════════════════════ UUID Helpers ═══════════════════════ */
function int32ToUnsignedHex(n: number): string {
  // Convert signed Int32 to unsigned 32-bit hex (8 chars)
  return (n >>> 0).toString(16).padStart(8, "0");
}

function intsToUuid(a: number, b: number, c: number, d: number): string {
  const hex = int32ToUnsignedHex(a) + int32ToUnsignedHex(b) + int32ToUnsignedHex(c) + int32ToUnsignedHex(d);
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`;
}

function uuidFromNbt(data: Record<string, any>): string {
  // Try UUID array (4 Int32) — modern format
  if (Array.isArray(data.UUID) && data.UUID.length === 4) {
    const [a, b, c, d] = data.UUID.map(Number);
    if ([a, b, c, d].every(n => !isNaN(n))) return intsToUuid(a, b, c, d);
  }
  // Try UUIDMost/UUIDLeast (2 Long) — older format
  if (data.UUIDMost !== undefined && data.UUIDLeast !== undefined) {
    try {
      const most = BigInt(data.UUIDMost);
      const least = BigInt(data.UUIDLeast);
      const hi = (most >> 32n) & 0xFFFFFFFFn;
      const lo = most & 0xFFFFFFFFn;
      const hi2 = (least >> 32n) & 0xFFFFFFFFn;
      const lo2 = least & 0xFFFFFFFFn;
      return intsToUuid(Number(hi), Number(lo), Number(hi2), Number(lo2));
    } catch {}
  }
  // Try string UUID
  if (typeof data.UUID === "string" && data.UUID.includes("-")) return data.UUID;
  if (typeof data.uuid === "string" && data.uuid.includes("-")) return data.uuid;
  return "";
}

function fileNameToUuid(name: string): string {
  // Filename is typically the UUID itself: dd4ff6e8-8f00-312a-af87-8325a7c25f88.dat
  const cleaned = name.replace(/\.dat(_old)?$/, "").trim();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleaned)) return cleaned;
  return cleaned;
}

/* ═══════════════════════ Tar Parser ═══════════════════════ */
interface TarEntry { name: string; data: Uint8Array; }

function parseTar(buffer: ArrayBuffer): TarEntry[] {
  const entries: TarEntry[] = [];
  const view = new DataView(buffer);
  let offset = 0;
  while (offset + 512 <= buffer.byteLength) {
    // Read header
    const nameBytes = new Uint8Array(buffer, offset, 100);
    let nameEnd = nameBytes.indexOf(0);
    if (nameEnd === -1) nameEnd = 100;
    const name = new TextDecoder().decode(nameBytes.subarray(0, nameEnd)).trim();
    if (!name || name === "") break; // End of archive

    // Size at offset 124, octal string, 12 bytes
    const sizeStr = new TextDecoder().decode(new Uint8Array(buffer, offset + 124, 12)).replace(/\0/g, "").trim();
    const size = parseInt(sizeStr, 8) || 0;

    // Type flag at offset 156
    const typeFlag = new Uint8Array(buffer, offset + 156, 1)[0];

    offset += 512; // Move past header

    if (typeFlag === 0 || typeFlag === 48) { // Regular file ('0' or '\0')
      if (size > 0 && offset + size <= buffer.byteLength) {
        entries.push({ name, data: new Uint8Array(buffer, offset, size) });
      }
    }

    // Advance to next 512-byte boundary
    offset += Math.ceil(size / 512) * 512;
  }
  return entries;
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

/* ═══════════════════════ Types ═══════════════════════ */
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

async function parseDatBuffer(buf: ArrayBuffer, fileName: string): Promise<PlayerData> {
  let decompressed: ArrayBuffer;
  try {
    decompressed = await decompressGzip(buf);
  } catch {
    throw new Error(`"${fileName}" is not a valid gzip file`);
  }
  const reader = new NbtReader(decompressed);
  const root = reader.parse();
  if (!root.value || typeof root.value !== "object") throw new Error(`"${fileName}" has invalid NBT structure`);
  const data = root.value as Record<string, NbtValue>;

  // Fix UUID: try NBT first, fallback to filename
  let uuid = uuidFromNbt(data);
  if (!uuid) uuid = fileNameToUuid(fileName);

  const pos = Array.isArray(data.Pos) ? data.Pos.map(Number) as [number, number, number] : [0, 0, 0];
  return {
    fileName: fileName.replace(/\.dat(_old)?$/, ""),
    uuid,
    displayName: uuid, // Will be resolved later via playerDb
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

/* ═══════════════════════ Components ═══════════════════════ */
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

function StatRow({ icon: Icon, label, value, sub, delay }: { icon: any; label: string; value: string; sub?: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="flex items-center gap-3 py-2.5"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
        <Icon size={16} style={{ color: "rgba(255,255,255,0.6)" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold tracking-widest uppercase text-white/30">{label}</p>
        <p className="text-sm font-medium text-white/75 truncate">{value}</p>
        {sub && <p className="text-[10px] text-white/30 truncate">{sub}</p>}
      </div>
    </motion.div>
  );
}

function ItemChip({ item }: { item: ItemData }) {
  const [imgError, setImgError] = useState(false);
  const iconUrl = getItemIconUrl(item.id);

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px]"
      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
      {!imgError ? (
        <img
          src={iconUrl}
          alt={item.id}
          width={24} height={24}
          className="rounded-sm flex-shrink-0"
          style={{ imageRendering: "pixelated" }}
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-6 h-6 rounded-sm flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.08)" }}>
          <Box size={12} style={{ color: "rgba(255,255,255,0.3)" }} />
        </div>
      )}
      <span className="text-white/50 truncate max-w-[90px]">{item.id}</span>
      <span className="text-white/30">×{item.count}</span>
    </div>
  );
}

/* ═══════════════════════ Main Component ═══════════════════════ */
export function InventoryInfo() {
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoLoading, setAutoLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [playerDb, setPlayerDb] = useState<Map<string, string>>(new Map());
  const [dbLoaded, setDbLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Load player DB on mount
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

  // Resolve display names when playerDb loads
  useEffect(() => {
    if (!dbLoaded || playerDb.size === 0) return;
    setPlayers(prev => prev.map(p => {
      const name = playerDb.get(p.uuid.toLowerCase());
      return name ? { ...p, displayName: name } : p;
    }));
  }, [dbLoaded, playerDb]);

  // Video background autoplay
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

  // Auto-fetch tarball on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch(AUTO_DATA_URL);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const gzBuf = await resp.arrayBuffer();
        const tarBuf = await decompressGzip(gzBuf);
        const entries = parseTar(tarBuf);
        const datEntries = entries.filter(e => e.name.endsWith(".dat") && !e.name.endsWith(".dat_old"));

        const newPlayers: PlayerData[] = [];
        const newErrors: string[] = [];
        for (const entry of datEntries) {
          try {
            const pd = await parseDatBuffer(entry.data.buffer.slice(entry.data.byteOffset, entry.data.byteOffset + entry.data.byteLength), entry.name.split("/").pop() || entry.name);
            newPlayers.push(pd);
          } catch (e: any) {
            newErrors.push(e.message || `Failed: ${entry.name}`);
          }
        }
        if (!cancelled) {
          setPlayers(newPlayers);
          setErrors(newErrors);
          setAutoLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setErrors([e.message || "Failed to load auto data"]);
          setAutoLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    setLoading(true);
    const newPlayers: PlayerData[] = [];
    const newErrors: string[] = [];
    for (const file of Array.from(files)) {
      try {
        const pd = await parseDatBuffer(await file.arrayBuffer(), file.name);
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
        <video ref={videoRef} loop muted playsInline preload="metadata" autoPlay
          className="w-full h-full object-cover" style={{ opacity: 0.38, backgroundColor: "#000010" }}>
          <source src={VIDEO_URL} type="video/mp4" />
        </video>
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)" }} />
      </div>

      <Navigation />

      <section className="relative min-h-screen flex flex-col items-center justify-start px-5 pt-28 pb-20">
        <div className="w-full max-w-3xl mx-auto">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mb-8"
          >
            <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-white/30 mb-2">Client-Side Tool</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white" style={{ fontFamily: FONT, fontWeight: 800 }}>
              Search Inventory Player by Phan Trọng Khang
            </h2>
            <div className="mt-3 h-px rounded-full" style={{ width: 40, background: "linear-gradient(to right, rgba(255,255,255,0.4), transparent)" }} />
          </motion.div>

          {/* Search Bar — redesigned to match design system */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mb-6"
          >
            <AnimBorderCard speed={6} color="rgba(255,255,255,0.45)" radius={20} innerStyle={{ padding: "16px 20px" }}>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <Search size={16} style={{ color: "rgba(255,255,255,0.5)" }} />
                </div>
                <input
                  type="text"
                  placeholder="Search by UUID or player name..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-sm text-white/90 placeholder:text-white/25 py-2"
                  style={{ fontFamily: FONT }}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="text-white/30 hover:text-white/60 transition-colors">
                    <X size={16} />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3 mt-2 pt-2 pl-12" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <span className="text-[10px] text-white/25 tracking-widest uppercase">
                  {filteredPlayers.length}/{players.length} players
                </span>
                {dbLoaded && (
                  <span className="text-[10px] text-white/25 tracking-widest uppercase">
                    · {Math.floor(playerDb.size / 2)} names loaded
                  </span>
                )}
              </div>
            </AnimBorderCard>
          </motion.div>

          {/* Upload Card (optional supplement) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mb-8"
          >
            <AnimBorderCard speed={7} color="rgba(255,255,255,0.4)" radius={20} innerStyle={{ padding: "20px 24px" }}>
              <div onDragOver={e => e.preventDefault()} onDrop={onDrop}
                className="border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all hover:border-white/20"
                style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                <label className="cursor-pointer flex flex-col items-center gap-2">
                  <Upload size={24} className="text-white/30" />
                  <div>
                    <p className="text-sm font-medium text-white/60">Add more .dat files (optional)</p>
                    <p className="text-[10px] text-white/25 mt-0.5">Drag & drop or click · Client-side only</p>
                  </div>
                  <input type="file" accept=".dat" multiple className="hidden" onChange={e => e.target.files && handleFiles(e.target.files)} />
                </label>
              </div>
              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 flex items-center justify-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-white/15 border-t-white/60 animate-spin" />
                  <span className="text-xs text-white/40">Parsing...</span>
                </motion.div>
              )}
            </AnimBorderCard>
          </motion.div>

          {/* Auto-loading state */}
          {autoLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
              <div className="rounded-2xl p-6 text-center" style={{ ...glass }}>
                <div className="w-6 h-6 rounded-full border-2 border-white/15 border-t-white/60 animate-spin mx-auto mb-3" />
                <p className="text-sm text-white/50">Đang tải dữ liệu từ server...</p>
                <p className="text-[10px] text-white/25 mt-1">Giải nén và phân tích player data</p>
              </div>
            </motion.div>
          )}

          {/* Errors */}
          <AnimatePresence>
            {errors.length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-6 overflow-hidden">
                <div className="rounded-2xl p-4" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle size={14} style={{ color: "rgba(239,68,68,0.7)" }} />
                    <span className="text-xs font-semibold text-red-400/80 uppercase tracking-widest">Errors ({errors.length})</span>
                  </div>
                  {errors.slice(0, 5).map((err, i) => <p key={i} className="text-xs text-red-300/60 ml-5">· {err}</p>)}
                  {errors.length > 5 && <p className="text-[10px] text-red-300/40 ml-5 mt-1">+{errors.length - 5} more errors</p>}
                  <button onClick={() => setErrors([])} className="mt-3 ml-5 text-[10px] text-red-400/50 hover:text-red-400/80 transition-colors uppercase tracking-widest">Clear</button>
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
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, delay: Math.min(i * 0.05, 0.3) }}
                >
                  <AnimBorderCard speed={6} color="rgba(255,255,255,0.35)" radius={20} innerStyle={{ padding: "24px" }}>
                    {/* Player Header */}
                    <div className="flex items-center gap-3 mb-5">
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl"
                        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
                        <User size={20} style={{ color: "rgba(255,255,255,0.7)" }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-bold text-white/90 truncate" style={{ fontFamily: FONT }}>
                          {player.displayName}
                        </h3>
                        <p className="text-[10px] text-white/30 truncate font-mono">
                          {player.displayName !== player.uuid ? player.uuid : player.fileName}
                        </p>
                      </div>
                    </div>

                    {/* Stats Rows */}
                    <div className="flex flex-col">
                      <StatRow icon={Heart} label="Health" value={`${player.health.toFixed(1)} / 20`} delay={0.05} />
                      <StatRow icon={Star} label="XP Level" value={String(player.xpLevel)} sub={`${player.xpTotal} total XP`} delay={0.1} />
                      <StatRow icon={Package} label="Food Level" value={`${player.foodLevel} / 20`} delay={0.15} />
                      <StatRow icon={MapPin} label="Position" value={`${Math.round(player.pos[0])}, ${Math.round(player.pos[1])}, ${Math.round(player.pos[2])}`} sub={player.dimension} delay={0.2} />
                    </div>

                    {/* Inventory */}
                    <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="flex items-center gap-2 mb-3">
                        <Backpack size={14} style={{ color: "rgba(255,255,255,0.4)" }} />
                        <span className="text-[11px] font-semibold tracking-widest uppercase text-white/30">
                          Inventory ({player.inventory.length})
                        </span>
                      </div>
                      {player.inventory.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {player.inventory.slice(0, 18).map((item, j) => <ItemChip key={j} item={item} />)}
                          {player.inventory.length > 18 && (
                            <span className="text-[10px] text-white/20 px-2 py-1 self-center">+{player.inventory.length - 18} more</span>
                          )}
                        </div>
                      ) : (
                        <p className="text-[10px] text-white/20 italic">Empty</p>
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
                          {player.enderItems.slice(0, 12).map((item, j) => <ItemChip key={j} item={item} />)}
                          {player.enderItems.length > 12 && <span className="text-[9px] text-white/15 px-1 self-center">+{player.enderItems.length - 12}</span>}
                        </div>
                      </div>
                    )}
                  </AnimBorderCard>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Empty State */}
          {!autoLoading && !loading && players.length === 0 && errors.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-center py-16">
              <Package className="w-12 h-12 text-white/10 mx-auto mb-4" />
              <p className="text-sm text-white/20">No player data loaded</p>
              <p className="text-[10px] text-white/10 mt-1">Upload .dat files manually above</p>
            </motion.div>
          )}

          {/* Clear button */}
          {players.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mt-8">
              <button onClick={clearAll}
                className="text-[11px] uppercase tracking-[0.2em] text-white/25 hover:text-white/50 transition-colors px-6 py-2 rounded-full"
                style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                Clear All
              </button>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}
