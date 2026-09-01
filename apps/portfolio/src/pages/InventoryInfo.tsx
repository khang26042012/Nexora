import { useState, useEffect, useRef } from "react";
import { User, Heart, Star, MapPin, Package, Box, Search, X, Shield, Sword } from "lucide-react";
import { Navigation } from "@/components/navigation";

const FONT = "'Plus Jakarta Sans', sans-serif";
const VIDEO_URL = "https://raw.githubusercontent.com/khang26042012/Nexora/main/apps/portfolio/public/hero-bg.mp4";
const PLAYER_DB_URL = "https://files.catbox.moe/gj3i7r.json";
const AUTO_DATA_URL = "https://raw.githubusercontent.com/khang26042012/Nexora/main/archive-2026-09-01T100113%2B0700.tar.gz";

/* ── Item icon cache ── */
const iconCache = new Map<string, string>();
const MC_ICON_BASE = "https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@1.20.4/assets/minecraft/textures/item";
function getItemIconUrl(itemId: string): string {
  const clean = itemId.replace("minecraft:", "");
  if (iconCache.has(clean)) return iconCache.get(clean)!;
  const url = `${MC_ICON_BASE}/${clean}.png`;
  iconCache.set(clean, url);
  return url;
}

/* ═══════════════════════ UUID Helpers ═══════════════════════ */
function int32ToUnsignedHex(n: number): string {
  return (n >>> 0).toString(16).padStart(8, "0");
}
function intsToUuid(a: number, b: number, c: number, d: number): string {
  const hex = int32ToUnsignedHex(a) + int32ToUnsignedHex(b) + int32ToUnsignedHex(c) + int32ToUnsignedHex(d);
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`;
}
function uuidFromNbt(data: Record<string, any>): string {
  if (Array.isArray(data.UUID) && data.UUID.length === 4) {
    const [a, b, c, d] = data.UUID.map(Number);
    if ([a, b, c, d].every(n => !isNaN(n))) return intsToUuid(a, b, c, d);
  }
  if (data.UUIDMost !== undefined && data.UUIDLeast !== undefined) {
    try {
      const most = BigInt(data.UUIDMost);
      const least = BigInt(data.UUIDLeast);
      return intsToUuid(Number((most >> 32n) & 0xFFFFFFFFn), Number(most & 0xFFFFFFFFn), Number((least >> 32n) & 0xFFFFFFFFn), Number(least & 0xFFFFFFFFn));
    } catch {}
  }
  if (typeof data.UUID === "string" && data.UUID.includes("-")) return data.UUID.toLowerCase();
  if (typeof data.uuid === "string" && data.uuid.includes("-")) return data.uuid.toLowerCase();
  return "";
}
function fileNameToUuid(name: string): string {
  const cleaned = name.replace(/\.dat(_old)?$/, "").trim().toLowerCase();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleaned)) return cleaned;
  return cleaned;
}

/* ═══════════════════════ Tar Parser ═══════════════════════ */
interface TarEntry { name: string; data: Uint8Array; }
function parseTar(buffer: ArrayBuffer): TarEntry[] {
  const entries: TarEntry[] = [];
  let offset = 0;
  while (offset + 512 <= buffer.byteLength) {
    const nameBytes = new Uint8Array(buffer, offset, 100);
    let nameEnd = nameBytes.indexOf(0);
    if (nameEnd === -1) nameEnd = 100;
    const name = new TextDecoder().decode(nameBytes.subarray(0, nameEnd)).trim();
    if (!name) break;
    const sizeStr = new TextDecoder().decode(new Uint8Array(buffer, offset + 124, 12)).replace(/\0/g, "").trim();
    const size = parseInt(sizeStr, 8) || 0;
    const typeFlag = new Uint8Array(buffer, offset + 156, 1)[0];
    offset += 512;
    if ((typeFlag === 0 || typeFlag === 48) && size > 0 && offset + size <= buffer.byteLength) {
      entries.push({ name, data: new Uint8Array(buffer, offset, size) });
    }
    offset += Math.ceil(size / 512) * 512;
  }
  return entries;
}

/* ═══════════════════════ NBT Parser ═══════════════════════ */
type NbtValue = number | bigint | string | NbtValue[] | { [key: string]: NbtValue } | null;
class NbtReader {
  private view: DataView; private pos: number;
  constructor(buffer: ArrayBuffer) { this.view = new DataView(buffer); this.pos = 0; }
  readByte(): number { const v = this.view.getInt8(this.pos); this.pos += 1; return v; }
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
    while (true) { const t = this.readByte(); if (t === 0) break; obj[this.readString()] = this.readPayload(t); }
    return obj;
  }
  readPayload(type: number): NbtValue {
    switch (type) {
      case 1: return this.readByte(); case 2: return this.readShort(); case 3: return this.readInt();
      case 4: return this.readLong(); case 5: return this.readFloat(); case 6: return this.readDouble();
      case 7: { const len = this.readInt(); const a = new Uint8Array(this.view.buffer, this.view.byteOffset + this.pos, len); this.pos += len; return Array.from(a); }
      case 8: return this.readString(); case 9: return this.readList(); case 10: return this.readCompound();
      case 11: return this.readIntArray(); case 12: return this.readLongArray(); default: return null;
    }
  }
  parse(): { name: string; value: NbtValue } {
    const t = this.readByte(); if (t === 0) return { name: "", value: null };
    return { name: this.readString(), value: this.readPayload(t) };
  }
}

async function decompressGzip(data: ArrayBuffer): Promise<ArrayBuffer> {
  const s = new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream("gzip")));
  return await s.arrayBuffer();
}

/* ═══════════════════════ Types ═══════════════════════ */
interface ItemData { id: string; count: number; slot: number; }
interface PlayerData {
  fileName: string; uuid: string; displayName: string;
  health: number; foodLevel: number; xpLevel: number; xpTotal: number;
  pos: [number, number, number]; dimension: string;
  armorItems: ItemData[]; // [boots, leggings, chestplate, helmet] from NBT
  inventory: ItemData[]; // main slots 9-35
  hotbar: ItemData[]; // slots 0-8
  enderItems: ItemData[];
}

function extractItems(list: NbtValue): ItemData[] {
  if (!Array.isArray(list)) return [];
  return list.map((item: any) => ({
    id: String(item.id || "unknown").replace("minecraft:", ""),
    count: Number(item.Count || item.count || 0),
    slot: Number(item.Slot ?? item.slot ?? -1),
  })).filter(i => i.id !== "unknown" && i.count > 0);
}

function extractArmor(list: NbtValue): ItemData[] {
  if (!Array.isArray(list)) return [];
  // ArmorItems: [boots(0), leggings(1), chestplate(2), helmet(3)]
  return list.map((item: any, idx: number) => ({
    id: String(item?.id || "").replace("minecraft:", ""),
    count: Number(item?.Count || item?.count || 0),
    slot: idx,
  }));
}

async function parseDatBuffer(buf: ArrayBuffer, fileName: string): Promise<PlayerData> {
  let decompressed: ArrayBuffer;
  try { decompressed = await decompressGzip(buf); } catch { throw new Error(`"${fileName}" not valid gzip`); }
  const reader = new NbtReader(decompressed);
  const root = reader.parse();
  if (!root.value || typeof root.value !== "object") throw new Error(`"${fileName}" invalid NBT`);
  const data = root.value as Record<string, NbtValue>;
  let uuid = uuidFromNbt(data);
  if (!uuid) uuid = fileNameToUuid(fileName);
  const allInv = extractItems(data.Inventory);
  // Armor can be in ArmorItems field OR in Inventory slots 100-103
  let armor = extractArmor(data.ArmorItems);
  const invArmor = allInv.filter(i => i.slot >= 100 && i.slot <= 103);
  if (invArmor.length > 0) {
    // Merge: Inventory armor slots override empty ArmorItems slots
    const armorMap = new Map<number, ItemData>();
    for (const a of armor) armorMap.set(a.slot, a);
    for (const a of invArmor) armorMap.set(a.slot - 100, a); // 100→0(boots), 101→1(leggings), 102→2(chest), 103→3(helmet)
    armor = [...armorMap.values()];
  }
  const hotbar = allInv.filter(i => i.slot >= 0 && i.slot <= 8).sort((a, b) => a.slot - b.slot);
  const mainInv = allInv.filter(i => i.slot >= 9 && i.slot <= 35).sort((a, b) => a.slot - b.slot);
  const pos = Array.isArray(data.Pos) ? data.Pos.map(Number) as [number, number, number] : [0, 0, 0];
  return {
    fileName: fileName.replace(/\.dat(_old)?$/, ""),
    uuid, displayName: uuid,
    health: Math.round(Number(data.Health || 0) * 10) / 10,
    foodLevel: Number(data.foodLevel || 0),
    xpLevel: Number(data.XpLevel || 0), xpTotal: Number(data.XpTotal || 0),
    pos, dimension: String(data.Dimension || "overworld"),
    armorItems: armor,
    inventory: mainInv, hotbar,
    enderItems: extractItems(data.EnderItems),
  };
}

/* ═══════════════════════ Styles ═══════════════════════ */
const glass: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20,
};
const cardInner: React.CSSProperties = { padding: "20px" };
const slotStyle: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", flexShrink: 0, position: "relative",
};
const emptySlotStyle: React.CSSProperties = { ...slotStyle, opacity: 0.3 };

/* ═══════════════════════ Sub-components ═══════════════════════ */
/* Track failed icon IDs globally for debugging (logged to console) */
const failedIconIds = new Set<string>();

function ItemSlot({ item, size = 36 }: { item: ItemData | null; size?: number }) {
  if (!item || !item.id || item.id === "air") {
    return <div style={{ ...emptySlotStyle, width: size, height: size }}><Box size={14} style={{ color: "rgba(255,255,255,0.15)" }} /></div>;
  }
  const cleanId = item.id.replace("minecraft:", "");
  return (
    <div style={{ ...slotStyle, width: size, height: size }} title={`${item.id} ×${item.count}`}>
      {/* Fallback Box icon always rendered behind img */}
      <Box size={14} style={{ color: "rgba(255,255,255,0.25)", position: "absolute" }} />
      {/* Img overlays Box when loaded; hidden via CSS on error */}
      <img src={getItemIconUrl(item.id)} alt={item.id} width={size - 8} height={size - 8}
        style={{ imageRendering: "pixelated", position: "relative", zIndex: 1 }}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
          if (!failedIconIds.has(cleanId)) {
            failedIconIds.add(cleanId);
            console.log("[ItemIcon] Failed to load:", cleanId, "- showing fallback Box");
          }
        }} />
      {item.count > 1 && (
        <span className="absolute bottom-0 right-0.5 text-[8px] font-bold text-white/80 leading-none" style={{ zIndex: 2 }}>{item.count}</span>
      )}
    </div>
  );
}

function StatLine({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2.5 py-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <div className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <Icon size={13} style={{ color: "rgba(255,255,255,0.5)" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-semibold tracking-widest uppercase text-white/25">{label}</p>
        <p className="text-xs font-medium text-white/70 truncate">{value}</p>
        {sub && <p className="text-[9px] text-white/25 truncate">{sub}</p>}
      </div>
    </div>
  );
}

/* ═══════════════════════ Main Component ═══════════════════════ */
export function InventoryInfo() {
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [playerDb, setPlayerDb] = useState<Map<string, string>>(new Map());
  const [dbLoaded, setDbLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Load player DB FIRST, then auto-fetch data
  useEffect(() => {
    fetch(PLAYER_DB_URL)
      .then(r => r.json())
      .then((data: { uuid: string; name: string }[]) => {
        const map = new Map<string, string>();
        for (const p of data) {
          // Store both formats: with dashes and without, all lowercase
          const uuidLower = p.uuid.toLowerCase();
          const uuidNoDash = uuidLower.replace(/-/g, "");
          map.set(uuidLower, p.name);
          map.set(uuidNoDash, p.name);
          map.set(p.name.toLowerCase(), uuidLower);
        }
        console.log("[PlayerDB] Loaded", map.size, "entries. Sample keys:", [...map.keys()].slice(0, 5));
        setPlayerDb(map);
        setDbLoaded(true);
      })
      .catch(e => { console.error("[PlayerDB] Failed:", e); setDbLoaded(true); });
  }, []);

  // Auto-fetch tar.gz AFTER db is loaded
  useEffect(() => {
    if (!dbLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch(AUTO_DATA_URL);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const gzBuf = await resp.arrayBuffer();
        const tarBuf = await decompressGzip(gzBuf);
        const entries = parseTar(tarBuf);
        const datEntries = entries.filter(e => e.name.endsWith(".dat") && !e.name.endsWith(".dat_old"));
        console.log("[AutoFetch] Found", datEntries.length, ".dat files in archive");
        const newPlayers: PlayerData[] = [];
        const newErrors: string[] = [];
        for (const entry of datEntries) {
          try {
            const pd = await parseDatBuffer(
              entry.data.buffer.slice(entry.data.byteOffset, entry.data.byteOffset + entry.data.byteLength),
              entry.name.split("/").pop() || entry.name
            );
            // Resolve name immediately using playerDb
            const name = playerDb.get(pd.uuid.toLowerCase()) || playerDb.get(pd.uuid.replace(/-/g, "").toLowerCase());
            if (name) pd.displayName = name;
            newPlayers.push(pd);
          } catch (e: any) { newErrors.push(e.message || `Failed: ${entry.name}`); }
        }
        if (!cancelled) {
          console.log("[AutoFetch] Parsed", newPlayers.length, "players,", newErrors.length, "errors");
          setPlayers(newPlayers);
          setErrors(newErrors);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) { setErrors([e.message || "Failed to load data"]); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [dbLoaded, playerDb]);

  // Video autoplay
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const start = () => vid.play().catch(() => {});
    if ("requestIdleCallback" in window) (window as any).requestIdleCallback(start, { timeout: 1500 });
    else setTimeout(start, 600);
  }, []);

  const filtered = players.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return p.displayName.toLowerCase().includes(q) || p.uuid.toLowerCase().includes(q) || p.fileName.toLowerCase().includes(q);
  });

  // Build armor display: [helmet, chestplate, leggings, boots] (reverse NBT order)
  const getArmorSlots = (armor: ItemData[]): (ItemData | null)[] => {
    const slots: (ItemData | null)[] = [null, null, null, null];
    for (const a of armor) {
      if (a.id && a.id !== "air" && a.count > 0) {
        // NBT: 0=boots, 1=leggings, 2=chestplate, 3=helmet
        if (a.slot === 3) slots[0] = a; // helmet
        else if (a.slot === 2) slots[1] = a; // chestplate
        else if (a.slot === 1) slots[2] = a; // leggings
        else if (a.slot === 0) slots[3] = a; // boots
      }
    }
    return slots;
  };

  // Build 27-slot main inventory grid (slots 9-35)
  const getMainGrid = (inv: ItemData[]): (ItemData | null)[] => {
    const grid: (ItemData | null)[] = Array(27).fill(null);
    for (const item of inv) {
      const idx = item.slot - 9;
      if (idx >= 0 && idx < 27) grid[idx] = item;
    }
    return grid;
  };

  // Build 9-slot hotbar (slots 0-8)
  const getHotbarGrid = (hb: ItemData[]): (ItemData | null)[] => {
    const grid: (ItemData | null)[] = Array(9).fill(null);
    for (const item of hb) {
      if (item.slot >= 0 && item.slot < 9) grid[item.slot] = item;
    }
    return grid;
  };

  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ fontFamily: FONT }}>
      {/* Video BG */}
      <div className="fixed inset-0" style={{ zIndex: -2 }}>
        <video ref={videoRef} loop muted playsInline preload="metadata" autoPlay
          className="w-full h-full object-cover" style={{ opacity: 0.45 }}>
          <source src={VIDEO_URL} type="video/mp4" />
        </video>
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.45)" }} />
      </div>

      <Navigation />

      <section className="relative min-h-screen flex flex-col items-center justify-start px-4 pt-28 pb-20">
        <div className="w-full max-w-4xl mx-auto">

          {/* Header */}
          <div className="mb-6">
            <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-white/30 mb-2">Client-Side Tool</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white" style={{ fontFamily: FONT, fontWeight: 800 }}>
              Search Inventory Player by Phan Trọng Khang
            </h2>
            <div className="mt-3 h-px rounded-full" style={{ width: 40, background: "linear-gradient(to right, rgba(255,255,255,0.4), transparent)" }} />
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="running-border" style={{ "--rb-speed": "6s", "--rb-color": "rgba(255,255,255,0.45)", "--rb-radius": "20px", background: "rgba(255,255,255,0.04)", borderRadius: 20 } as React.CSSProperties}>
              <div style={{ padding: "14px 20px" }}>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <Search size={16} style={{ color: "rgba(255,255,255,0.5)" }} />
                  </div>
                  <input type="text" placeholder="Tìm theo tên hoặc UUID..."
                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-sm text-white/90 placeholder:text-white/25 py-2"
                    style={{ fontFamily: FONT }} />
                  {searchQuery && <button onClick={() => setSearchQuery("")} className="text-white/30 hover:text-white/60"><X size={16} /></button>}
                </div>
                <div className="flex items-center gap-3 mt-2 pt-2 pl-12" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <span className="text-[10px] text-white/25 tracking-widest uppercase">{filtered.length}/{players.length} players</span>
                  {dbLoaded && <span className="text-[10px] text-white/25 tracking-widest uppercase">· {Math.floor(playerDb.size / 3)} names loaded</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="rounded-2xl p-8 text-center mb-6" style={glass}>
              <div className="w-6 h-6 rounded-full border-2 border-white/15 border-t-white/60 animate-spin mx-auto mb-3" />
              <p className="text-sm text-white/50">Đang tải và phân tích dữ liệu...</p>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="rounded-2xl p-4 mb-6" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
              <p className="text-xs font-semibold text-red-400/80 uppercase tracking-widest mb-2">Errors ({errors.length})</p>
              {errors.slice(0, 5).map((e, i) => <p key={i} className="text-xs text-red-300/60 ml-3">· {e}</p>)}
              {errors.length > 5 && <p className="text-[10px] text-red-300/40 ml-3 mt-1">+{errors.length - 5} more</p>}
              <button onClick={() => setErrors([])} className="mt-2 ml-3 text-[10px] text-red-400/50 hover:text-red-400/80 uppercase tracking-widest">Clear</button>
            </div>
          )}

          {/* Player Cards — NO animation */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filtered.map((player) => {
              const armorSlots = getArmorSlots(player.armorItems);
              const mainGrid = getMainGrid(player.inventory);
              const hotbarGrid = getHotbarGrid(player.hotbar);

              return (
                <div key={`${player.uuid}-${player.fileName}`} className="running-border"
                  style={{ "--rb-speed": "6s", "--rb-color": "rgba(255,255,255,0.35)", "--rb-radius": "20px", background: "rgba(255,255,255,0.04)", borderRadius: 20 } as React.CSSProperties}>
                  <div style={cardInner}>

                    {/* Player Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl"
                        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
                        <User size={18} style={{ color: "rgba(255,255,255,0.7)" }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-bold text-white/90 truncate">{player.displayName}</h3>
                        <p className="text-[10px] text-white/30 truncate font-mono">
                          {player.displayName !== player.uuid ? player.uuid : player.fileName}
                        </p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex flex-col mb-4">
                      <StatLine icon={Heart} label="Health" value={`${player.health}/20 ♥`} />
                      <StatLine icon={Star} label="XP" value={`Lv.${player.xpLevel}`} sub={`${player.xpTotal} total`} />
                      <StatLine icon={Package} label="Food" value={`${player.foodLevel}/20`} />
                      <StatLine icon={MapPin} label="Position" value={`${Math.round(player.pos[0])}, ${Math.round(player.pos[1])}, ${Math.round(player.pos[2])}`} sub={player.dimension.replace("minecraft:", "")} />
                    </div>

                    {/* ── INVENTORY LAYOUT ── */}
                    <div className="pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>

                      {/* Row: Armor (left) + Main Inventory (right) */}
                      <div className="flex gap-4 mb-3">

                        {/* ARMOR — vertical column */}
                        <div className="flex flex-col gap-1.5 flex-shrink-0">
                          <span className="text-[8px] font-semibold tracking-widest uppercase text-white/20 mb-0.5">Trang bị</span>
                          {armorSlots.map((item, i) => (
                            <ItemSlot key={i} item={item} size={34} />
                          ))}
                        </div>

                        {/* MAIN INVENTORY — 9×3 grid */}
                        <div className="flex-1 min-w-0">
                          <span className="text-[8px] font-semibold tracking-widest uppercase text-white/20 mb-1 block">Kho đồ</span>
                          <div className="grid grid-cols-9 gap-1">
                            {mainGrid.map((item, i) => <ItemSlot key={i} item={item} size={30} />)}
                          </div>
                        </div>
                      </div>

                      {/* HOTBAR — separate row */}
                      <div>
                        <span className="text-[8px] font-semibold tracking-widest uppercase text-white/20 mb-1 block">Thanh công cụ</span>
                        <div className="inline-flex gap-1 p-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                          {hotbarGrid.map((item, i) => <ItemSlot key={i} item={item} size={30} />)}
                        </div>
                      </div>

                      {/* Ender Chest */}
                      {player.enderItems.length > 0 && (
                        <div className="mt-3 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                          <span className="text-[8px] font-semibold tracking-widest uppercase text-white/20 mb-1 block">Ender Chest ({player.enderItems.length})</span>
                          <div className="flex flex-wrap gap-1">
                            {player.enderItems.slice(0, 18).map((item, j) => <ItemSlot key={j} item={item} size={26} />)}
                            {player.enderItems.length > 18 && <span className="text-[9px] text-white/15 self-center px-1">+{player.enderItems.length - 18}</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty state */}
          {!loading && players.length === 0 && errors.length === 0 && (
            <div className="text-center py-16">
              <Package className="w-12 h-12 text-white/10 mx-auto mb-4" />
              <p className="text-sm text-white/20">Chưa có dữ liệu player</p>
            </div>
          )}

          {/* Clear */}
          {players.length > 0 && (
            <div className="text-center mt-8">
              <button onClick={() => { setPlayers([]); setErrors([]); setSearchQuery(""); }}
                className="text-[11px] uppercase tracking-[0.2em] text-white/25 hover:text-white/50 px-6 py-2 rounded-full"
                style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                Clear All
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
