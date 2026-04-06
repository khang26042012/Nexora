import { useEffect, useState } from "react";
import { api, type SystemState } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";
import {
  Lock, LockOpen, Bell, BellOff, Monitor, MonitorOff,
  CheckCircle2, AlertCircle, ShieldCheck, ShieldOff
} from "lucide-react";

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
      type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
    }`}>
      {type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      {msg}
    </div>
  );
}

function ToggleCard({
  title, description, enabled, onToggle, loading,
  iconOn, iconOff, colorOn, colorOff,
}: {
  title: string; description: string; enabled: boolean;
  onToggle: (v: boolean) => void; loading: boolean;
  iconOn: any; iconOff: any; colorOn: string; colorOff: string;
}) {
  const IconOn = iconOn;
  const IconOff = iconOff;
  return (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-sm flex items-center gap-4">
      <div className={`p-3 rounded-xl ${enabled ? colorOn : "bg-gray-100"}`}>
        {enabled
          ? <IconOn className={`w-5 h-5 ${enabled ? "text-white" : "text-gray-400"}`} />
          : <IconOff className="w-5 h-5 text-gray-400" />
        }
      </div>
      <div className="flex-1">
        <p className="font-semibold text-gray-800">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onToggle(!enabled)}
        disabled={loading}
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${
          enabled ? colorOn : "bg-gray-200"
        } ${loading ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`} />
      </button>
    </div>
  );
}

