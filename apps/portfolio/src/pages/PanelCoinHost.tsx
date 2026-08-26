import { motion } from "framer-motion";

export function PanelCoinHost() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-xl rounded-[30px] border border-white/10 bg-white/[0.04] backdrop-blur-xl p-10 text-center shadow-[0_30px_80px_rgba(0,0,0,.5)]"
      >
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-300 via-yellow-500 to-orange-600 text-4xl shadow-[0_10px_30px_rgba(245,158,11,.35)]">
          🪙
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Panel Coin Host</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/60">
          Hệ thống quản lý coin &amp; hosting đang trong quá trình xây dựng.
          <br />
          Sẽ mở cửa sớm nhất — đợi nha! ⚡
        </p>
        <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-1.5 text-xs font-medium text-amber-300">
          <span className="h-2 w-2 animate-pulse rounded-full bg-amber-300" />
          COMING SOON
        </div>
      </motion.div>
    </div>
  );
}
