import { Navigation } from "@/components/navigation";
import { ToolVideoBg } from "@/components/ToolVideoBg";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Upload, Download, ArrowLeftRight,
  X, Loader2, AlertTriangle, FileText, CheckCircle2, Plus,
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

function getExt(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function baseName(name: string) {
  return name.replace(/\.[^.]+$/, "");
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type OutFmt = { label: string; ext: string };

const CODE_EXTS = new Set([
  "js","ts","jsx","tsx","py","java","c","cpp","cs","go","rs","php",
  "rb","swift","kt","sh","bash","sql","r","scala","lua","css","scss",
  "sass","less","html","htm","xml","yaml","yml","toml","ini","env",
  "md","markdown","rtf","log","txt","csv","json","txt",
]);

const IMAGE_EXTS = new Set(["png","jpg","jpeg","webp","gif","bmp","svg"]);

function getOutputFormats(exts: string[]): OutFmt[] {
  if (exts.length === 0) return [];

  /* ZIP riêng */
  if (exts.length === 1 && exts[0] === "zip") {
    return [{ label: "Giải nén & Tải", ext: "unzip" }];
  }

  /* Nhiều file → luôn có ZIP bundle */
  const multi = exts.length > 1;

  const allImages = exts.every(e => IMAGE_EXTS.has(e));
  const allText = exts.every(e => CODE_EXTS.has(e) || e === "txt" || e === "md");
  const hasPdf = exts.some(e => e === "pdf");
  const hasDocx = exts.some(e => e === "docx");

  const fmts: OutFmt[] = [];

  if (allImages) {
    fmts.push(
      { label: "PDF", ext: "pdf" },
      { label: "PNG", ext: "png" },
      { label: "JPG", ext: "jpg" },
      { label: "WebP", ext: "webp" },
    );
  } else if (hasPdf && exts.length === 1) {
    fmts.push(
      { label: "TXT", ext: "txt" },
      { label: "ZIP", ext: "zip-pack" },
    );
  } else if (hasDocx || exts.some(e => e === "docx")) {
    fmts.push(
      { label: "TXT", ext: "txt" },
      { label: "PDF", ext: "pdf" },
      { label: "ZIP", ext: "zip-pack" },
    );
  } else {
    /* CSV, JSON, text, code, mixed */
    const singleExt = exts.length === 1 ? exts[0] : "";

    if (singleExt === "csv") {
      fmts.push({ label: "JSON", ext: "json" });
    }
    if (singleExt === "json") {
      fmts.push({ label: "CSV", ext: "csv" });
    }
    if (allText || hasDocx) {
      fmts.push({ label: "TXT", ext: "txt" });
      fmts.push({ label: "PDF", ext: "pdf" });
      fmts.push({ label: "DOCX", ext: "docx" });
    } else {
      fmts.push({ label: "TXT", ext: "txt" });
      fmts.push({ label: "PDF", ext: "pdf" });
      fmts.push({ label: "DOCX", ext: "docx" });
    }
  }

  if (multi && !fmts.find(f => f.ext === "zip-pack")) {
    fmts.push({ label: "ZIP (tất cả)", ext: "zip-pack" });
  }

  return fmts;
}

/* ── Đọc nội dung text từ file ── */
async function readFileAsText(file: File): Promise<string> {
  const ext = getExt(file.name);

  /* DOCX → đọc XML trong zip */
  if (ext === "docx") {
    try {
      const JSZip = (await import("jszip")).default;
      const zip = await JSZip.loadAsync(file);
      const docXml = zip.files["word/document.xml"];
      if (docXml) {
        const xml = await docXml.async("text");
        return xml
          .replace(/<w:p[ >][^]*?<\/w:p>/g, m =>
            m.replace(/<[^>]+>/g, " ") + "\n")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      }
    } catch (_) { /* fallback */ }
  }

  /* PDF → text */
  if (ext === "pdf") {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).href;
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let result = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      result += (content.items as Array<{ str?: string }>).map(it => it.str ?? "").join(" ") + "\n\n";
    }
    return result;
  }

  return file.text();
}

