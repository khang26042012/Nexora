import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, CheckCircle, AlertTriangle, Loader2, Download, Sparkles, X, Languages } from "lucide-react";
import { Navigation } from "@/components/navigation";

const FONT = "'Plus Jakarta Sans', sans-serif";
const VIDEO_URL = "https://raw.githubusercontent.com/khang26042012/Nexora/main/apps/portfolio/public/hero-bg.mp4";

const glass: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 20,
};
const cardInner: React.CSSProperties = { padding: "20px" };

type ChunkStatus = "pending" | "processing" | "done" | "error";
interface ChunkInfo {
  id: number;
  lines: string[];
  status: ChunkStatus;
  result?: string;
  error?: string;
}

const SYSTEM_PROMPT = `Nhiệm vụ: Việt hóa file cấu hình plugin Minecraft (messages.yml / lang.yml / config.yml) sang tiếng Việt.

QUY TẮC BẮT BUỘC - VI PHẠM SẼ LÀM PLUGIN LỖI:

1. CHỈ dịch phần VALUE (bên phải dấu ":"), TUYỆT ĐỐI KHÔNG đổi KEY (bên trái dấu ":").
   Ví dụ:
   - Đúng: no-permission: "Bạn không có quyền làm điều này!"
   - SAI:  khong-co-quyen: "Bạn không có quyền làm điều này!"

2. GIỮ NGUYÊN 100% mọi placeholder/biến, không dịch, không đổi vị trí, không thêm/bớt ký tự bên trong: %player%, {amount}, <player>, {0}, {1}, %target%, v.v. Chỉ dịch phần chữ tiếng Anh XUNG QUANH placeholder.
   Ví dụ:
   - Gốc:  "Teleported to %player%"
   - Đúng: "Đã dịch chuyển đến %player%"
   - SAI:  "Đã dịch chuyển đến %nguoichoi%"

3. GIỮ NGUYÊN 100% mã màu và mã định dạng: &a, &c, &l, &n, §4, §6, <red>, <bold>, v.v. Không xoá, không di chuyển sang vị trí khác trong câu.

4. GIỮ NGUYÊN cấu trúc YAML: thụt đầu dòng (indent), dấu ngoặc kép/đơn, dấu hai chấm, thứ tự các dòng. Không thêm dòng mới, không xoá dòng nào kể cả dòng comment (bắt đầu bằng #).

5. Với dòng comment (#) giải thích cho admin đọc (không phải text hiển thị cho người chơi): CÓ THỂ dịch nếu muốn, vì không ảnh hưởng tới việc plugin đọc file.

6. Nếu gặp file có sẵn thư mục lang/ với nhiều file theo mã ngôn ngữ (en.yml, de.yml...) và có khả năng tạo file mới: tạo file vi.yml hoặc vi_VN.yml riêng (copy cấu trúc từ en.yml), KHÔNG ghi đè trực tiếp lên file gốc.

7. Dịch tự nhiên, đúng ngữ cảnh Minecraft (ví dụ "cooldown" → "thời gian hồi", "teleport" → "dịch chuyển", không dịch cứng nhắc từng từ).

8. Sau khi dịch xong, kiểm tra lại: đếm số lượng placeholder trong bản gốc và bản dịch phải KHỚP NHAU CHÍNH XÁC cho từng dòng - nếu thiếu hoặc thừa placeholder, dòng đó sẽ gây lỗi hoặc hiển thị sai khi plugin chạy.

Sau khi hoàn thành, liệt kê lại RÕ RÀNG:
- Tên file đã dịch
- Tổng số dòng đã dịch
- Danh sách bất kỳ dòng nào bạn KHÔNG CHẮC CHẮN về placeholder hoặc cấu trúc (để tôi tự kiểm tra lại thủ công trước khi áp dụng vào server)`;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function splitIntoChunks(content: string, maxWordsPerChunk: number = 800): string[] {
  const lines = content.split("\n");
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentWordCount = 0;
  for (const line of lines) {
    const lineWords = countWords(line);
    if (currentWordCount + lineWords > maxWordsPerChunk && currentChunk.length > 0) {
      chunks.push(currentChunk.join("\n"));
      currentChunk = [];
      currentWordCount = 0;
    }
    currentChunk.push(line);
    currentWordCount += lineWords;
  }
  if (currentChunk.length > 0) chunks.push(currentChunk.join("\n"));
  return chunks;
}

