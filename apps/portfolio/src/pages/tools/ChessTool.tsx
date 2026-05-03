import { useEffect, useRef, useState, useCallback } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { Navigation } from "@/components/navigation";
import { ToolVideoBg } from "@/components/ToolVideoBg";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RotateCcw, Brain, ChevronRight, Zap, FlipHorizontal2, Trophy, Swords, AlertTriangle } from "lucide-react";
import { useLocation } from "wouter";

const FONT = "'Plus Jakarta Sans', sans-serif";

function AnimBorderCard({ children, speed = 4, color = "rgba(255,255,255,0.85)", radius = 16, innerStyle = {}, className = "" }: {
  children: React.ReactNode; speed?: number; color?: string; radius?: number; innerStyle?: React.CSSProperties; className?: string;
}) {
  return (
    <div className={`running-border ${className}`} style={{ "--rb-speed": `${speed}s`, "--rb-color": color, "--rb-radius": `${radius}px`, background: "rgba(255,255,255,0.04)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", ...innerStyle } as React.CSSProperties}>
      {children}
    </div>
  );
}

type TopMove = { move: string; score: number; from: string; to: string; mate?: number };
type MoveLog = { san: string; color: "w" | "b"; ply: number };

function evalLabel(cp: number, mate?: number): string {
  if (mate !== undefined) return mate > 0 ? `M${mate}` : `-M${Math.abs(mate)}`;
  return (cp > 0 ? "+" : "") + (Math.abs(cp) / 100).toFixed(2);
}

function evalToBar(cp: number) {
  return Math.max(5, Math.min(95, 50 + cp / 30));
}

function useStockfish() {
  const workerRef = useRef<Worker | null>(null);
  const multiPVRef = useRef<Map<number, TopMove>>(new Map());
  const [topMoves, setTopMoves] = useState<TopMove[]>([]);
  const [evaluation, setEvaluation] = useState<{ cp: number; mate?: number }>({ cp: 0 });
  const [thinking, setThinking] = useState(false);
  const onDoneRef = useRef<((m: TopMove[]) => void) | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let worker: Worker;
    try {
      worker = new Worker("/stockfish.js");
      workerRef.current = worker;

      worker.onmessage = (e: MessageEvent) => {
        const line: string = typeof e.data === "string" ? e.data : String(e.data ?? "");

        if (line === "uciok") {
          worker.postMessage("setoption name MultiPV value 3");
          worker.postMessage("isready");
        }
        if (line === "readyok") {
          setReady(true);
        }

        if (line.startsWith("info") && line.includes(" pv ")) {
          const pvNum = parseInt(line.match(/multipv (\d+)/)?.[1] ?? "1");
          const mateVal = line.match(/score mate (-?\d+)/)?.[1];
          const cpVal = line.match(/score cp (-?\d+)/)?.[1];
          const pvMove = line.match(/ pv ([a-h][1-8][a-h][1-8][qrbnQRBN]?)/)?.[1]?.toLowerCase();
          if (!pvMove) return;

          const mate = mateVal ? parseInt(mateVal) : undefined;
          const cp = cpVal ? parseInt(cpVal) : (mate ? (mate > 0 ? 30000 : -30000) : 0);

          multiPVRef.current.set(pvNum, { move: pvMove, score: cp, from: pvMove.slice(0, 2), to: pvMove.slice(2, 4), mate });
          if (pvNum === 1) setEvaluation({ cp, mate: mate ?? undefined });
        }

        if (line.startsWith("bestmove")) {
          setThinking(false);
          const moves = Array.from(multiPVRef.current.entries()).sort(([a], [b]) => a - b).map(([, m]) => m);
          multiPVRef.current.clear();
          setTopMoves(moves);
          onDoneRef.current?.(moves);
        }
      };

      worker.onerror = () => setReady(false);
      worker.postMessage("uci");
    } catch {
      /* stockfish.js not available */
    }

    return () => {
      workerRef.current?.postMessage("quit");
      workerRef.current?.terminate();
    };
  }, []);

  const analyze = useCallback((fen: string, depth: number, onDone?: (m: TopMove[]) => void) => {
    if (!workerRef.current || !ready) return;
    onDoneRef.current = onDone ?? null;
    multiPVRef.current.clear();
    setThinking(true);
    setTopMoves([]);
    workerRef.current.postMessage("stop");
    workerRef.current.postMessage(`position fen ${fen}`);
    workerRef.current.postMessage(`go depth ${depth}`);
  }, [ready]);

  const stop = useCallback(() => {
    workerRef.current?.postMessage("stop");
    setThinking(false);
  }, []);

  return { topMoves, evaluation, thinking, analyze, stop, ready };
}

