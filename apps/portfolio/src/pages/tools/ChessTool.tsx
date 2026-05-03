import { useEffect, useRef, useState, useCallback } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { Navigation } from "@/components/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  RotateCcw, Brain, ChevronRight, Zap, FlipHorizontal2,
  Trophy, Swords, AlertTriangle,
} from "lucide-react";

type TopMove = { move: string; score: number; from: string; to: string; mate?: number };
type MoveLog = { san: string; color: "w" | "b"; ply: number };

const DEPTH_DEFAULT = 15;
const FONT = "'Plus Jakarta Sans', sans-serif";

function evalToBar(cp: number): number {
  return Math.max(5, Math.min(95, 50 + cp / 30));
}

function evalLabel(cp: number, mate?: number): string {
  if (mate !== undefined) return mate > 0 ? `M${mate}` : `-M${Math.abs(mate)}`;
  const abs = Math.abs(cp);
  return (cp > 0 ? "+" : "") + (abs / 100).toFixed(2);
}

function useStockfish() {
  const workerRef = useRef<Worker | null>(null);
  const multiPVRef = useRef<Map<number, TopMove>>(new Map());
  const [topMoves, setTopMoves] = useState<TopMove[]>([]);
  const [evaluation, setEvaluation] = useState<{ cp: number; mate?: number }>({ cp: 0 });
  const [thinking, setThinking] = useState(false);
  const onBestMoveRef = useRef<((moves: TopMove[]) => void) | null>(null);

  useEffect(() => {
    const worker = new Worker("/stockfish.js");
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      const line: string = typeof e.data === "string" ? e.data : e.data?.toString() ?? "";

      if (line.startsWith("info") && line.includes("pv")) {
        const pvNumMatch = line.match(/multipv (\d+)/);
        const cpMatch = line.match(/score cp (-?\d+)/);
        const mateMatch = line.match(/score mate (-?\d+)/);
        const pvMatch = line.match(/ pv ([a-h][1-8][a-h][1-8][qrbnQRBN]?)/);
        if (!pvMatch) return;

        const pvNum = pvNumMatch ? parseInt(pvNumMatch[1]) : 1;
        const mateVal = mateMatch ? parseInt(mateMatch[1]) : undefined;
        const cpVal = cpMatch ? parseInt(cpMatch[1]) : (mateVal ? (mateVal > 0 ? 30000 : -30000) : 0);
        const moveStr = pvMatch[1].toLowerCase();

        multiPVRef.current.set(pvNum, {
          move: moveStr,
          score: cpVal,
          from: moveStr.slice(0, 2),
          to: moveStr.slice(2, 4),
          mate: mateVal,
        });

        if (pvNum === 1) setEvaluation({ cp: cpVal, mate: mateVal ?? undefined });
      }

      if (line.startsWith("bestmove")) {
        setThinking(false);
        const moves = Array.from(multiPVRef.current.entries())
          .sort(([a], [b]) => a - b)
          .map(([, m]) => m);
        multiPVRef.current.clear();
        setTopMoves(moves);
        onBestMoveRef.current?.(moves);
      }
    };

    worker.postMessage("uci");
    worker.postMessage("setoption name MultiPV value 3");

    return () => { worker.postMessage("quit"); worker.terminate(); };
  }, []);

  const analyze = useCallback((fen: string, depth: number, onDone?: (moves: TopMove[]) => void) => {
    if (!workerRef.current) return;
    onBestMoveRef.current = onDone ?? null;
    multiPVRef.current.clear();
    setThinking(true);
    setTopMoves([]);
    workerRef.current.postMessage("stop");
    workerRef.current.postMessage(`position fen ${fen}`);
    workerRef.current.postMessage(`go depth ${depth}`);
  }, []);

  const stop = useCallback(() => {
    workerRef.current?.postMessage("stop");
    setThinking(false);
  }, []);

  return { topMoves, evaluation, thinking, analyze, stop };
}