/* ── Core converter (single file) ── */
async function convertOne(file: File, outExt: string): Promise<void> {
  const ext = getExt(file.name);
  const name = baseName(file.name);

  /* ── Ảnh → ảnh ── */
  if (IMAGE_EXTS.has(ext) && ["png","jpg","webp"].includes(outExt)) {
    const url = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>(res => { const i = new Image(); i.onload = () => res(i); i.src = url; });
    const c = document.createElement("canvas");
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext("2d")!.drawImage(img, 0, 0);
    const mime = outExt === "jpg" ? "image/jpeg" : `image/${outExt}`;
    const blob = await new Promise<Blob>(res => c.toBlob(b => res(b!), mime, 0.92));
    URL.revokeObjectURL(url);
    downloadBlob(blob, `${name}.${outExt}`);
    return;
  }

  /* ── Ảnh → PDF ── */
  if ((IMAGE_EXTS.has(ext) || file.type.startsWith("image/")) && outExt === "pdf") {
    const { jsPDF } = await import("jspdf");
    const dataUrl = await new Promise<string>(res => { const r = new FileReader(); r.onload = e => res(e.target!.result as string); r.readAsDataURL(file); });
    const img = await new Promise<HTMLImageElement>(res => { const i = new Image(); i.onload = () => res(i); i.src = dataUrl; });
    const pw = 210, ph = 297;
    const scale = Math.min(pw / img.naturalWidth, ph / img.naturalHeight);
    const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    doc.addImage(dataUrl, ["jpg","jpeg"].includes(ext) ? "JPEG" : "PNG", (pw - w) / 2, (ph - h) / 2, w, h);
    doc.save(`${name}.pdf`);
    return;
  }

  /* ── Bất kỳ file text-like → TXT ── */
  if (outExt === "txt") {
    const text = await readFileAsText(file);
    downloadBlob(new Blob([text], { type: "text/plain" }), `${name}.txt`);
    return;
  }

  /* ── → PDF ── */
  if (outExt === "pdf") {
    const text = await readFileAsText(file);
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(text, 180);
    let y = 15;
    for (const line of lines) {
      if (y > 280) { doc.addPage(); y = 15; }
      doc.text(line, 15, y); y += 5.5;
    }
    doc.save(`${name}.pdf`);
    return;
  }

  /* ── → DOCX ── */
  if (outExt === "docx") {
    const text = await readFileAsText(file);
    const { Document, Packer, Paragraph, TextRun } = await import("docx");
    const doc = new Document({ sections: [{ children: text.split("\n").map(l => new Paragraph({ children: [new TextRun(l)] })) }] });
    downloadBlob(await Packer.toBlob(doc), `${name}.docx`);
    return;
  }

  /* ── CSV → JSON ── */
  if (ext === "csv" && outExt === "json") {
    const text = await file.text();
    const rows = text.trim().split("\n");
    const headers = rows[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
    const data = rows.slice(1).map(row => {
      const vals = row.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
      return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
    });
    downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), `${name}.json`);
    return;
  }

  /* ── JSON → CSV ── */
  if (ext === "json" && outExt === "csv") {
    const data = JSON.parse(await file.text());
    const arr = Array.isArray(data) ? data : [data];
    const headers = Object.keys(arr[0] ?? {});
    const rows = [headers.join(","), ...arr.map((r: Record<string, unknown>) =>
      headers.map(h => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(","))];
    downloadBlob(new Blob([rows.join("\n")], { type: "text/csv" }), `${name}.csv`);
    return;
  }

  /* ── ZIP → giải nén ── */
  if (ext === "zip" && outExt === "unzip") {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(file);
    const names = Object.keys(zip.files).filter(n => !zip.files[n].dir);
    for (const fname of names) {
      const blob = await zip.files[fname].async("blob");
      downloadBlob(blob, fname.split("/").pop() ?? fname);
      await new Promise(r => setTimeout(r, 250));
    }
    return;
  }

  /* ── Fallback → TXT ── */
  const text = await file.text();
  downloadBlob(new Blob([text], { type: "text/plain" }), `${name}.txt`);
}

/* ── Batch: đóng gói thành ZIP ── */
async function convertToZipPack(files: File[]): Promise<void> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  for (const file of files) {
    const buf = await file.arrayBuffer();
    zip.file(file.name, buf);
  }
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  downloadBlob(blob, `files_${Date.now()}.zip`);
}