export function ChessTool() {
  const [, navigate] = useLocation();
  const [game, setGame] = useState(() => new Chess());
  const [userColor, setUserColor] = useState<"white" | "black">("white");
  const [depth, setDepth] = useState(15);
  const [arrows, setArrows] = useState<[string, string, string][]>([]);
  const [moveLog, setMoveLog] = useState<MoveLog[]>([]);
  const [boardOrientation, setBoardOrientation] = useState<"white" | "black">("white");
  const [customSquares, setCustomSquares] = useState<Record<string, React.CSSProperties>>({});
  const logRef = useRef<HTMLDivElement>(null);
  const { topMoves, evaluation, thinking, analyze, stop, ready } = useStockfish();

  const myColorChar = userColor === "white" ? "w" : "b";

  const triggerAnalysis = useCallback((fen: string, turn: "w" | "b") => {
    if (turn !== myColorChar) return;
    analyze(fen, depth, (moves) => {
      if (moves.length > 0) {
        const best = moves[0];
        setArrows([[best.from, best.to, "rgba(99,255,180,0.9)"] as [string, string, string]]);
        setCustomSquares({
          [best.from]: { backgroundColor: "rgba(99,255,180,0.25)", borderRadius: "4px" },
          [best.to]: { backgroundColor: "rgba(99,255,180,0.35)", borderRadius: "4px" },
        });
      }
    });
  }, [myColorChar, analyze, depth]);

  function onPieceDrop(from: string, to: string): boolean {
    try {
      const newGame = new Chess(game.fen());
      const move = newGame.move({ from, to, promotion: "q" });
      if (!move) return false;

      setGame(newGame);
      setArrows([]);
      setCustomSquares({});
      setMoveLog(prev => [...prev, { san: move.san, color: move.color as "w" | "b", ply: prev.length + 1 }]);
      triggerAnalysis(newGame.fen(), newGame.turn() as "w" | "b");
      return true;
    } catch {
      return false;
    }
  }

  function reset() {
    stop();
    setGame(new Chess());
    setArrows([]);
    setCustomSquares({});
    setMoveLog([]);
  }

  function flipBoard() {
    setBoardOrientation(o => o === "white" ? "black" : "white");
  }

  function playBestMove() {
    if (topMoves.length === 0 || game.isGameOver()) return;
    const best = topMoves[0];
    onPieceDrop(best.from, best.to);
  }

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [moveLog]);

  const gameOver = game.isGameOver();
  const isCheck = game.isCheck();
  const isCheckmate = game.isCheckmate();
  const isDraw = game.isDraw();

  const barPct = userColor === "white" ? evalToBar(evaluation.cp) : evalToBar(-evaluation.cp);
  const evalStr = evalLabel(evaluation.cp, evaluation.mate);

  const pairs: { white?: MoveLog; black?: MoveLog; idx: number }[] = [];
  for (let i = 0; i < moveLog.length; i += 2) {
    pairs.push({ white: moveLog[i], black: moveLog[i + 1], idx: i / 2 + 1 });
  }

  return (
    <div className="min-h-screen" style={{ background: "#050505", fontFamily: FONT }}>
      <ToolVideoBg />
      <Navigation />

      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[60vw] h-[40vw] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(99,255,180,0.03) 0%, transparent 70%)" }} />
      </div>

      <div className="relative max-w-3xl mx-auto px-5 pt-28 pb-20" style={{ zIndex: 1 }}>

        {/* Back */}
        <motion.button initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate("/tool")} className="flex items-center gap-2 mb-8 text-sm"
          style={{ color: "rgba(255,255,255,0.35)" }}
          whileHover={{ color: "rgba(255,255,255,0.7)" } as never}>
          <ArrowLeft size={15} /> Quay lại Tool
        </motion.button>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(99,255,180,0.08)", border: "1px solid rgba(99,255,180,0.2)" }}>
              <Swords size={20} style={{ color: "rgba(99,255,180,0.85)" }} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">AI Chess Advisor</h1>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.38)" }}>
                Nhập nước đối thủ — Stockfish gợi ý 3 nước tốt nhất cho bên bạn
              </p>
            </div>
          </div>
        </motion.div>

        {/* Game status banner */}
        <AnimatePresence>
          {(gameOver || isCheck) && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-xl"
              style={{
                background: isCheckmate ? "rgba(99,255,180,0.07)" : isDraw ? "rgba(255,255,255,0.05)" : "rgba(251,191,36,0.07)",
                border: `1px solid ${isCheckmate ? "rgba(99,255,180,0.2)" : isDraw ? "rgba(255,255,255,0.1)" : "rgba(251,191,36,0.2)"}`,
              }}>
              {isCheckmate
                ? <Trophy size={15} style={{ color: "rgba(99,255,180,0.9)" }} />
                : <AlertTriangle size={15} style={{ color: isDraw ? "rgba(255,255,255,0.6)" : "rgba(251,191,36,0.9)" }} />}
              <span className="text-sm font-bold" style={{
                color: isCheckmate ? "rgba(99,255,180,0.9)" : isDraw ? "rgba(255,255,255,0.7)" : "rgba(251,191,36,0.9)"
              }}>
                {isCheckmate ? "Chiếu hết!" : isDraw ? "Hoà cờ!" : "Chiếu tướng!"}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Settings */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="mb-4">
          <AnimBorderCard speed={7} color="rgba(255,255,255,0.4)" radius={14} innerStyle={{ padding: "1rem" }}>
            <div className="flex flex-wrap gap-6 items-end">
              {/* Color picker */}
              <div>
                <div className="text-xs font-semibold mb-2" style={{ color: "rgba(255,255,255,0.45)" }}>Màu của bạn</div>
                <div className="flex gap-2">
                  {(["white", "black"] as const).map(c => (
                    <button key={c} onClick={() => { setUserColor(c); setBoardOrientation(c); reset(); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                      style={{
                        background: userColor === c ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${userColor === c ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.08)"}`,
                        color: userColor === c ? "#fff" : "rgba(255,255,255,0.4)",
                      }}>
                      <span>{c === "white" ? "⬜" : "⬛"}</span>
                      {c === "white" ? "Trắng" : "Đen"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Depth */}
              <div className="flex-1 min-w-[160px]">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.45)" }}>Độ sâu phân tích</span>
                  <span className="text-sm font-bold text-white">{depth}</span>
                </div>
                <input type="range" min={5} max={22} value={depth} onChange={e => setDepth(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full cursor-pointer"
                  style={{ accentColor: "rgba(99,255,180,0.8)", background: "rgba(255,255,255,0.15)" }} />
              </div>

              {/* Stockfish status */}
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full"
                  style={{ background: ready ? "rgba(99,255,180,0.85)" : "rgba(255,255,255,0.25)", boxShadow: ready ? "0 0 6px rgba(99,255,180,0.7)" : "none" }} />
                <span className="text-xs" style={{ color: ready ? "rgba(99,255,180,0.75)" : "rgba(255,255,255,0.3)" }}>
                  {ready ? "Stockfish sẵn sàng" : "Đang khởi động…"}
                </span>
              </div>
            </div>
          </AnimBorderCard>
        </motion.div>

        {/* Board */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-4">
          <AnimBorderCard speed={5} color="rgba(99,255,180,0.5)" radius={16} innerStyle={{ padding: "1rem" }}>
            <div className="flex flex-col items-center gap-4">
              <div className="w-full" style={{ maxWidth: 460 }}>
                <Chessboard
                  boardWidth={Math.min(typeof window !== "undefined" ? window.innerWidth - 80 : 460, 460)}
                  position={game.fen()}
                  onPieceDrop={onPieceDrop}
                  boardOrientation={boardOrientation}
                  customArrows={arrows as any}
                  customSquareStyles={customSquares}
                  customDarkSquareStyle={{ backgroundColor: "#3a6b4e" }}
                  customLightSquareStyle={{ backgroundColor: "#b5d4bb" }}
                  animationDuration={150}
                />
              </div>

              {/* Board actions */}
              <div className="flex items-center gap-2 w-full flex-wrap">
                <button onClick={flipBoard}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.55)" }}>
                  <FlipHorizontal2 size={13} /> Xoay bàn
                </button>
                <button onClick={reset}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.55)" }}>
                  <RotateCcw size={13} /> Đặt lại
                </button>
                <button
                  onClick={() => triggerAnalysis(game.fen(), game.turn() as "w" | "b")}
                  disabled={!ready || thinking}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ml-auto"
                  style={{
                    background: ready ? "rgba(99,255,180,0.1)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${ready ? "rgba(99,255,180,0.25)" : "rgba(255,255,255,0.08)"}`,
                    color: ready ? "rgba(99,255,180,0.85)" : "rgba(255,255,255,0.25)",
                    cursor: ready && !thinking ? "pointer" : "not-allowed",
                  }}>
                  {thinking
                    ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                        <Brain size={13} />
                      </motion.div>
                    : <Zap size={13} />}
                  {thinking ? "Đang tính…" : "Phân tích"}
                </button>
              </div>
            </div>
          </AnimBorderCard>
        </motion.div>

        {/* Evaluation bar */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} className="mb-4">
          <AnimBorderCard speed={6} color="rgba(255,255,255,0.35)" radius={14} innerStyle={{ padding: "1rem" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.45)" }}>Đánh giá thế cờ</span>
              <span className="text-sm font-black font-mono" style={{
                color: evaluation.cp > 50 ? "rgba(99,255,180,0.9)" : evaluation.cp < -50 ? "rgba(248,113,113,0.9)" : "rgba(255,255,255,0.6)"
              }}>
                {evalStr}
              </span>
            </div>
            <div className="relative h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
              <motion.div className="h-full rounded-full absolute left-0 top-0"
                animate={{ width: `${barPct}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                style={{ background: "linear-gradient(to right, rgba(248,113,113,0.7), rgba(255,255,255,0.25) 50%, rgba(99,255,180,0.7))", transformOrigin: "left" }}
              />
              <div className="absolute inset-y-0 left-1/2 w-px" style={{ background: "rgba(255,255,255,0.2)" }} />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px]" style={{ color: "rgba(248,113,113,0.55)" }}>Đen lợi</span>
              <span className="text-[10px]" style={{ color: "rgba(99,255,180,0.55)" }}>Trắng lợi</span>
            </div>
          </AnimBorderCard>
        </motion.div>

        {/* Suggested moves */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.17 }} className="mb-4">
          <AnimBorderCard speed={5} color="rgba(255,255,255,0.4)" radius={14} innerStyle={{ padding: "1rem" }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.45)" }}>Gợi ý nước đi</span>
              {topMoves.length > 0 && !gameOver && game.turn() === myColorChar && (
                <button onClick={playBestMove}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold"
                  style={{ background: "rgba(99,255,180,0.1)", border: "1px solid rgba(99,255,180,0.25)", color: "rgba(99,255,180,0.85)" }}>
                  <ChevronRight size={12} /> Đi luôn
                </button>
              )}
            </div>

            {thinking ? (
              <div className="flex flex-col gap-2">
                {[0, 1, 2].map(i => (
                  <motion.div key={i} animate={{ opacity: [0.25, 0.5, 0.25] }}
                    transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.18 }}
                    className="h-10 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }} />
                ))}
              </div>
            ) : topMoves.length === 0 ? (
              <p className="text-xs py-3 text-center" style={{ color: "rgba(255,255,255,0.2)" }}>
                {game.turn() === myColorChar
                  ? 'Nhấn "Phân tích" để xem gợi ý'
                  : "Nhập nước đối thủ rồi xem gợi ý…"}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {topMoves.map((m, i) => (
                  <motion.div key={m.move} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    onClick={() => {
                      if (game.turn() !== myColorChar || gameOver) return;
                      if (i === 0) { playBestMove(); return; }
                      setArrows([[m.from, m.to, i === 1 ? "rgba(147,197,253,0.8)" : "rgba(196,181,253,0.7)"] as [string, string, string]]);
                      setCustomSquares({
                        [m.from]: { backgroundColor: "rgba(147,197,253,0.18)", borderRadius: "4px" },
                        [m.to]: { backgroundColor: "rgba(147,197,253,0.28)", borderRadius: "4px" },
                      });
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer"
                    style={{
                      background: i === 0 ? "rgba(99,255,180,0.06)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${i === 0 ? "rgba(99,255,180,0.2)" : "rgba(255,255,255,0.06)"}`,
                    }}>
                    <span className="text-[10px] font-black w-5" style={{ color: i === 0 ? "rgba(99,255,180,0.7)" : "rgba(255,255,255,0.25)" }}>
                      #{i + 1}
                    </span>
                    <span className="font-black text-sm font-mono flex-1" style={{ color: i === 0 ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.5)" }}>
                      {m.move.toUpperCase()}
                    </span>
                    <span className="text-xs font-mono font-bold" style={{
                      color: m.score > 0 ? "rgba(99,255,180,0.8)" : m.score < 0 ? "rgba(248,113,113,0.8)" : "rgba(255,255,255,0.4)"
                    }}>
                      {evalLabel(m.score, m.mate)}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimBorderCard>
        </motion.div>

        {/* Move history */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <AnimBorderCard speed={6} color="rgba(255,255,255,0.3)" radius={14} innerStyle={{ padding: "1rem" }}>
            <div className="text-xs font-semibold mb-3" style={{ color: "rgba(255,255,255,0.45)" }}>Lịch sử nước đi</div>
            {pairs.length === 0 ? (
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>Chưa có nước nào…</p>
            ) : (
              <div ref={logRef} className="flex flex-col gap-1 max-h-36 overflow-y-auto pr-1"
                style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}>
                {pairs.map(p => (
                  <div key={p.idx} className="flex items-center gap-2 text-xs">
                    <span className="w-6 text-right font-mono flex-shrink-0" style={{ color: "rgba(255,255,255,0.2)" }}>{p.idx}.</span>
                    <span className="flex-1 font-mono font-semibold" style={{ color: "rgba(255,255,255,0.75)" }}>{p.white?.san ?? ""}</span>
                    <span className="flex-1 font-mono font-semibold" style={{ color: "rgba(255,255,255,0.45)" }}>{p.black?.san ?? ""}</span>
                  </div>
                ))}
              </div>
            )}
          </AnimBorderCard>
        </motion.div>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="text-center text-xs mt-6" style={{ color: "rgba(255,255,255,0.18)" }}>
          Phân tích chạy 100% trên trình duyệt — không gửi dữ liệu lên server
        </motion.p>
      </div>
    </div>
  );
}
