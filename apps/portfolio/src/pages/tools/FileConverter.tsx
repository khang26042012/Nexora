import { Navigation } from "@/components/navigation";
import { ToolVideoBg } from "@/components/ToolVideoBg";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Upload, Download, ArrowLeftRight, X,
  Loader2, AlertTriangle, CheckCircle2, FileText,
} from "lucide-react";
import { useState, useRef, useCallback } from "react";
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

function fmtSize(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

type ConversionId =
  | "txt-pdf" | "img-pdf" | "pdf-txt"
  | "csv-json" | "json-csv"
  | "md-txt" | "txt-docx" | "json-txt";

interface Conversion {
  id: ConversionId;
  label: string;
  from: string;
  to: string;
  accept: string;
  desc: string;
}

const CONVERSIONS: Conversion[] = [
  { id: "txt-pdf",  label: "TXT → PDF",  from: "TXT",  to: "PDF",  accept: ".txt,text/plain", desc: "Chuyển văn bản thuần sang file PDF" },
  { id: "img-pdf",  label: "Ảnh → PDF",  from: "IMG",  to: "PDF",  accept: ".png,.jpg,.jpeg,.webp,image/*", desc: "Gộp ảnh (PNG/JPG/WebP) thành một file PDF" },
  { id: "pdf-txt",  label: "PDF → TXT",  from: "PDF",  to: "TXT",  accept: ".pdf,application/pdf", desc: "Trích xuất toàn bộ văn bản từ PDF" },
  { id: "csv-json", label: "CSV → JSON", from: "CSV",  to: "JSON", accept: ".csv,text/csv", desc: "Chuyển bảng CSV thành mảng JSON" },
  { id: "json-csv", label: "JSON → CSV", from: "JSON", to: "CSV",  accept: ".json,application/json", desc: "Chuyển mảng JSON thành bảng CSV" },
  { id: "json-txt", label: "JSON → TXT", from: "JSON", to: "TXT",  accept: ".json,application/json", desc: "Định dạng JSON thành văn bản dễ đọc" },
  { id: "md-txt",   label: "MD → TXT",   from: "MD",   to: "TXT",  accept: ".md,.markdown,text/plain", desc: "Loại bỏ cú pháp Markdown, giữ lại văn bản" },
  { id: "txt-docx", label: "TXT → DOCX", from: "TXT",  to: "DOCX", accept: ".txt,text/plain", desc: "Chuyển văn bản thuần sang định dạng Word" },
];

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function convert(id: ConversionId, files: File[]): Promise<void> {
  const file = files[0];

  if (id === "txt-pdf") {
    const text = await file.text();
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const lines = doc.splitTextToSize(text, 180);
    let y = 15;
    for (const line of lines) {
      if (y > 275) { doc.addPage(); y = 15; }
      doc.setFontSize(11);
      doc.text(line, 15, y);
      y += 6;
    }
    doc.save(file.name.replace(/\.[^.]+$/, "") + ".pdf");
    return;
  }

  if (id === "img-pdf") {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    let first = true;
    for (const f of files) {
      const url = await new Promise<string>(res => {
        const r = new FileReader();
        r.onload = e => res(e.target!.result as string);
        r.readAsDataURL(f);
      });
      const img = await new Promise<HTMLImageElement>(res => {
        const i = new Image();
        i.onload = () => res(i);
        i.src = url;
      });
      const pw = 210, ph = 297;
      const ratio = Math.min(pw / img.naturalWidth * 25.4, ph / img.naturalHeight * 25.4, 1);
      const w = (img.naturalWidth * ratio) / 25.4 * 25.4;
      const h = (img.naturalHeight * ratio) / 25.4 * 25.4;
      const ext = (f.type.split("/")[1] || "jpeg").toUpperCase().replace("JPEG", "JPEG");
      if (!first) doc.addPage();
      doc.addImage(url, ext === "WEBP" ? "WEBP" : ext, (pw - w) / 2, (ph - h) / 2, w, h);
      first = false;
    }
    doc.save("images.pdf");
    return;
  }

  if (id === "pdf-txt") {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url
    ).href;
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let result = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      result += content.items.map((item: { str?: string }) => item.str ?? "").join(" ") + "\n\n";
    }
    downloadBlob(new Blob([result], { type: "text/plain" }), file.name.replace(/\.pdf$/i, "") + ".txt");
    return;
  }

  if (id === "csv-json") {
    const text = await file.text();
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
    const rows = lines.slice(1).map(line => {
      const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
      return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
    });
    const json = JSON.stringify(rows, null, 2);
    downloadBlob(new Blob([json], { type: "application/json" }), file.name.replace(/\.csv$/i, "") + ".json");
    return;
  }

  if (id === "json-csv") {
    const text = await file.text();
    const data = JSON.parse(text);
    const arr = Array.isArray(data) ? data : [data];
    if (arr.length === 0) throw new Error("JSON rỗng");
    const headers = Object.keys(arr[0]);
    const rows = [headers.join(","), ...arr.map((row: Record<string, unknown>) =>
      headers.map(h => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(",")
    )];
    downloadBlob(new Blob([rows.join("\n")], { type: "text/csv" }), file.name.replace(/\.json$/i, "") + ".csv");
    return;
  }

  if (id === "json-txt") {
    const text = await file.text();
    const pretty = JSON.stringify(JSON.parse(text), null, 2);
    downloadBlob(new Blob([pretty], { type: "text/plain" }), file.name.replace(/\.json$/i, "") + ".txt");
    return;
  }

  if (id === "md-txt") {
    const text = await file.text();
    const plain = text
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/`{1,3}([^`]+)`{1,3}/g, "$1")
      .replace(/\[(.+?)\]\(.*?\)/g, "$1")
      .replace(/^[-*+]\s+/gm, "• ")
      .replace(/^>\s+/gm, "")
      .replace(/---/g, "")
      .trim();
    downloadBlob(new Blob([plain], { type: "text/plain" }), file.name.replace(/\.(md|markdown)$/i, "") + ".txt");
    return;
  }

  if (id === "txt-docx") {
    const text = await file.text();
    const { Document, Packer, Paragraph, TextRun } = await import("docx");
    const paragraphs = text.split("\n").map(line =>
      new Paragraph({ children: [new TextRun(line)] })
    );
    const doc = new Document({ sections: [{ children: paragraphs }] });
    const blob = await Packer.toBlob(doc);
    downloadBlob(blob, file.name.replace(/\.txt$/i, "") + ".docx");
    return;
  }
}

export function FileConverter() {
  const [, navigate] = useLocation();
  const [convId, setConvId] = useState<ConversionId>("txt-pdf");
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const conv = CONVERSIONS.find(c => c.id === convId)!;
  const multiFile = convId === "img-pdf";

  const addFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return;
    const arr = Array.from(incoming);
    setFiles(multiFile ? arr : [arr[0]]);
    setDone(false);
    setError("");
  }, [multiFile]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleConvert = async () => {
    if (!files.length) return;
    setLoading(true);
    setError("");
    setDone(false);
    try {
      await convert(convId, files);
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi chuyển đổi.");
    } finally {
      setLoading(false);
    }
  };

  const switchConv = (id: ConversionId) => {
    setConvId(id);
    setFiles([]);
    setDone(false);
    setError("");
  };

  return (
    <div className="min-h-screen" style={{ background: "#050505", fontFamily: FONT }}>
      <Navigation />
      <ToolVideoBg />

      <div className="relative max-w-2xl mx-auto px-5 pt-28 pb-24">
        {/* Back */}
        <motion.button initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate("/tool")}
          className="flex items-center gap-2 mb-8 text-sm hover:opacity-80 transition-opacity"
          style={{ color: "rgba(255,255,255,0.4)" }}>
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </motion.button>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
              <ArrowLeftRight className="w-5 h-5" style={{ color: "rgba(255,255,255,0.75)" }} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black text-white">File Converter</h1>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wide uppercase"
                  style={{ background: "rgba(251,191,36,0.12)", color: "rgba(251,191,36,0.8)", border: "1px solid rgba(251,191,36,0.2)" }}>Beta</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wide uppercase"
                  style={{ background: "rgba(34,197,94,0.1)", color: "rgba(34,197,94,0.8)", border: "1px solid rgba(34,197,94,0.2)" }}>New</span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>Chuyển đổi file ngay trên trình duyệt — không upload lên server.</p>
            </div>
          </div>
        </motion.div>

        {/* Conversion type grid */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.5 }} className="mb-5">
          <p className="text-xs font-semibold mb-3 tracking-wide uppercase" style={{ color: "rgba(255,255,255,0.35)" }}>Chọn kiểu chuyển đổi</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CONVERSIONS.map(c => (
              <button key={c.id} onClick={() => switchConv(c.id)}
                className="px-3 py-2.5 rounded-xl text-xs font-semibold transition-all hover:opacity-90 active:scale-95 text-center"
                style={{
                  background: convId === c.id ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${convId === c.id ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.08)"}`,
                  color: convId === c.id ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.45)",
                }}>
                {c.label}
              </button>
            ))}
          </div>
          <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.3)" }}>{conv.desc}</p>
        </motion.div>

        {/* Drop zone */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14, duration: 0.45 }} className="mb-5">
          <AnimBorderCard speed={5} color={dragging ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)"} radius={16}>
            <div
              className="p-6 flex flex-col items-center gap-3 cursor-pointer transition-all"
              style={{ background: dragging ? "rgba(255,255,255,0.04)" : "transparent" }}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <input ref={inputRef} type="file" className="hidden" accept={conv.accept} multiple={multiFile} onChange={e => addFiles(e.target.files)} />

              {files.length === 0 ? (
                <>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <Upload className="w-5 h-5" style={{ color: "rgba(255,255,255,0.4)" }} />
                  </div>
                  <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
                    {multiFile ? "Kéo thả nhiều ảnh hoặc nhấn để chọn" : "Kéo thả file hoặc nhấn để chọn"}
                  </p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>Hỗ trợ: {conv.accept.split(",").filter(a => a.startsWith(".")).join(", ")}</p>
                </>
              ) : (
                <div className="w-full space-y-2">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <FileText className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(255,255,255,0.4)" }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate" style={{ color: "rgba(255,255,255,0.8)" }}>{f.name}</p>
                        <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{fmtSize(f.size)}</p>
                      </div>
                      <button onClick={e => { e.stopPropagation(); setFiles(files.filter((_, j) => j !== i)); }}
                        className="flex-shrink-0 hover:opacity-80" style={{ color: "rgba(255,255,255,0.3)" }}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}
                    className="w-full py-2 rounded-xl text-xs transition-all hover:opacity-80"
                    style={{ border: "1px dashed rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.3)" }}>
                    + Thêm file
                  </button>
                </div>
              )}
            </div>
          </AnimBorderCard>
        </motion.div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "rgba(239,68,68,0.8)" }}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
              <button onClick={() => setError("")} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Convert button */}
        <motion.button
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.4 }}
          onClick={handleConvert}
          disabled={!files.length || loading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: done ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.1)",
            border: `1px solid ${done ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.15)"}`,
            color: done ? "rgba(34,197,94,0.9)" : "rgba(255,255,255,0.9)",
          }}>
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang chuyển đổi…</>
            : done ? <><CheckCircle2 className="w-4 h-4" /> Tải về thành công!</>
            : <><Download className="w-4 h-4" /> Chuyển đổi & Tải về</>}
        </motion.button>
      </div>
    </div>
  );
}
