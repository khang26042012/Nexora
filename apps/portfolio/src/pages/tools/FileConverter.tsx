import { Navigation } from "@/components/navigation";
import { ToolVideoBg } from "@/components/ToolVideoBg";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Upload, Download, ArrowLeftRight,
  X, Loader2, AlertTriangle, FileText, CheckCircle2,
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

/* ── Danh sách format output theo ext ── */
type OutFmt = { label: string; ext: string };

function getOutputFormats(ext: string): OutFmt[] {
  const text: OutFmt[] = [
    { label: "PDF", ext: "pdf" },
    { label: "DOCX", ext: "docx" },
    { label: "TXT", ext: "txt" },
  ];
  const map: Record<string, OutFmt[]> = {
    txt:      [{ label: "PDF", ext: "pdf" }, { label: "DOCX", ext: "docx" }],
    md:       [{ label: "TXT", ext: "txt" }, { label: "PDF", ext: "pdf" }],
    markdown: [{ label: "TXT", ext: "txt" }, { label: "PDF", ext: "pdf" }],
    pdf:      [{ label: "TXT", ext: "txt" }],
    csv:      [{ label: "JSON", ext: "json" }, { label: "TXT", ext: "txt" }],
    json:     [{ label: "CSV", ext: "csv" }, { label: "TXT", ext: "txt" }],
    xml:      [{ label: "TXT", ext: "txt" }, { label: "JSON", ext: "json" }],
    html:     [{ label: "TXT", ext: "txt" }],
    htm:      [{ label: "TXT", ext: "txt" }],
    png:      [{ label: "PDF", ext: "pdf" }, { label: "JPG", ext: "jpg" }, { label: "WEBP", ext: "webp" }],
    jpg:      [{ label: "PDF", ext: "pdf" }, { label: "PNG", ext: "png" }, { label: "WEBP", ext: "webp" }],
    jpeg:     [{ label: "PDF", ext: "pdf" }, { label: "PNG", ext: "png" }, { label: "WEBP", ext: "webp" }],
    webp:     [{ label: "PDF", ext: "pdf" }, { label: "PNG", ext: "png" }, { label: "JPG", ext: "jpg" }],
    gif:      [{ label: "PDF", ext: "pdf" }, { label: "PNG", ext: "png" }],
    bmp:      [{ label: "PDF", ext: "pdf" }, { label: "PNG", ext: "png" }, { label: "JPG", ext: "jpg" }],
    svg:      [{ label: "PNG", ext: "png" }, { label: "PDF", ext: "pdf" }],
    zip:      [{ label: "Giải nén & Tải", ext: "unzip" }],
    js:       text, ts: text, py: text, java: text, cpp: text, c: text,
    css: text, scss: text, yaml: text, yml: text, toml: text, ini: text,
    log: text, rtf: text,
  };
  return map[ext] ?? [{ label: "TXT", ext: "txt" }];
}

