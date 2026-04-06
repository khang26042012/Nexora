import { useEffect, useRef } from "react";
import { useWebSocket, type LogEntry } from "@/hooks/useWebSocket";
import {
  Droplets, Thermometer, Wind, Flame, CloudRain,
  Waves, Wifi, WifiOff,
} from "lucide-react";

function SensorCard({
  label, value, unit, icon: Icon, cardClass, iconColor, max = 100, offline = false,
}: {
  label: string; value: number | string; unit: string;
  icon: any; cardClass: string; iconColor: string; max?: number; offline?: boolean;
}) {
  const displayValue = offline ? "—" : value;
  const numVal = typeof value === "number" ? value : 0;
  const pct = Math.min(100, Math.max(0, (numVal / max) * 100));
  return (
    <div className={`${offline ? "bg-gray-100" : cardClass} rounded-2xl p-5 flex flex-col gap-3 shadow-sm transition-all duration-500 ${offline ? "opacity-50" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-600">{label}</span>
        <Icon className={`w-5 h-5 ${offline ? "text-gray-400" : iconColor}`} />
      </div>
      <div className="flex items-end gap-1">
        <span className={`text-3xl font-bold ${offline ? "text-gray-400" : "text-gray-800"}`}>{displayValue}</span>
        {!offline && <span className="text-base text-gray-500 mb-1">{unit}</span>}
      </div>
      {!offline && typeof value === "number" && (
        <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
          <div
            className="h-full bg-white/80 rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

function StatusBadge({ active, labelOn, labelOff }: { active: boolean; labelOn: string; labelOff: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
      active ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"
    }`}>
      <span className={`w-2 h-2 rounded-full ${active ? "bg-red-500 animate-pulse" : "bg-gray-400"}`} />
      {active ? labelOn : labelOff}
    </span>
  );
}

function formatTime(ts: string | null) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return ts;
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}


const LOG_COLORS: Record<LogEntry["level"], { dot: string; text: string; bg: string }> = {
  info:    { dot: "bg-sky-400",     text: "text-sky-600",    bg: "" },
  success: { dot: "bg-emerald-400", text: "text-emerald-600", bg: "" },
  warn:    { dot: "bg-amber-400",   text: "text-amber-600",   bg: "" },
  error:   { dot: "bg-red-400",     text: "text-red-600",     bg: "" },
};

const LOG_PREFIXES: Record<LogEntry["level"], string> = {
  info:    "INFO ",
  success: "OK   ",
  warn:    "WARN ",
  error:   "ERR  ",
};

function LogLine({ entry }: { entry: LogEntry }) {
  const c = LOG_COLORS[entry.level];
  return (
    <div className="flex items-start gap-2 py-1 px-1 rounded hover:bg-gray-50 transition-colors group">
      <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
      <span className="text-gray-400 text-[10px] font-mono flex-shrink-0 mt-0.5 select-none">
        {formatTime(entry.timestamp)}
      </span>
      <span className={`text-[10px] font-mono font-bold flex-shrink-0 mt-0.5 ${c.text}`}>
        {LOG_PREFIXES[entry.level]}
      </span>
      <span className="text-gray-700 text-xs font-mono leading-tight break-all">{entry.message}</span>
    </div>
  );
}

export default function Monitor() {
  const { connected, esp32Online, data, logs } = useWebSocket();
  const logsEndRef = useRef<HTMLDivElement>(null);

  const offline = !esp32Online;

  return (
    <div className="space-y-6">
      {/* Header status */}
      <div className="flex flex-wrap items-center gap-3">
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
          connected ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        }`}>
          {connected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          {connected ? "WebSocket Online" : "WebSocket Offline"}
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
          !offline ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
        }`}>
          <span className={`w-2 h-2 rounded-full ${!offline ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
          {offline ? "ESP32 Mất kết nối" : "ESP32 Đang kết nối"}
        </div>
        {data?.last_seen && (
          <span className={`text-xs ${offline ? "text-red-400 font-semibold" : "text-gray-400"}`}>
            {offline ? "⚠️ Dữ liệu đã cũ — " : ""}Cập nhật lần cuối: {formatTime(data.last_seen)}
          </span>
        )}
      </div>

      {/* Offline banner */}
      {offline && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <span className="text-2xl">🔴</span>
          <div>
            <p className="text-sm font-bold text-red-700">ESP32 mất kết nối</p>
            <p className="text-xs text-red-500">Dữ liệu cảm biến không còn cập nhật. Kiểm tra nguồn điện và WiFi của thiết bị.</p>
          </div>
        </div>
      )}

      {/* Sensor grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <SensorCard label="Độ ẩm đất" value={data?.soil ?? 0} unit="%" icon={Droplets} cardClass="card-soil" iconColor="text-emerald-600" offline={offline} />
        <SensorCard label="Mức nước" value={data?.water ?? 0} unit="%" icon={Waves} cardClass="card-water" iconColor="text-blue-600" offline={offline} />
        <SensorCard label="Nhiệt độ" value={data?.temp ?? 0} unit="°C" icon={Thermometer} cardClass="card-temp" iconColor="text-amber-600" max={50} offline={offline} />
        <SensorCard label="Độ ẩm KK" value={data?.hum ?? 0} unit="%" icon={Wind} cardClass="card-hum" iconColor="text-sky-600" offline={offline} />
        <div className={`rounded-2xl p-5 flex flex-col gap-3 shadow-sm transition-all duration-500 ${offline ? "bg-gray-100 opacity-50" : "card-fire"}`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-600">Phát hiện lửa</span>
            <Flame className={`w-5 h-5 ${offline ? "text-gray-400" : "text-red-500"}`} />
          </div>
          {offline ? <span className="text-3xl font-bold text-gray-400">—</span>
            : <StatusBadge active={!!data?.fire} labelOn="CÓ LỬA ⚠️" labelOff="Không có" />}
        </div>
        <div className={`rounded-2xl p-5 flex flex-col gap-3 shadow-sm transition-all duration-500 ${offline ? "bg-gray-100 opacity-50" : "card-rain"}`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-600">Mưa</span>
            <CloudRain className={`w-5 h-5 ${offline ? "text-gray-400" : "text-violet-500"}`} />
          </div>
          {offline ? <span className="text-3xl font-bold text-gray-400">—</span>
            : <StatusBadge active={!!data?.rain} labelOn="Đang mưa" labelOff="Không mưa" />}
        </div>
      </div>

      {/* Activity Logs — macOS style, light */}
      <div className="rounded-2xl overflow-hidden shadow-sm border border-border">
        {/* Title bar */}
        <div className="bg-gray-100 border-b border-border px-4 py-2.5 flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <span className="text-gray-700 text-xs font-semibold tracking-wide font-mono">
              activity.log
            </span>
            <span className="text-gray-400 text-[10px] font-mono">
              — {logs.length} sự kiện
            </span>
          </div>
          {/* macOS-style dots — right side */}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#ff5f57] shadow-sm" title="Đóng" />
            <span className="w-3 h-3 rounded-full bg-[#ffbd2e] shadow-sm" title="Thu nhỏ" />
            <span className="w-3 h-3 rounded-full bg-[#28c840] shadow-sm" title="Mở rộng" />
          </div>
        </div>

        {/* Log body */}
        <div className="bg-white p-3 h-64 overflow-y-auto flex flex-col-reverse">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
              <span className="font-mono text-xs">$ Đang chờ sự kiện từ ESP32...</span>
              <span className="w-2 h-4 bg-gray-300 animate-pulse rounded-sm" />
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {logs.map((entry) => (
                <LogLine key={entry.id} entry={entry} />
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
