import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, User, Heart, Star, MapPin, Box, Package, AlertCircle, FileSearch, ChevronDown, Backpack, Sword, Shield } from "lucide-react";
import { Navigation } from "@/components/navigation";

const FONT = "'Plus Jakarta Sans', sans-serif";

/* ── Glass style (exact copy from Home.tsx) ── */
const glass: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 20,
};

/* ── AnimBorderCard (exact copy from Home.tsx) ── */
function AnimBorderCard({
  children,
  className = "",
  speed = 4,
  color = "rgba(255,255,255,0.85)",
  radius = 20,
  innerStyle = {},
  glowOnHover: _goh = false,
  animate = true,
}: {
  children: React.ReactNode;
  className?: string;
  speed?: number;
  color?: string;
  radius?: number;
  innerStyle?: React.CSSProperties;
  glowOnHover?: boolean;
  animate?: boolean;
}) {
  return (
    <div
      className={`running-border ${!animate ? "animation-paused" : ""} ${className}`}
      style={{
        "--rb-speed": `${speed}s`,
        "--rb-color": color,
        "--rb-radius": `${radius}px`,
        background: "rgba(255,255,255,0.04)",
        ...innerStyle,
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

/* ── SectionHeader (exact copy from Home.tsx) ── */
function SectionHeader({ label, title }: { label: string; title: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-white/30 mb-2">
        {label}
      </p>
      <h2 className="text-3xl sm:text-4xl font-bold text-white" style={{ fontFamily: FONT, fontWeight: 800 }}>
        {title}
      </h2>
      <div
        className="mt-3 h-px rounded-full"
        style={{ width: 40, background: "linear-gradient(to right, rgba(255,255,255,0.4), transparent)" }}
      />
    </motion.div>
  );
}

// ═══════════════════════ NBT Parser (unchanged) ═══════════════════════
type NbtValue = number | bigint | string | NbtValue[] | { [key: string]: NbtValue } | null;

class NbtReader {
  private view: DataView;
  private pos: number;

  constructor(buffer: ArrayBuffer) {
    this.view = new DataView(buffer);
    this.pos = 0;
  }

  readByte(): number { const v = this.view.getInt8(this.pos); this.pos += 1; return v; }
  readUByte(): number { const v = this.view.getUint8(this.pos); this.pos += 1; return v; }
  readShort(): number { const v = this.view.getInt16(this.pos, false); this.pos += 2; return v; }
  readInt(): number { const v = this.view.getInt32(this.pos, false); this.pos += 4; return v; }
  readLong(): bigint { const hi = this.view.getInt32(this.pos, false); const lo = this.view.getUint32(this.pos + 4, false); this.pos += 8; return (BigInt(hi) << 32n) | BigInt(lo); }
  readFloat(): number { const v = this.view.getFloat32(this.pos, false); this.pos += 4; return v; }
  readDouble(): number { const v = this.view.getFloat64(this.pos, false); this.pos += 8; return v; }
  readString(): string { const len = this.readShort(); const bytes = new Uint8Array(this.view.buffer, this.view.byteOffset + this.pos, len); this.pos += len; return new TextDecoder().decode(bytes); }
  readByteArray(): number[] { const len = this.readInt(); const arr: number[] = []; for (let i = 0; i < len; i++) arr.push(this.readByte()); return arr; }
  readIntArray(): number[] { const len = this.readInt(); const arr: number[] = []; for (let i = 0; i < len; i++) arr.push(this.readInt()); return arr; }
  readLongArray(): bigint[] { const len = this.readInt(); const arr: bigint[] = []; for (let i = 0; i < len; i++) arr.push(this.readLong()); return arr; }
  readList(): NbtValue[] { const tagType = this.readByte(); const len = this.readInt(); const list: NbtValue[] = []; for (let i = 0; i < len; i++) list.push(this.readPayload(tagType)); return list; }
  readCompound(): { [key: string]: NbtValue } { const obj: { [key: string]: NbtValue } = {}; while (true) { const tagType = this.readByte(); if (tagType === 0) break; const name = this.readString(); obj[name] = this.readPayload(tagType); } return obj; }
  readPayload(tagType: number): NbtValue {
    switch (tagType) {
      case 1: return this.readByte(); case 2: return this.readShort(); case 3: return this.readInt();
      case 4: return this.readLong(); case 5: return this.readFloat(); case 6: return this.readDouble();
      case 7: return this.readByteArray(); case 8: return this.readString(); case 9: return this.readList();
      case 10: return this.readCompound(); case 11: return this.readIntArray(); case 12: return this.readLongArray();
      default: throw new Error(`Unknown NBT tag type: ${tagType}`);
    }
  }
  parse(): { name: string; value: NbtValue } {
    const rootType = this.readByte();
    if (rootType !== 10) throw new Error(`Expected TAG_Compound (10), got ${rootType}`);
    const rootName = this.readString();
    const rootValue = this.readCompound();
    return { name: rootName, value: rootValue };
  }
}

async function decompressGzip(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  if (typeof DecompressionStream !== "undefined") {
    const ds = new DecompressionStream("gzip");
    const writer = ds.writable.getWriter();
    const reader = ds.readable.getReader();
    writer.write(new Uint8Array(buffer));
    writer.close();
    const chunks: Uint8Array[] = [];
    let totalLen = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      totalLen += value.length;
    }
    const result = new Uint8Array(totalLen);
    let offset = 0;
    for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
    return result.buffer;
  }
  throw new Error("DecompressionStream not supported in this browser");
}

interface ItemData { id: string; count: number; slot: number; }
interface PlayerData {
  fileName: string; uuid: string; health: number; foodLevel: number;
  xpLevel: number; xpTotal: number; pos: [number, number, number] | null;
  dimension: string; inventory: ItemData[]; enderItems: ItemData[];
}

function extractPlayerData(nbt: any, fileName: string): PlayerData {
  const data = nbt.value || nbt;
  const uuid = data.UUID || fileName.replace(".dat", "");
  const health = typeof data.Health === "number" ? data.Health : (typeof data.health === "number" ? data.health : 0);
  const foodLevel = data.foodLevel ?? 0;
  const xpLevel = data.XpLevel ?? 0;
  const xpTotal = data.XpTotal ?? 0;
  let pos: [number, number, number] | null = null;
  if (Array.isArray(data.Pos) && data.Pos.length >= 3) pos = [Number(data.Pos[0]), Number(data.Pos[1]), Number(data.Pos[2])];
  const dimension = data.Dimension || "unknown";
  const parseItems = (items: any[]): ItemData[] => {
    if (!Array.isArray(items)) return [];
    return items.map((item: any) => ({
      id: item.id || "minecraft:air",
      count: typeof item.Count === "number" ? item.Count : (typeof item.count === "number" ? item.count : 1),
      slot: typeof item.Slot === "number" ? item.Slot : (typeof item.slot === "number" ? item.slot : -1),
    })).filter(i => i.id !== "minecraft:air");
  };
  return { fileName, uuid, health, foodLevel, xpLevel, xpTotal, pos, dimension, inventory: parseItems(data.Inventory || []), enderItems: parseItems(data.EnderItems || []) };
}

function shortenItemId(id: string): string { return id.replace(/^minecraft:/, ""); }

// ═══════════════════════ UI Components ═══════════════════════

function ItemRow({ item }: { item: ItemData }) {
  return (
    <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center gap-2 min-w-0">
        <Box className="w-3.5 h-3.5 text-white/25 flex-shrink-0" />
        <span className="text-xs font-medium text-white/55 truncate">{shortenItemId(item.id)}</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[10px] text-white/25">Slot {item.slot}</span>
        <span className="text-[11px] font-bold text-white/65 px-1.5 py-0.5 rounded-md" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>×{item.count}</span>
      </div>
    </div>
  );
}

function StatBadge({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl" style={{ ...glass, borderRadius: 14 }}>
      <Icon className="w-4 h-4 flex-shrink-0" style={{ color }} />
      <div className="min-w-0">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-white/25">{label}</p>
        <p className="text-xs font-bold text-white/70 truncate">{value}</p>
      </div>
    </div>
  );
}

function PlayerCard({ player, index }: { player: PlayerData; index: number }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.93 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.65, delay: index * 0.12, ease: [0.16, 1, 0.3, 1] }}
    >
      <AnimBorderCard speed={6} color="rgba(130,255,180,0.5)" radius={20} innerStyle={{ padding: "24px" }}>
        {/* Header */}
        <div className="flex items-start justify-between mb-5 cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
              <User className="w-5 h-5 text-white/50" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white/90 truncate" style={{ fontFamily: FONT }}>{player.uuid}</h3>
              <p className="text-[10px] text-white/30 truncate">{player.fileName}</p>
            </div>
          </div>
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-4 h-4 text-white/30" />
          </motion.div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <StatBadge icon={Heart} label="HP" value={`${Math.round(player.health)}/20`} color="rgba(255,100,100,0.7)" />
          <StatBadge icon={Package} label="Food" value={`${player.foodLevel}/20`} color="rgba(255,180,100,0.7)" />
          <StatBadge icon={Star} label="XP Lvl" value={String(player.xpLevel)} color="rgba(100,255,100,0.7)" />
          <StatBadge icon={MapPin} label="Dim" value={String(player.dimension).replace("minecraft:", "")} color="rgba(100,180,255,0.7)" />
        </div>

        {/* Position */}
        {player.pos && (
          <div className="mb-4 px-3 py-2 rounded-xl text-xs text-white/40" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            📍 X: {Math.round(player.pos[0])} · Y: {Math.round(player.pos[1])} · Z: {Math.round(player.pos[2])}
          </div>
        )}

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              {/* Inventory */}
              <div className="mb-3">
                <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-white/30 mb-2">
                  Inventory ({player.inventory.length} items)
                </p>
                {player.inventory.length > 0 ? (
                  <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
                    {player.inventory.sort((a, b) => a.slot - b.slot).map((item, i) => (
                      <ItemRow key={i} item={item} />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-white/20 italic">Empty</p>
                )}
              </div>

              {/* Ender Chest */}
              {player.enderItems.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-white/30 mb-2">
                    Ender Chest ({player.enderItems.length} items)
                  </p>
                  <div className="flex flex-col gap-1 max-h-32 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
                    {player.enderItems.sort((a, b) => a.slot - b.slot).map((item, i) => (
                      <ItemRow key={i} item={item} />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </AnimBorderCard>
    </motion.div>
  );
}

// ═══════════════════════ Main Page ═══════════════════════

export function InventoryInfo() {
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [errors, setErrors] = useState<{ file: string; error: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const processFiles = useCallback(async (files: File[]) => {
    setLoading(true);
    const newPlayers: PlayerData[] = [];
    const newErrors: { file: string; error: string }[] = [];
    for (const file of files) {
      if (!file.name.endsWith(".dat")) { newErrors.push({ file: file.name, error: "Not a .dat file" }); continue; }
      try {
        const buffer = await file.arrayBuffer();
        const decompressed = await decompressGzip(buffer);
        const reader = new NbtReader(decompressed);
        const nbt = reader.parse();
        newPlayers.push(extractPlayerData(nbt, file.name));
      } catch (e: any) {
        newErrors.push({ file: file.name, error: e.message || "Unknown parse error" });
      }
    }
    setPlayers(prev => [...prev, ...newPlayers]);
    setErrors(prev => [...prev, ...newErrors]);
    setLoading(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) { processFiles(Array.from(e.target.files)); e.target.value = ""; }
  }, [processFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    if (e.dataTransfer.files.length > 0) processFiles(Array.from(e.dataTransfer.files));
  }, [processFiles]);

  const clearAll = () => { setPlayers([]); setErrors([]); };

  return (
    <div className="min-h-screen bg-[#000010] text-white relative overflow-x-hidden">
      <Navigation />

      <section className="relative py-24 px-5">
        <div className="max-w-4xl mx-auto">
          <SectionHeader label="Minecraft Tools" title="Inventory Info" />

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-4 text-white/40 text-sm max-w-lg"
          >
            Parse Minecraft player <code className="text-white/60 bg-white/5 px-1 rounded">.dat</code> files locally in your browser.
            No data is uploaded — everything stays on your device.
          </motion.p>

          {/* Upload Area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mt-10"
          >
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className="relative group cursor-pointer"
            >
              <input type="file" multiple accept=".dat" onChange={handleFileSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
              <AnimBorderCard speed={5} color="rgba(130,255,180,0.4)" radius={20}>
                <div
                  className="flex flex-col items-center justify-center py-10 px-6 transition-all duration-300"
                  style={{
                    background: dragOver ? "rgba(130,255,180,0.06)" : "rgba(255,255,255,0.02)",
                  }}
                >
                  <Upload className={`w-8 h-8 mb-3 transition-colors ${dragOver ? "text-emerald-400" : "text-white/30 group-hover:text-emerald-400"}`} />
                  <p className="text-sm font-medium text-white/50 group-hover:text-white/70 transition-colors">
                    Drop <code className="text-white/60">.dat</code> files here or click to browse
                  </p>
                  <p className="text-[10px] text-white/25 mt-1">Supports multiple files • Client-side only</p>
                </div>
              </AnimBorderCard>
            </div>
          </motion.div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 rounded-full border-2 border-white/15 border-t-emerald-400 animate-spin" />
              <span className="ml-3 text-sm text-white/40">Parsing files...</span>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-6 mb-6">
              {errors.map((err, i) => (
                <div key={i} className="flex items-center gap-2 px-4 py-3 rounded-xl mb-2" style={{ background: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.15)" }}>
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-red-300 truncate">{err.file}</p>
                    <p className="text-[10px] text-red-400/60 truncate">{err.error}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* Results Header */}
          {players.length > 0 && (
            <div className="flex items-center justify-between mt-8 mb-4">
              <p className="text-xs text-white/30">{players.length} player(s) loaded</p>
              <button onClick={clearAll} className="text-xs text-white/30 hover:text-white/60 transition-colors">Clear all</button>
            </div>
          )}

          {/* Player Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {players.map((player, i) => (
              <PlayerCard key={`${player.fileName}-${i}`} player={player} index={i} />
            ))}
          </div>

          {/* Empty State */}
          {!loading && players.length === 0 && errors.length === 0 && (
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.4 }} className="text-center py-16">
              <Backpack className="w-12 h-12 text-white/10 mx-auto mb-4" />
              <p className="text-sm text-white/20">No files loaded yet</p>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}