/* ── Core converter ── */
async function doConvert(file: File, outExt: string): Promise<void> {
  const ext = getExt(file.name);
  const name = baseName(file.name);

  /* ── Ảnh → ảnh khác ── */
  if (["png","jpg","jpeg","webp","gif","bmp"].includes(ext) && ["png","jpg","webp"].includes(outExt)) {
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

  /* ── Ảnh / SVG → PDF ── */
  if ((["png","jpg","jpeg","webp","gif","bmp","svg"].includes(ext) || file.type.startsWith("image/")) && outExt === "pdf") {
    const { jsPDF } = await import("jspdf");
    const dataUrl = await new Promise<string>(res => { const r = new FileReader(); r.onload = e => res(e.target!.result as string); r.readAsDataURL(file); });
    const img = await new Promise<HTMLImageElement>(res => { const i = new Image(); i.onload = () => res(i); i.src = dataUrl; });
    const pw = 210, ph = 297;
    const scale = Math.min(pw / img.naturalWidth, ph / img.naturalHeight);
    const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const imgFmt = ["jpg","jpeg"].includes(ext) ? "JPEG" : "PNG";
    doc.addImage(dataUrl, imgFmt, (pw - w) / 2, (ph - h) / 2, w, h);
    doc.save(`${name}.pdf`);
    return;
  }

  /* ── PDF → TXT ── */
  if (ext === "pdf" && outExt === "txt") {
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
    downloadBlob(new Blob([result], { type: "text/plain" }), `${name}.txt`);
    return;
  }

  /* ── TXT / code / text → PDF ── */
  if (outExt === "pdf") {
    const text = await file.text();
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

  /* ── TXT / code → DOCX ── */
  if (outExt === "docx") {
    const text = await file.text();
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

  /* ── XML → JSON ── */
  if (ext === "xml" && outExt === "json") {
    const text = await file.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "text/xml");
    function xmlToObj(node: Element): unknown {
      if (node.children.length === 0) return node.textContent?.trim() ?? "";
      const obj: Record<string, unknown> = {};
      for (const child of Array.from(node.children)) {
        const key = child.tagName;
        const val = xmlToObj(child);
        if (obj[key]) { obj[key] = Array.isArray(obj[key]) ? [...(obj[key] as unknown[]), val] : [obj[key], val]; }
        else obj[key] = val;
      }
      return obj;
    }
    const json = JSON.stringify(xmlToObj(xmlDoc.documentElement), null, 2);
    downloadBlob(new Blob([json], { type: "application/json" }), `${name}.json`);
    return;
  }

  /* ── HTML/HTM → TXT ── */
  if (["html","htm"].includes(ext) && outExt === "txt") {
    const text = await file.text();
    const doc2 = new DOMParser().parseFromString(text, "text/html");
    downloadBlob(new Blob([doc2.body.innerText || doc2.body.textContent || ""], { type: "text/plain" }), `${name}.txt`);
    return;
  }

  /* ── ZIP → giải nén ── */
  if (ext === "zip" && outExt === "unzip") {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(file);
    const names = Object.keys(zip.files);
    if (names.length === 1) {
      const f = zip.files[names[0]];
      const blob = await f.async("blob");
      downloadBlob(blob, names[0].split("/").pop() ?? names[0]);
    } else {
      for (const fname of names) {
        const f = zip.files[fname];
        if (f.dir) continue;
        const blob = await f.async("blob");
        downloadBlob(blob, fname.split("/").pop() ?? fname);
        await new Promise(r => setTimeout(r, 200));
      }
    }
    return;
  }

  /* ── Fallback: đọc file text ── */
  const text = await file.text();
  downloadBlob(new Blob([text], { type: "text/plain" }), `${name}.txt`);
}

/* ── Component ── */
export function FileConverter() {
  const [, navigate] = useLocation();
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [converting, setConverting] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addFile = useCallback((f: File | null | undefined) => {
    if (!f) return;
    setFile(f); setError(""); setDone(null);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    addFile(e.dataTransfer.files[0]);
  };

  const handleConvert = async (fmt: OutFmt) => {
    if (!file || converting) return;
    setConverting(fmt.ext); setError(""); setDone(null);
    try {
      await doConvert(file, fmt.ext);
      setDone(fmt.label);
      setTimeout(() => setDone(null), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi chuyển đổi.");
    } finally {
      setConverting(null);
    }
  };

  const ext = file ? getExt(file.name) : "";
  const formats = file ? getOutputFormats(ext) : [];

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

        {/* Bước 1: Upload */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.5 }} className="mb-4">
          <AnimBorderCard speed={5} color={dragging ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.25)"} radius={20}>
            <div
              className="p-8 flex flex-col items-center gap-4 cursor-pointer transition-all"
              style={{ background: dragging ? "rgba(255,255,255,0.03)" : "transparent" }}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <input ref={inputRef} type="file" className="hidden" accept="*/*" onChange={e => addFile(e.target.files?.[0])} />

              <AnimatePresence mode="wait">
                {!file ? (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                      <Upload className="w-7 h-7" style={{ color: "rgba(255,255,255,0.35)" }} />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>Kéo thả file vào đây</p>
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>hoặc nhấn để chọn — hỗ trợ mọi loại file</p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="file" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-4 w-full" onClick={e => e.stopPropagation()}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
                      <FileText className="w-5 h-5" style={{ color: "rgba(255,255,255,0.6)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "rgba(255,255,255,0.85)" }}>{file.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                        {fmtSize(file.size)} · .{ext.toUpperCase()}
                      </p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); setFile(null); setError(""); setDone(null); }}
                      className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                      style={{ color: "rgba(255,255,255,0.4)" }}>
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </AnimBorderCard>
        </motion.div>

        {/* Bước 2: Chọn format → convert */}
        <AnimatePresence>
          {file && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
              <p className="text-xs font-semibold mb-3 tracking-wide uppercase" style={{ color: "rgba(255,255,255,0.35)" }}>
                Chuyển đổi sang
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {formats.map(fmt => {
                  const isActive = converting === fmt.ext;
                  const isDone = done === fmt.label;
                  return (
                    <motion.button
                      key={fmt.ext}
                      onClick={() => handleConvert(fmt)}
                      disabled={!!converting}
                      whileHover={{ scale: converting ? 1 : 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className="flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-sm font-bold transition-all disabled:opacity-50"
                      style={{
                        background: isDone ? "rgba(34,197,94,0.12)" : isActive ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.06)",
                        border: `1px solid ${isDone ? "rgba(34,197,94,0.3)" : isActive ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)"}`,
                        color: isDone ? "rgba(34,197,94,0.9)" : "rgba(255,255,255,0.85)",
                      }}>
                      {isDone ? <CheckCircle2 className="w-4 h-4" /> : isActive ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      {isDone ? `Đã tải ${fmt.label}` : fmt.ext === "unzip" ? "Giải nén & Tải về" : `Xuất ${fmt.label}`}
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

        {/* Hint khi chưa upload */}
        {!file && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.3 } }}
            className="mt-6 text-center">
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
              Hỗ trợ: TXT, PDF, DOCX, CSV, JSON, XML, HTML, MD, PNG, JPG, WebP, GIF, BMP, SVG, ZIP và nhiều loại khác
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
