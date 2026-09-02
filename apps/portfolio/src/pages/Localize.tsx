import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, CheckCircle, AlertTriangle, Loader2, Download, Sparkles } from "lucide-react";
import { Navigation } from "@/components/navigation";

const FONT = "'Plus Jakarta Sans', sans-serif";

const glass: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 20,
};

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

CHỈ trả về nội dung YAML đã dịch, KHÔNG thêm giải thích hay markdown code fence.`;

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

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join("\n"));
  }

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

      setStats({
        totalLines: lines.length,
        totalWords: words,
        chunks: chunkList.length,
      });

      setChunks(chunkList.map((chunk, i) => ({
        id: i,
        lines: chunk.split("\n"),
        status: "pending",
      })));

      setResult("");
      setUncertainLines([]);
    };
    reader.readAsText(uploadedFile);
  }, []);

  const processChunk = async (chunk: string, chunkIndex: number): Promise<string> => {
    try {
      const response = await fetch("/api/localize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: chunk, systemPrompt: SYSTEM_PROMPT }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return data.translated;
    } catch (err) {
      throw new Error(`Lỗi xử lý chunk ${chunkIndex + 1}: ${err instanceof Error ? err.message : "Unknown"}`);
    }
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

        // Check for potential issues
        const originalPlaceholders = chunks[i].lines.join("\n").match(/%[^%]+%|\{[^}]+\}|<[^>]+>/g) || [];
        const translatedPlaceholders = translated.match(/%[^%]+%|\{[^}]+\}|<[^>]+>/g) || [];

        if (originalPlaceholders.length !== translatedPlaceholders.length) {
          uncertain.push(`Chunk ${i + 1}: Số placeholder không khớp (gốc: ${originalPlaceholders.length}, dịch: ${translatedPlaceholders.length})`);
        }

        setChunks(prev => prev.map(c => c.id === i ? { ...c, status: "done", result: translated } : c));
      } catch (err) {
        setChunks(prev => prev.map(c => c.id === i ? { ...c, status: "error", error: err instanceof Error ? err.message : "Unknown" } : c));
        results.push(chunks[i].lines.join("\n")); // Keep original on error
        uncertain.push(`Chunk ${i + 1}: Lỗi - ${err instanceof Error ? err.message : "Unknown"}`);
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

  return (
    <>
      <Navigation />
      <div style={{ fontFamily: FONT, minHeight: "100vh", background: "#0a0a0f", color: "white", padding: "100px 20px 40px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{ textAlign: "center", marginBottom: 40 }}
          >
            <h1 style={{ fontSize: 36, fontWeight: 700, marginBottom: 12, background: "linear-gradient(135deg, #60a5fa, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Việt Hóa Plugin Minecraft
            </h1>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 16 }}>
              Upload file messages.yml / lang.yml / config.yml — AI sẽ dịch sang tiếng Việt an toàn
            </p>
          </motion.div>

          {/* Upload Area */}
          {!content && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ ...glass, padding: 60, textAlign: "center", cursor: "pointer" }}
              onClick={() => fileInputRef.current?.click()}
              whileHover={{ borderColor: "rgba(96,165,250,0.4)" }}
            >
              <Upload size={48} style={{ color: "rgba(96,165,250,0.8)", marginBottom: 20 }} />
              <p style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>Click để chọn file</p>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Hỗ trợ .yml, .yaml, .txt (tối đa 5MB)</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".yml,.yaml,.txt,.properties"
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />
            </motion.div>
          )}

          {/* File Info & Stats */}
          {content && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ ...glass, padding: 24, marginBottom: 24 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                <FileText size={24} style={{ color: "rgba(96,165,250,0.8)" }} />
                <div>
                  <p style={{ fontWeight: 600, fontSize: 16 }}>{file?.name}</p>
                  <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>{(file?.size || 0 / 1024).toFixed(1)} KB</p>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                <div style={{ ...glass, padding: 16, textAlign: "center" }}>
                  <p style={{ fontSize: 28, fontWeight: 700, color: "#60a5fa" }}>{stats.totalLines}</p>
                  <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>Dòng</p>
                </div>
                <div style={{ ...glass, padding: 16, textAlign: "center" }}>
                  <p style={{ fontSize: 28, fontWeight: 700, color: "#a78bfa" }}>{stats.totalWords.toLocaleString()}</p>
                  <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>Từ</p>
                </div>
                <div style={{ ...glass, padding: 16, textAlign: "center" }}>
                  <p style={{ fontSize: 28, fontWeight: 700, color: "#34d399" }}>{stats.chunks}</p>
                  <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>Chunks</p>
                </div>
              </div>

              {!isProcessing && !result && (
                <button
                  onClick={startTranslation}
                  style={{
                    width: "100%",
                    marginTop: 20,
                    padding: "14px 24px",
                    background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                    border: "none",
                    borderRadius: 12,
                    color: "white",
                    fontSize: 16,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                  }}
                >
                  <Sparkles size={20} />
                  Bắt đầu Việt hóa
                </button>
              )}
            </motion.div>
          )}

          {/* Processing Progress */}
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ ...glass, padding: 24, marginBottom: 24 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <Loader2 size={20} className="animate-spin" style={{ color: "#60a5fa" }} />
                <span style={{ fontWeight: 500 }}>Đang xử lý... {progress}%</span>
              </div>

              <div style={{ height: 8, background: "rgba(255,255,255,0.1)", borderRadius: 4, overflow: "hidden" }}>
                <motion.div
                  style={{ height: "100%", background: "linear-gradient(90deg, #3b82f6, #8b5cf6)", borderRadius: 4 }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                />
              </div>

              <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {chunks.map((chunk) => (
                  <div
                    key={chunk.id}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 600,
                      background:
                        chunk.status === "done" ? "rgba(52,211,153,0.2)" :
                        chunk.status === "processing" ? "rgba(96,165,250,0.2)" :
                        chunk.status === "error" ? "rgba(251,113,133,0.2)" :
                        "rgba(255,255,255,0.05)",
                      color:
                        chunk.status === "done" ? "#34d399" :
                        chunk.status === "processing" ? "#60a5fa" :
                        chunk.status === "error" ? "#fb7185" :
                        "rgba(255,255,255,0.3)",
                      border: `1px solid ${
                        chunk.status === "done" ? "rgba(52,211,153,0.3)" :
                        chunk.status === "processing" ? "rgba(96,165,250,0.3)" :
                        chunk.status === "error" ? "rgba(251,113,133,0.3)" :
                        "rgba(255,255,255,0.08)"
                      }`,
                    }}
                  >
                    {chunk.id + 1}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Results */}
          {result && !isProcessing && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Uncertain Lines Warning */}
              {uncertainLines.length > 0 && (
                <div style={{ ...glass, padding: 20, marginBottom: 20, borderColor: "rgba(251,191,36,0.3)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <AlertTriangle size={20} style={{ color: "#fbbf24" }} />
                    <span style={{ fontWeight: 600, color: "#fbbf24" }}>Cần kiểm tra thủ công</span>
                  </div>
                  <ul style={{ paddingLeft: 20, color: "rgba(255,255,255,0.7)", fontSize: 14 }}>
                    {uncertainLines.map((line, i) => (
                      <li key={i} style={{ marginBottom: 4 }}>{line}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Success Card */}
              <div style={{ ...glass, padding: 24, marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <CheckCircle size={24} style={{ color: "#34d399" }} />
                  <span style={{ fontWeight: 600, fontSize: 18 }}>Việt hóa hoàn tất!</span>
                </div>

                <button
                  onClick={downloadResult}
                  style={{
                    width: "100%",
                    padding: "14px 24px",
                    background: "linear-gradient(135deg, #10b981, #059669)",
                    border: "none",
                    borderRadius: 12,
                    color: "white",
                    fontSize: 16,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                  }}
                >
                  <Download size={20} />
                  Tải file đã dịch
                </button>
              </div>

              {/* Preview */}
              <div style={{ ...glass, padding: 20 }}>
                <p style={{ fontWeight: 600, marginBottom: 12, color: "rgba(255,255,255,0.8)" }}>Xem trước (50 dòng đầu):</p>
                <pre style={{
                  background: "rgba(0,0,0,0.3)",
                  padding: 16,
                  borderRadius: 12,
                  overflow: "auto",
                  maxHeight: 400,
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: "rgba(255,255,255,0.8)",
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                }}>
                  {result.split("\n").slice(0, 50).join("\n")}
                  {result.split("\n").length > 50 && "\n..."}
                </pre>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </>
  );
}
