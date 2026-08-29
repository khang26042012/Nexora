import { useState, useEffect } from "react";
import { Navigation } from "@/components/navigation";

export default function ServerStatus() {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Simple timer to verify component mounts and re-renders
    const timer = setTimeout(() => setShowContent(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen w-full relative overflow-hidden" style={{ background: "#0a0a0f", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <Navigation />
      
      <main className="relative z-10 max-w-5xl mx-auto px-5 pt-24 pb-16">
        <h1 className="text-3xl font-bold text-white/90 mb-4">Server Status</h1>
        <p className="text-sm text-white/35 mb-8">Minimal test page - diagnosing blue screen issue</p>
        
        {!showContent ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-white/50 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-xl p-6" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <h3 className="text-lg font-semibold text-white/90 mb-2">Test Card 1</h3>
              <p className="text-white/50">If you see this, the component renders correctly.</p>
            </div>
            <div className="rounded-xl p-6" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <h3 className="text-lg font-semibold text-white/90 mb-2">Test Card 2</h3>
              <p className="text-white/50">No framer-motion, no WebSocket, no complex state.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