/* ── Component ── */
export function FileConverter() {
  const [, navigate] = useLocation();
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [converting, setConverting] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((newFiles: FileList | File[] | null) => {
    if (!newFiles) return;
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name + f.size));
      const toAdd = Array.from(newFiles).filter(f => !existing.has(f.name + f.size));
      return [...prev, ...toAdd];
    });
    setError(""); setDone(null);
  }, []);

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
    setDone(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleConvert = async (fmt: OutFmt) => {
    if (files.length === 0 || converting) return;
    setConverting(fmt.ext); setError(""); setDone(null);
    try {
      if (fmt.ext === "zip-pack") {
        await convertToZipPack(files);
      } else if (files.length === 1) {
        await convertOne(files[0], fmt.ext);
      } else {
        for (let i = 0; i < files.length; i++) {
          await convertOne(files[i], fmt.ext);
          if (i < files.length - 1) await new Promise(r => setTimeout(r, 350));
        }
      }
      setDone(fmt.label);
      setTimeout(() => setDone(null), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi chuyển đổi.");
    } finally {
      setConverting(null);
    }
  };

  const exts = [...new Set(files.map(f => getExt(f.name)))];
  const formats = getOutputFormats(exts);

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
          <div className="flex items-center gap-3 mb-1">
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

        {/* Upload zone */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="mb-3">
          <AnimBorderCard speed={5} color={dragging ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.22)"} radius={20}>
            <div
              className="p-6 flex flex-col items-center gap-3 cursor-pointer transition-all"
              style={{ background: dragging ? "rgba(255,255,255,0.03)" : "transparent" }}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <input ref={inputRef} type="file" className="hidden" accept="*/*" multiple
                onChange={e => addFiles(e.target.files)} />

              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <Upload className="w-5 h-5" style={{ color: "rgba(255,255,255,0.4)" }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.6)" }}>
                  {files.length > 0 ? "Thêm file" : "Kéo thả file vào đây"}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.28)" }}>
                  {files.length > 0 ? "hoặc nhấn để chọn thêm" : "hoặc nhấn để chọn — hỗ trợ nhiều file, mọi định dạng"}
                </p>
              </div>
            </div>
          </AnimBorderCard>
        </motion.div>

        {/* Danh sách file */}
        <AnimatePresence>
          {files.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-4 space-y-2">
              {files.map((file, idx) => (
                <motion.div key={file.name + file.size}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(255,255,255,0.06)" }}>
                    <FileText className="w-4 h-4" style={{ color: "rgba(255,255,255,0.5)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "rgba(255,255,255,0.8)" }}>{file.name}</p>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                      {fmtSize(file.size)} · .{getExt(file.name).toUpperCase()}
                    </p>
                  </div>
                  <button onClick={() => removeFile(idx)}
                    className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                    style={{ color: "rgba(255,255,255,0.35)" }}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))}

              {/* Thêm file */}
              <button
                onClick={() => inputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs hover:bg-white/5 transition-colors"
                style={{ border: "1px dashed rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.3)" }}>
                <Plus className="w-3.5 h-3.5" /> Thêm file khác
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Format buttons */}
        <AnimatePresence>
          {files.length > 0 && formats.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}>
              <p className="text-xs font-semibold mb-3 tracking-wide uppercase" style={{ color: "rgba(255,255,255,0.35)" }}>
                {files.length > 1 ? `Chuyển đổi ${files.length} file sang` : "Chuyển đổi sang"}
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {formats.map(fmt => {
                  const isActive = converting === fmt.ext;
                  const isDone = done === fmt.label;
                  return (
                    <motion.button key={fmt.ext}
                      onClick={() => handleConvert(fmt)}
                      disabled={!!converting}
                      whileHover={{ scale: converting ? 1 : 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className="flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold transition-all disabled:opacity-50"
                      style={{
                        background: isDone ? "rgba(34,197,94,0.12)" : isActive ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.06)",
                        border: `1px solid ${isDone ? "rgba(34,197,94,0.3)" : isActive ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)"}`,
                        color: isDone ? "rgba(34,197,94,0.9)" : "rgba(255,255,255,0.85)",
                      }}>
                      {isDone ? <CheckCircle2 className="w-4 h-4" /> : isActive ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      {isDone ? `Xong: ${fmt.label}` : fmt.ext === "unzip" ? "Giải nén & Tải" : fmt.ext === "zip-pack" ? "Đóng gói ZIP" : `Xuất ${fmt.label}`}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="mt-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "rgba(239,68,68,0.8)" }}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
              <button onClick={() => setError("")} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hint */}
        {files.length === 0 && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.3 } }}
            className="mt-6 text-center text-xs"
            style={{ color: "rgba(255,255,255,0.18)" }}>
            Hỗ trợ: TXT, PDF, DOCX, CSV, JSON, XML, HTML, MD, PNG, JPG, WebP, GIF, BMP, SVG, ZIP, code files...
          </motion.p>
        )}
      </div>
    </div>
  );
}