export function Localize() {
  const [file, setFile] = useState<File | null>(null);
  const [content, setContent] = useState("");
  const [chunks, setChunks] = useState<ChunkInfo[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState("");
  const [stats, setStats] = useState({ totalLines: 0, totalWords: 0, chunks: 0 });
  const [uncertainLines, setUncertainLines] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const start = () => vid.play().catch(() => {});
    if ("requestIdleCallback" in window) (window as any).requestIdleCallback(start, { timeout: 1500 });
    else setTimeout(start, 600);
  }, []);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setContent(text);
      const lines = text.split("\n");
      const words = countWords(text);
      const chunkList = splitIntoChunks(text);
      setStats({ totalLines: lines.length, totalWords: words, chunks: chunkList.length });
      setChunks(chunkList.map((chunk, i) => ({ id: i, lines: chunk.split("\n"), status: "pending" })));
      setResult("");
      setUncertainLines([]);
    };
    reader.readAsText(uploadedFile);
  }, []);

  const processChunk = async (chunk: string, chunkIndex: number): Promise<string> => {
    const response = await fetch("/api/localize/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: chunk, chunkIndex, totalChunks: chunks.length }),
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`API error: ${response.status} - ${err.slice(0, 200)}`);
    }
    const data = await response.json();
    return data.translated;
  };

  const startTranslation = async () => {
    if (chunks.length === 0) return;
    setIsProcessing(true);
    setProgress(0);
    setResult("");
    setUncertainLines([]);

    const results: string[] = [];
    const uncertain: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      setChunks(prev => prev.map(c => c.id === i ? { ...c, status: "processing" } : c));
      try {
        const translated = await processChunk(chunks[i].lines.join("\n"), i);
        results.push(translated);
        const originalPlaceholders = chunks[i].lines.join("\n").match(/%[^%]+%|\{[^}]+\}|<[^>]+>/g) || [];
        const translatedPlaceholders = translated.match(/%[^%]+%|\{[^}]+\}|<[^>]+>/g) || [];
        if (originalPlaceholders.length !== translatedPlaceholders.length) {
          uncertain.push(`Chunk ${i + 1}: Số placeholder không khớp (gốc: ${originalPlaceholders.length}, dịch: ${translatedPlaceholders.length})`);
        }
        setChunks(prev => prev.map(c => c.id === i ? { ...c, status: "done", result: translated } : c));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown";
        setChunks(prev => prev.map(c => c.id === i ? { ...c, status: "error", error: msg } : c));
        results.push(chunks[i].lines.join("\n"));
        uncertain.push(`Chunk ${i + 1}: Lỗi - ${msg}`);
      }
      setProgress(Math.round(((i + 1) / chunks.length) * 100));
    }

    setResult(results.join("\n"));
    setUncertainLines(uncertain);
    setIsProcessing(false);
  };

  const downloadResult = () => {
    if (!result || !file) return;
    const blob = new Blob([result], { type: "text/yaml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name.replace(/\.(yml|yaml|txt)$/, "_vi.$1");
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetAll = () => {
    setFile(null);
    setContent("");
    setChunks([]);
    setResult("");
    setUncertainLines([]);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
            <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-white/30 mb-2">AI Tool</p>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
                <Languages size={18} style={{ color: "rgba(255,180,220,0.8)" }} />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white" style={{ fontFamily: FONT, fontWeight: 800 }}>
                Việt Hóa Plugin Minecraft
              </h2>
            </div>
            <div className="mt-3 h-px rounded-full" style={{ width: 40, background: "linear-gradient(to right, rgba(255,180,220,0.5), transparent)" }} />
            <p className="text-sm text-white/40 mt-2">Upload file messages.yml / lang.yml / config.yml — AI sẽ dịch sang tiếng Việt an toàn theo đúng cấu trúc YAML, giữ nguyên placeholder và mã màu.</p>
          </div>

          {/* Upload Area - Card */}
          {!content && (
            <div className="running-border" style={{ "--rb-speed": "6s", "--rb-color": "rgba(255,180,220,0.45)", "--rb-radius": "20px", background: "rgba(255,255,255,0.04)", borderRadius: 20 } as React.CSSProperties}>
              <div style={{ ...cardInner, padding: 60, textAlign: "center", cursor: "pointer" }} onClick={() => fileInputRef.current?.click()}>
                <Upload size={48} style={{ color: "rgba(255,180,220,0.7)", marginBottom: 20 }} />
                <p style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>Click để chọn file</p>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Hỗ trợ .yml, .yaml, .txt, .properties (tối đa 10MB)</p>
                <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 12, marginTop: 8 }}>Dịch từng chunk nhỏ để AI xử lý chính xác hơn</p>
                <input ref={fileInputRef} type="file" accept=".yml,.yaml,.txt,.properties" onChange={handleFileUpload} style={{ display: "none" }} />
              </div>
            </div>
          )}

          {/* File Info & Stats */}
          {content && (
            <div className="running-border" style={{ "--rb-speed": "6s", "--rb-color": "rgba(255,255,255,0.35)", "--rb-radius": "20px", background: "rgba(255,255,255,0.04)", borderRadius: 20, marginBottom: 24 } as React.CSSProperties}>
              <div style={cardInner}>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
                    <FileText size={18} style={{ color: "rgba(255,255,255,0.7)" }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p style={{ fontWeight: 600, fontSize: 16 }}>{file?.name}</p>
                    <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>{(file?.size || 0) / 1024 > 1024 ? ((file?.size || 0)/1024/1024).toFixed(2) + " MB" : ((file?.size || 0)/1024).toFixed(1) + " KB"}</p>
                  </div>
                  {!isProcessing && !result && (
                    <button onClick={resetAll} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer" }} title="Hủy">
                      <X size={18} />
                    </button>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                  <div style={{ ...glass, padding: 16, textAlign: "center" }}>
                    <p style={{ fontSize: 24, fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>{stats.totalLines}</p>
                    <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>Dòng</p>
                  </div>
                  <div style={{ ...glass, padding: 16, textAlign: "center" }}>
                    <p style={{ fontSize: 24, fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>{stats.totalWords.toLocaleString()}</p>
                    <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>Từ</p>
                  </div>
                  <div style={{ ...glass, padding: 16, textAlign: "center" }}>
                    <p style={{ fontSize: 24, fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>{stats.chunks}</p>
                    <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>Chunks</p>
                  </div>
                </div>

                {!isProcessing && !result && (
                  <button onClick={startTranslation} style={{ width: "100%", marginTop: 20, padding: "14px 24px", background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", border: "none", borderRadius: 12, color: "white", fontSize: 16, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                    <Sparkles size={20} />
                    Bắt đầu Việt hóa
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Processing Progress */}
          {isProcessing && (
            <div style={{ ...glass, padding: 20, marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <Loader2 size={20} className="animate-spin" style={{ color: "rgba(255,180,220,0.8)" }} />
                <span style={{ fontWeight: 500 }}>Đang xử lý... {progress}%</span>
              </div>
              <div style={{ height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 4, overflow: "hidden" }}>
                <motion.div style={{ height: "100%", background: "linear-gradient(90deg, #3b82f6, #8b5cf6)", borderRadius: 4 }} initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
              </div>
              <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {chunks.map((chunk) => (
                  <div key={chunk.id} style={{ width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, background: chunk.status === "done" ? "rgba(52,211,153,0.2)" : chunk.status === "processing" ? "rgba(96,165,250,0.2)" : chunk.status === "error" ? "rgba(251,113,133,0.2)" : "rgba(255,255,255,0.05)", color: chunk.status === "done" ? "#34d399" : chunk.status === "processing" ? "#60a5fa" : chunk.status === "error" ? "#fb7185" : "rgba(255,255,255,0.3)", border: `1px solid ${chunk.status === "done" ? "rgba(52,211,153,0.3)" : chunk.status === "processing" ? "rgba(96,165,250,0.3)" : chunk.status === "error" ? "rgba(251,113,133,0.3)" : "rgba(255,255,255,0.08)"}` }}>
                    {chunk.id + 1}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {result && !isProcessing && (
            <>
              {uncertainLines.length > 0 && (
                <div style={{ ...glass, padding: 16, marginBottom: 20, border: "1px solid rgba(251,191,36,0.2)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <AlertTriangle size={16} style={{ color: "#fbbf24" }} />
                    <span style={{ fontWeight: 600, color: "#fbbf24", fontSize: 14 }}>Cần kiểm tra thủ công</span>
                  </div>
                  <ul style={{ paddingLeft: 20, color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
                    {uncertainLines.map((line, i) => <li key={i} style={{ marginBottom: 4 }}>{line}</li>)}
                  </ul>
                </div>
              )}

              <div className="running-border" style={{ "--rb-speed": "6s", "--rb-color": "rgba(52,211,153,0.35)", "--rb-radius": "20px", background: "rgba(255,255,255,0.04)", borderRadius: 20, marginBottom: 20 } as React.CSSProperties}>
                <div style={cardInner}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                    <CheckCircle size={24} style={{ color: "#34d399" }} />
                    <span style={{ fontWeight: 600, fontSize: 18 }}>Việt hóa hoàn tất!</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12 }}>
                    <button onClick={downloadResult} style={{ padding: "14px 24px", background: "linear-gradient(135deg, #10b981, #059669)", border: "none", borderRadius: 12, color: "white", fontSize: 15, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                      <Download size={18} />
                      Tải file đã dịch
                    </button>
                    <button onClick={resetAll} style={{ padding: "14px 20px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
                      Dịch file khác
                    </button>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div style={{ ...glass, padding: 16 }}>
                <p style={{ fontWeight: 600, marginBottom: 12, color: "rgba(255,255,255,0.6)", fontSize: 14 }}>Xem trước (50 dòng đầu):</p>
                <pre style={{ background: "rgba(0,0,0,0.3)", padding: 16, borderRadius: 12, overflow: "auto", maxHeight: 400, fontSize: 12, lineHeight: 1.6, color: "rgba(255,255,255,0.75)", fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>
                  {result.split("\n").slice(0, 50).join("\n")}
                  {result.split("\n").length > 50 && "\n..."}
                </pre>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
