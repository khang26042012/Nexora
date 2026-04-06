import { useState } from "react";
import { Activity, Sliders, Terminal, Leaf } from "lucide-react";
import Monitor from "@/pages/Monitor";
import Control from "@/pages/Control";
import Commands from "@/pages/Commands";

const TABS = [
  { id: "monitor", label: "Theo dõi", icon: Activity },
  { id: "control", label: "Điều khiển", icon: Sliders },
  { id: "commands", label: "Lệnh", icon: Terminal },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("monitor");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-40 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="bg-emerald-500 p-2 rounded-xl">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 leading-none">NexoraGarden</h1>
            <p className="text-xs text-muted-foreground">Dashboard điều khiển vườn thông minh</p>
          </div>
        </div>

        {/* Tab nav */}
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex gap-1 pb-0 border-t border-gray-100">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
                  activeTab === id
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        {activeTab === "monitor" && <Monitor />}
        {activeTab === "control" && <Control />}
        {activeTab === "commands" && <Commands />}
      </main>

      {/* Footer */}
      <footer className="text-center py-3 text-xs text-muted-foreground border-t border-border">
        NexoraGarden © 2025 — Hệ thống quản lý vườn IoT
      </footer>
    </div>
  );
}