export default function Control() {
  const [state, setState] = useState<SystemState | null>(null);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const { preWaterAlert, webLockActive } = useWebSocket();

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchState = async () => {
    try {
      const s = await api.getStatus();
      setState(s);
    } catch {}
  };

  useEffect(() => {
    fetchState();
    const id = setInterval(fetchState, 3000);
    return () => clearInterval(id);
  }, []);

  const withLoading = async (key: string, fn: () => Promise<void>) => {
    setLoading((l) => ({ ...l, [key]: true }));
    try {
      await fn();
      await fetchState();
    } catch (err: any) {
      showToast(err.message ?? "Lỗi không xác định", "error");
    } finally {
      setLoading((l) => ({ ...l, [key]: false }));
    }
  };

  const handleUnlock = (action: "ON" | "OFF") =>
    withLoading("unlock", async () => {
      await api.unlockControl(action);
      showToast(`Đã ${action === "ON" ? "mở" : "tắt"} khóa bơm tự động`, "success");
    });

  const handleAlert = (enabled: boolean) =>
    withLoading("alert", async () => {
      await api.alertControl(enabled);
      showToast(`Đã ${enabled ? "bật" : "tắt"} cảnh báo`, "success");
    });

  const handleTft = (enabled: boolean) =>
    withLoading("tft", async () => {
      await api.tftControl(enabled);
      showToast(`Đã ${enabled ? "bật" : "tắt"} màn hình TFT`, "success");
    });

  const handleAdmin = (action: "ON" | "OFF") =>
    withLoading("admin", async () => {
      await api.adminControl(action);
      showToast(
        action === "ON"
          ? "Đã bật Admin Mode — bơm đang chạy, tự tắt sau 25s"
          : "Đã tắt Admin Mode và tắt bơm",
        "success"
      );
    });

  const lockOn = !!state?.pump_locked;
  const adminOn_ = !!state?.admin_active;

  return (
    <div className="space-y-6">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* Pre-water alert banner */}
      {preWaterAlert && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-blue-800 text-sm font-medium animate-pulse">
          <span className="text-xl">🚿</span>
          <span>ESP32 đang chuẩn bị tưới — vui lòng không gửi lệnh xung đột!</span>
        </div>
      )}

      {/* Web control lock banner */}
      {webLockActive && (
        <div className="flex items-center gap-3 bg-orange-50 border border-orange-300 rounded-xl px-4 py-3 text-orange-800 text-sm font-medium">
          <ShieldCheck className="w-5 h-5 text-orange-500 shrink-0" />
          <span>Bạn đang nắm quyền điều khiển — Telegram đang bị khóa lệnh cho đến khi bạn tắt</span>
        </div>
      )}

      {/* Unlock pump */}
      <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
        <h2 className="font-bold text-lg text-gray-800 mb-1">Khóa bơm tự động</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Khi mở khóa, bơm có thể tự bật khi đất quá khô. Khi khóa, bơm sẽ không tự bật.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleUnlock("ON")}
            disabled={loading.unlock || !lockOn}
            className={`flex items-center justify-center gap-2.5 px-5 py-4 rounded-xl font-semibold text-sm transition-all
              ${!lockOn
                ? "bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-blue-200 ring-2 ring-blue-100"
                : "bg-blue-500 hover:bg-blue-600 text-white shadow-sm"
              } ${loading.unlock ? "opacity-60" : ""}`}
          >
            <LockOpen className="w-5 h-5" />
            {!lockOn ? "Đã mở" : "Mở khóa"}
          </button>
          <button
            onClick={() => handleUnlock("OFF")}
            disabled={loading.unlock || lockOn}
            className={`flex items-center justify-center gap-2.5 px-5 py-4 rounded-xl font-semibold text-sm transition-all
              ${lockOn
                ? "bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-yellow-200 ring-2 ring-yellow-100"
                : "bg-yellow-500 hover:bg-yellow-600 text-white shadow-sm"
              } ${loading.unlock ? "opacity-60" : ""}`}
          >
            <Lock className="w-5 h-5" />
            {lockOn ? "Đang khóa" : "Khóa lại"}
          </button>
        </div>
        <p className={`text-xs mt-3 text-center font-medium ${!lockOn ? "text-blue-600" : "text-amber-600"}`}>
          {!lockOn
            ? "🔓 Đang mở khóa — bơm có thể tự bật khi đất khô"
            : "🔒 Đang khóa — bơm sẽ không tự bật cho đến khi mở khóa"}
        </p>
      </div>

      {/* Admin Mode */}
      <div className={`bg-white rounded-2xl border p-6 shadow-sm ${adminOn_ ? "border-orange-400 ring-2 ring-orange-100" : "border-orange-200"}`}>
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className={`w-5 h-5 ${adminOn_ ? "text-orange-500" : "text-gray-400"}`} />
          <h2 className="font-bold text-lg text-gray-800">Admin Mode</h2>
          {adminOn_ && (
            <span className="ml-auto text-xs bg-orange-100 text-orange-700 font-semibold px-2 py-0.5 rounded-full animate-pulse">
              Đang chạy
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Bật bơm tức thì <b>bỏ qua kiểm tra độ ẩm</b>. Tự tắt sau <b>25 giây</b> nếu không tắt trước.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleAdmin("ON")}
            disabled={!!loading.admin || adminOn_}
            className={`flex items-center justify-center gap-2.5 px-5 py-4 rounded-xl font-semibold text-sm transition-all shadow-sm
              ${adminOn_
                ? "bg-orange-500 text-white cursor-not-allowed ring-2 ring-orange-300"
                : "bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white"
              } ${loading.admin ? "opacity-60" : ""}`}
          >
            <ShieldCheck className="w-5 h-5" />
            {adminOn_ ? "Đang bật" : "Admin ON"}
          </button>
          <button
            onClick={() => handleAdmin("OFF")}
            disabled={!!loading.admin || !adminOn_}
            className={`flex items-center justify-center gap-2.5 px-5 py-4 rounded-xl font-semibold text-sm transition-all shadow-sm
              ${!adminOn_
                ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                : "bg-gray-700 hover:bg-gray-800 active:bg-gray-900 text-white"
              } ${loading.admin ? "opacity-60" : ""}`}
          >
            <ShieldOff className="w-5 h-5" />
            Admin OFF
          </button>
        </div>
        <p className={`text-xs mt-3 text-center font-medium ${adminOn_ ? "text-orange-600" : "text-gray-400"}`}>
          {adminOn_
            ? "🟠 Admin đang bật — bơm đang chạy, tự tắt sau 25s"
            : "⚠️ Admin ON sẽ bật bơm ngay — dù đất đang ẩm. Chỉ dùng khi cần thiết!"}
        </p>
      </div>

      {/* Toggle switches */}
      <div className="space-y-3">
        <ToggleCard
          title="Cảnh báo Telegram"
          description="Nhận thông báo về lửa, mưa, và các sự kiện bất thường"
          enabled={!!state?.alert_enabled}
          onToggle={handleAlert}
          loading={!!loading.alert}
          iconOn={Bell}
          iconOff={BellOff}
          colorOn="bg-blue-500"
          colorOff=""
        />
        <ToggleCard
          title="Màn hình TFT"
          description="Bật/tắt màn hình hiển thị thông tin trên thiết bị ESP32"
          enabled={!!state?.tft_enabled}
          onToggle={handleTft}
          loading={!!loading.tft}
          iconOn={Monitor}
          iconOff={MonitorOff}
          colorOn="bg-purple-500"
          colorOff=""
        />
      </div>

      {/* Info note */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <p className="font-semibold mb-1">💡 Lưu ý</p>
        <ul className="space-y-1 text-xs list-disc ml-4">
          <li>Bơm chỉ bật được khi độ ẩm đất ≤ 30%</li>
          <li>Bơm tự khóa khi độ ẩm đất ≥ 70% để tránh quá tưới</li>
          <li>Logic màn hình TFT sẽ được cập nhật sau khi ESP32 nhận lệnh</li>
        </ul>
      </div>
    </div>
  );
}