export function ChessTool() {
  const [game, setGame] = useState(() => new Chess());
  const [userColor, setUserColor] = useState<"white" | "black">("white");
  const [depth, setDepth] = useState(DEPTH_DEFAULT);
  const [arrows, setArrows] = useState<[string, string, string][]>([]);
  const [moveLog, setMoveLog] = useState<MoveLog[]>([]);
  const [boardOrientation, setBoardOrientation] = useState<"white" | "black">("white");
  const [highlightSquares, setHighlightSquares] = useState<Record<string, React.CSSProperties>>({});
  const logRef = useRef<HTMLDivElement>(null);

  const { topMoves, evaluation, thinking, analyze, stop } = useStockfish();

  const myColorChar = userColor === "white" ? "w" : "b";

  const triggerAnalysis = useCallback((fen: string, currentTurn: "w" | "b") => {
    if (currentTurn !== myColorChar) return;
    analyze(fen, depth, (moves) => {
      if (moves.length > 0) {
        const best = moves[0];
        setArrows([[best.from, best.to, "rgba(99,255,180,0.85)"]]);
        setHighlightSquares({
          [best.from]: { backgroundColor: "rgba(99,255,180,0.2)", borderRadius: "4px" },
          [best.to]: { backgroundColor: "rgba(99,255,180,0.3)", borderRadius: "4px" },
        });
      }
    });
  }, [myColorChar, analyze, depth]);

  function onPieceDrop(from: string, to: string): boolean {
    const gameCopy = new Chess(game.fen());
    try {
      const move = gameCopy.move({ from, to, promotion: "q" });
      if (!move) return false;

      setGame(gameCopy);
      setArrows([]);
      setHighlightSquares({});
      setMoveLog(prev => [...prev, { san: move.san, color: move.color, ply: prev.length + 1 }]);

      const newFen = gameCopy.fen();
      const nextTurn = gameCopy.turn();
      triggerAnalysis(newFen, nextTurn);
      return true;
    } catch {
      return false;
    }
  }

  function reset() {
    stop();
    const newGame = new Chess();
    setGame(newGame);
    setArrows([]);
    setHighlightSquares({});
    setMoveLog([]);
  }

  function flipBoard() {
    setBoardOrientation(o => o === "white" ? "black" : "white");
  }

  function playBestMove() {
    if (topMoves.length === 0 || game.turn() !== myColorChar) return;
    const best = topMoves[0];
    onPieceDrop(best.from, best.to);
  }

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [moveLog]);

  useEffect(() => {
    if (userColor === "black" && game.turn() === "w" && moveLog.length === 0) {
      setBoardOrientation("black");
    }
  }, [userColor]);

  const gameOver = game.isGameOver();
  const isCheck = game.isCheck();
  const isDraw = game.isDraw();
  const isCheckmate = game.isCheckmate();

  const barPercent = userColor === "white"
    ? evalToBar(evaluation.cp)
    : evalToBar(-evaluation.cp);

  const evalStr = evaluation.mate !== undefined
    ? evalLabel(evaluation.cp, evaluation.mate)
    : evalLabel(evaluation.cp);

  const moveLogPairs: { white?: MoveLog; black?: MoveLog; idx: number }[] = [];
  for (let i = 0; i < moveLog.length; i += 2) {
    moveLogPairs.push({ white: moveLog[i], black: moveLog[i + 1], idx: i / 2 + 1 });
  }

  return (
    <div className="min-h-screen" style={{ background: "#050505", fontFamily: FONT }}>
      <Navigation />

      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-15%] left-[-5%] w-[50vw] h-[50vw] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(99,255,180,0.04) 0%, transparent 70%)" }}
        />
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.25, 0.1] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 5 }}
          className="absolute bottom-0 right-[-10%] w-[40vw] h-[40vw] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(196,181,253,0.04) 0%, transparent 70%)" }}
        />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 pt-24 pb-16">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-2">
            <Swords className="w-4 h-4" style={{ color: "rgba(99,255,180,0.6)" }} />
            <span className="text-xs font-mono tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.35)" }}>
              Tool
            </span>
          </div>
          <h1 className="text-3xl font-black text-white mb-1">AI Chess Advisor</h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            Phân tích nước đi bằng Stockfish — nhập nước đối thủ, nhận gợi ý tốt nhất cho bên bạn.
          </p>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-5 items-start">

          {/* Left — Board */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex-shrink-0 w-full lg:w-auto"
          >
            {/* Game status banner */}
            <AnimatePresence>
              {(gameOver || isCheck) && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mb-3 flex items-center gap-2 px-4 py-2.5 rounded-xl"
                  style={{
                    background: isCheckmate
                      ? "rgba(99,255,180,0.08)"
                      : isDraw
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(251,191,36,0.08)",
                    border: `1px solid ${isCheckmate ? "rgba(99,255,180,0.2)" : isDraw ? "rgba(255,255,255,0.12)" : "rgba(251,191,36,0.2)"}`,
                  }}
                >
                  {isCheckmate
                    ? <Trophy className="w-4 h-4" style={{ color: "rgba(99,255,180,0.9)" }} />
                    : isDraw
                      ? <AlertTriangle className="w-4 h-4" style={{ color: "rgba(255,255,255,0.6)" }} />
                      : <AlertTriangle className="w-4 h-4" style={{ color: "rgba(251,191,36,0.9)" }} />}
                  <span className="text-sm font-bold" style={{
                    color: isCheckmate ? "rgba(99,255,180,0.9)" : isDraw ? "rgba(255,255,255,0.7)" : "rgba(251,191,36,0.9)"
                  }}>
                    {isCheckmate ? "Chiếu hết!" : isDraw ? "Hoà cờ!" : "Chiếu tướng!"}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Board container */}
            <div className="relative" style={{ width: "min(100vw - 2rem, 480px)" }}>
              <Chessboard
                boardWidth={Math.min(typeof window !== "undefined" ? window.innerWidth - 32 : 480, 480)}
                position={game.fen()}
                onPieceDrop={onPieceDrop}
                boardOrientation={boardOrientation}
                customArrows={arrows}
                customSquareStyles={highlightSquares}
                customDarkSquareStyle={{ backgroundColor: "#2d4a3e" }}
                customLightSquareStyle={{ backgroundColor: "#a8c8a0" }}
                animationDuration={180}
              />

              {/* Thinking overlay */}
              <AnimatePresence>
                {thinking && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute bottom-2 left-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                    style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Brain className="w-3.5 h-3.5" style={{ color: "rgba(99,255,180,0.9)" }} />
                    </motion.div>
                    <span className="text-xs font-mono" style={{ color: "rgba(99,255,180,0.9)" }}>
                      Stockfish đang tính...
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Board controls */}
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={flipBoard}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.6)",
                }}
              >
                <FlipHorizontal2 className="w-3.5 h-3.5" /> Xoay bàn
              </button>
              <button
                onClick={reset}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.6)",
                }}
              >
                <RotateCcw className="w-3.5 h-3.5" /> Đặt lại
              </button>
              <button
                onClick={() => triggerAnalysis(game.fen(), game.turn())}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ml-auto"
                style={{
                  background: "rgba(99,255,180,0.08)",
                  border: "1px solid rgba(99,255,180,0.2)",
                  color: "rgba(99,255,180,0.85)",
                }}
              >
                <Zap className="w-3.5 h-3.5" /> Phân tích
              </button>
            </div>
          </motion.div>

          {/* Right — Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 flex flex-col gap-4 min-w-0 w-full"
          >

            {/* Settings row */}
            <div className="flex flex-wrap gap-3">
              {/* My color */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "rgba(255,255,255,0.35)" }}>Màu của bạn</span>
                <div className="flex gap-1.5">
                  {(["white", "black"] as const).map(c => (
                    <button
                      key={c}
                      onClick={() => { setUserColor(c); setBoardOrientation(c); reset(); }}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                      style={{
                        background: userColor === c ? (c === "white" ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.6)") : "rgba(255,255,255,0.04)",
                        border: `1px solid ${userColor === c ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.08)"}`,
                        color: userColor === c ? "#fff" : "rgba(255,255,255,0.4)",
                      }}
                    >
                      {c === "white" ? "⬜ Trắng" : "⬛ Đen"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Depth */}
              <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
                <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Độ sâu: {depth}
                </span>
                <input
                  type="range" min={5} max={22} value={depth}
                  onChange={e => setDepth(Number(e.target.value))}
                  className="w-full accent-green-400 h-1.5"
                  style={{ accentColor: "rgba(99,255,180,0.8)" }}
                />
              </div>
            </div>

            {/* Evaluation bar */}
            <div
              className="rounded-xl p-4"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "rgba(255,255,255,0.35)" }}>Đánh giá</span>
                <span className="text-sm font-black font-mono" style={{
                  color: evaluation.cp > 0 ? "rgba(134,239,172,0.95)" : evaluation.cp < 0 ? "rgba(248,113,113,0.95)" : "rgba(255,255,255,0.6)"
                }}>
                  {evalStr}
                </span>
              </div>
              <div className="relative h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <motion.div
                  className="h-full rounded-full"
                  animate={{ width: `${barPercent}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  style={{
                    background: "linear-gradient(to right, rgba(248,113,113,0.8), rgba(255,255,255,0.3) 50%, rgba(134,239,172,0.8))",
                    transformOrigin: "left",
                  }}
                />
                <div className="absolute inset-y-0 left-1/2 w-px" style={{ background: "rgba(255,255,255,0.2)" }} />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[9px]" style={{ color: "rgba(248,113,113,0.6)" }}>Đen</span>
                <span className="text-[9px]" style={{ color: "rgba(134,239,172,0.6)" }}>Trắng</span>
              </div>
            </div>

            {/* Suggested moves */}
            <div
              className="rounded-xl p-4"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Gợi ý nước đi
                </span>
                {topMoves.length > 0 && game.turn() === myColorChar && (
                  <button
                    onClick={playBestMove}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all"
                    style={{
                      background: "rgba(99,255,180,0.1)",
                      border: "1px solid rgba(99,255,180,0.25)",
                      color: "rgba(99,255,180,0.85)",
                    }}
                  >
                    <ChevronRight className="w-3 h-3" /> Đi luôn
                  </button>
                )}
              </div>

              {thinking ? (
                <div className="flex flex-col gap-2">
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      animate={{ opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                      className="h-10 rounded-lg"
                      style={{ background: "rgba(255,255,255,0.04)" }}
                    />
                  ))}
                </div>
              ) : topMoves.length === 0 ? (
                <p className="text-xs text-center py-4" style={{ color: "rgba(255,255,255,0.2)" }}>
                  {game.turn() === myColorChar
                    ? "Nhấn \"Phân tích\" để xem gợi ý"
                    : "Đang chờ bạn nhập nước của đối thủ…"}
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {topMoves.map((m, i) => (
                    <motion.div
                      key={m.move}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      onClick={() => {
                        if (i === 0) playBestMove();
                        else {
                          setArrows([[m.from, m.to, i === 1 ? "rgba(147,197,253,0.75)" : "rgba(196,181,253,0.65)"]]);
                          setHighlightSquares({
                            [m.from]: { backgroundColor: "rgba(147,197,253,0.15)", borderRadius: "4px" },
                            [m.to]: { backgroundColor: "rgba(147,197,253,0.25)", borderRadius: "4px" },
                          });
                        }
                      }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all"
                      style={{
                        background: i === 0 ? "rgba(99,255,180,0.06)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${i === 0 ? "rgba(99,255,180,0.2)" : "rgba(255,255,255,0.06)"}`,
                      }}
                    >
                      <span className="text-[10px] font-black w-4" style={{
                        color: i === 0 ? "rgba(99,255,180,0.7)" : "rgba(255,255,255,0.25)"
                      }}>
                        #{i + 1}
                      </span>
                      <span className="font-black text-sm font-mono flex-1" style={{
                        color: i === 0 ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.55)"
                      }}>
                        {m.move.toUpperCase()}
                      </span>
                      <span className="text-xs font-mono font-bold" style={{
                        color: m.score > 0
                          ? "rgba(134,239,172,0.8)"
                          : m.score < 0
                            ? "rgba(248,113,113,0.8)"
                            : "rgba(255,255,255,0.4)",
                      }}>
                        {m.mate !== undefined ? evalLabel(m.score, m.mate) : evalLabel(m.score)}
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Move history */}
            <div
              className="rounded-xl p-4 flex flex-col gap-2"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "rgba(255,255,255,0.35)" }}>
                Lịch sử nước đi
              </span>
              {moveLogPairs.length === 0 ? (
                <p className="text-xs py-2" style={{ color: "rgba(255,255,255,0.2)" }}>Chưa có nước nào…</p>
              ) : (
                <div
                  ref={logRef}
                  className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-1"
                  style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}
                >
                  {moveLogPairs.map(pair => (
                    <div key={pair.idx} className="flex items-center gap-2 text-xs font-mono">
                      <span className="w-6 text-right shrink-0" style={{ color: "rgba(255,255,255,0.25)" }}>
                        {pair.idx}.
                      </span>
                      <span className="w-16" style={{ color: "rgba(255,255,255,0.75)" }}>
                        {pair.white?.san ?? ""}
                      </span>
                      <span style={{ color: "rgba(255,255,255,0.45)" }}>
                        {pair.black?.san ?? ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </motion.div>
        </div>
      </div>
    </div>
  );
}
