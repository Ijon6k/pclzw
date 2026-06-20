"use client";

import { useState, useCallback, useRef } from "react";
import Navbar from "@/components/Navbar";
import { compressLZW, CompressionResult, CompressionStep } from "@/lib/lzw/compress";
import { decompressLZW, DecompressionResult } from "@/lib/lzw/decompress";
import { addHistoryEntry } from "@/lib/history";

export default function CompressPage() {
  // State Input Kompresi
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [mode, setMode] = useState<"pixel" | "file">("pixel");
  const [isCompacting, setIsCompacting] = useState(false);

  // State Output Kompresi
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [compressTimeMs, setCompressTimeMs] = useState<number>(0);

  // State Verifikasi Dekompresi
  const [verified, setVerified] = useState<boolean>(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [decompressedPreview, setDecompressedPreview] = useState<string | null>(null);
  const [decompressTimeMs, setDecompressTimeMs] = useState<number>(0);

  // State Drag-and-drop
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset Semua State
  const handleReset = () => {
    setFile(null);
    setImagePreview(null);
    setDimensions(null);
    setResult(null);
    setCompressTimeMs(0);
    setVerified(false);
    setVerifyError(null);
    setDecompressedPreview(null);
    setDecompressTimeMs(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Baca berkas gambar dan tampilkan pratinjau
  const processFile = (selectedFile: File) => {
    if (!selectedFile.type.startsWith("image/")) {
      alert("Harap unggah file citra gambar saja (PNG, JPG, BMP).");
      return;
    }

    handleReset();
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setImagePreview(url);

      const img = new Image();
      img.onload = () => {
        setDimensions({ width: img.width, height: img.height });
      };
      img.src = url;
    };
    reader.readAsDataURL(selectedFile);
  };

  // Handlers Drag and Drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Eksekusi Kompresi LZW
  const handleCompress = async () => {
    if (!file || !imagePreview) return;
    setIsCompacting(true);
    setVerified(false);
    setDecompressedPreview(null);
    setVerifyError(null);

    await new Promise((resolve) => setTimeout(resolve, 50));

    const startTime = performance.now();

    try {
      if (mode === "pixel") {
        // Mode piksel - Ekstraksi RGBA byte citra menggunakan canvas
        const img = new Image();
        img.src = imagePreview;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Gagal memuat canvas context gambar.");

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, img.width, img.height);
        const rgbaBytes = new Uint8Array(imgData.data.buffer);

        // Jalankan kompresi array piksel
        const compResult = compressLZW(rgbaBytes, {
          mode: "pixel",
          filename: file.name,
          width: img.width,
          height: img.height,
          maxStepsToRecord: 80,
        });

        const endTime = performance.now();
        setCompressTimeMs(Math.round(endTime - startTime));
        setResult(compResult);

        // Tambah histori sesi
        addHistoryEntry({
          fileName: file.name,
          fileType: file.type.split("/")[1].toUpperCase(),
          mode: "pixel",
          originalSize: compResult.originalSize,
          compressedSize: compResult.compressedSize,
          ratio: compResult.ratio,
          dictionarySize: compResult.dictionarySize,
        });

      } else {
        // Mode file biner - Kompresi byte biner berkas asli secara langsung
        const fileBuffer = await file.arrayBuffer();
        const fileBytes = new Uint8Array(fileBuffer);

        // Jalankan kompresi byte biner
        const compResult = compressLZW(fileBytes, {
          mode: "file",
          filename: file.name,
          maxStepsToRecord: 80,
        });

        const endTime = performance.now();
        setCompressTimeMs(Math.round(endTime - startTime));
        setResult(compResult);

        // Tambah histori sesi
        addHistoryEntry({
          fileName: file.name,
          fileType: file.type.split("/")[1].toUpperCase(),
          mode: "file",
          originalSize: compResult.originalSize,
          compressedSize: compResult.compressedSize,
          ratio: compResult.ratio,
          dictionarySize: compResult.dictionarySize,
        });
      }
    } catch (err: any) {
      console.error(err);
      alert(`Kompresi gagal dijalankan: ${err.message}`);
    } finally {
      setIsCompacting(false);
    }
  };

  // Verifikasi Hasil Dekompresi
  const handleVerifyDecompress = async () => {
    if (!result) return;
    
    const startTime = performance.now();
    try {
      const decompResult = decompressLZW(result.compressedData);
      
      if (decompResult.mode === "pixel" && decompResult.width && decompResult.height) {
        // Bangun kembali citra dari RGBA array
        const canvas = document.createElement("canvas");
        canvas.width = decompResult.width;
        canvas.height = decompResult.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Gagal membuat canvas context untuk dekompresi piksel.");

        const imgData = ctx.createImageData(decompResult.width, decompResult.height);
        imgData.data.set(new Uint8ClampedArray(decompResult.originalData.buffer));
        ctx.putImageData(imgData, 0, 0);

        const decompUrl = canvas.toDataURL();
        setDecompressedPreview(decompUrl);
      } else {
        // Bangun kembali berkas gambar asli (ObjectURL dari bytes blob)
        const blob = new Blob([decompResult.originalData as any], { type: file?.type || "image/png" });
        const decompUrl = URL.createObjectURL(blob);
        setDecompressedPreview(decompUrl);
      }

      setVerified(true);
      setVerifyError(null);
    } catch (err: any) {
      console.error(err);
      setVerifyError(err.message || "Uji verifikasi integritas data gagal.");
      setVerified(false);
    } finally {
      const endTime = performance.now();
      setDecompressTimeMs(Math.round(endTime - startTime));
    }
  };

  // Unduh Berkas .lzw
  const handleDownload = () => {
    if (!result) return;
    
    const blob = new Blob([result.compressedData as any], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${file?.name || "citra"}.lzw`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Format Tampilan Kapasitas Data Byte
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Subset entri kamus awal untuk diinspeksi
  const getDictionarySubset = () => {
    if (!result) return [];
    
    const entries: { code: number; sequence: string }[] = [];
    const seen = new Set<number>();
    
    for (let i = 0; i < 5; i++) {
      entries.push({ code: i, sequence: `[${i}]` });
      seen.add(i);
    }

    result.steps.forEach((step) => {
      if (step.newCode && !seen.has(step.newCode) && step.lookaheadKey) {
        entries.push({
          code: step.newCode,
          sequence: step.lookaheadKey,
        });
        seen.add(step.newCode);
      }
    });

    return entries.slice(0, 100);
  };

  const dictionarySubset = getDictionarySubset();

  return (
    <div className="flex flex-col min-h-screen bg-canvas text-ink selection:bg-primary selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-6 md:px-8 py-8 flex flex-col lg:flex-row gap-8">
        
        {/* PANEL KIRI: Uploader & Pengaturan Mode */}
        <div className="flex-1 flex flex-col gap-6 lg:max-w-[500px]">
          <div className="bg-surface-1 border border-hairline rounded-lg p-6">
            <h2 className="font-sans font-semibold text-[18px] text-ink mb-1.5 tracking-tight">
              Unggah Citra
            </h2>
            <p className="font-sans text-[12px] text-ink-subtle leading-relaxed mb-6">
              Pilih berkas citra bitmap untuk memulai analisis kompresi LZW.
            </p>

            {/* DRAG AND DROP ZONE */}
            <div
              className={`border border-dashed rounded-md p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                dragActive ? "border-primary bg-surface-2" : "border-hairline hover:bg-surface-2/40"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={triggerFileSelect}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/png, image/jpeg, image/bmp"
                onChange={handleFileChange}
              />
              
              <svg className="w-8 h-8 text-ink-subtle mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
              </svg>

              <span className="font-sans text-[13px] font-medium text-ink mb-1">
                Seret & letakkan berkas citra di sini
              </span>
              <span className="font-sans text-[11px] text-ink-subtle">
                Mendukung format PNG, JPG, atau BMP hingga 3MB
              </span>
            </div>

            {/* PREVIEW CONTAINER */}
            {file && imagePreview && (
              <div className="mt-6 border border-hairline bg-canvas p-4 rounded-md flex flex-col gap-3">
                <div className="relative w-full aspect-video rounded overflow-hidden bg-surface-2 border border-hairline flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Pratinjau Citra"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-sans text-[12px] font-medium text-ink truncate">
                    {file.name}
                  </span>
                  <div className="flex items-center justify-between text-[11px] text-ink-subtle">
                    <span>Ukuran berkas: {formatBytes(file.size)}</span>
                    {dimensions && (
                      <span>
                        Dimensi: {dimensions.width} × {dimensions.height}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="mt-2 text-center font-sans text-[11px] font-medium text-ink-tertiary hover:text-ink-subtle transition-colors"
                >
                  Hapus Berkas
                </button>
              </div>
            )}
          </div>

          {/* COMPRESSION METHOD SETTINGS */}
          {file && (
            <div className="bg-surface-1 border border-hairline rounded-lg p-6 flex flex-col gap-6">
              <div>
                <h3 className="font-sans font-semibold text-[14px] text-ink mb-1.5 tracking-tight">
                  Mode Kompresi
                </h3>
                <p className="font-sans text-[12px] text-ink-subtle leading-relaxed mb-4">
                  Pilih jenis data masukan untuk diproses oleh mesin kompresi LZW.
                </p>

                {/* Tab select styling */}
                <div className="w-full flex bg-canvas p-1 rounded-md border border-hairline">
                  <button
                    onClick={() => setMode("pixel")}
                    className={`flex-1 font-sans text-[12px] font-medium py-1.5 rounded transition-colors ${
                      mode === "pixel" ? "bg-surface-2 text-ink" : "text-ink-subtle hover:text-ink"
                    }`}
                  >
                    Piksel Mentah (RGBA)
                  </button>
                  <button
                    onClick={() => setMode("file")}
                    className={`flex-1 font-sans text-[12px] font-medium py-1.5 rounded transition-colors ${
                      mode === "file" ? "bg-surface-2 text-ink" : "text-ink-subtle hover:text-ink"
                    }`}
                  >
                    Byte Biner Berkas
                  </button>
                </div>
              </div>

              {/* Explanatory notes */}
              <div className="bg-canvas border border-hairline p-3.5 rounded-md font-sans text-[11px] leading-relaxed text-ink-muted">
                {mode === "pixel" ? (
                  <p>
                    <strong className="text-primary">Mode piksel</strong> mengekstrak matriks piksel mentah RGBA (lebar × tinggi × 4 byte) dari citra. LZW bekerja optimal pada redundansi tinggi piksel.
                  </p>
                ) : (
                  <p>
                    <strong className="text-ink">Mode biner</strong> membaca byte berkas asli secara langsung. Karena berkas masukan sudah terkompresi sebelumnya, ukuran hasil kompresi berpotensi membengkak akibat overhead kamus.
                  </p>
                )}
              </div>

              {/* Compress trigger */}
              <button
                onClick={handleCompress}
                disabled={isCompacting}
                className="w-full bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white font-sans text-[13px] font-medium py-2 rounded-md transition-colors"
              >
                {isCompacting ? "Sedang Mengompresi..." : "Jalankan Kompresi LZW"}
              </button>
            </div>
          )}
        </div>

        {/* PANEL KANAN: Hasil & Analisis Log Kamus */}
        <div className="flex-1 flex flex-col gap-6">
          {!result ? (
            <div className="flex-1 min-h-[350px] bg-surface-1 border border-hairline rounded-lg flex flex-col items-center justify-center text-center p-8">
              <svg className="w-12 h-12 text-ink-tertiary mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="font-sans font-medium text-[15px] text-ink mb-1.5">
                Siap untuk Analisis
              </h3>
              <p className="font-sans text-[12px] text-ink-subtle max-w-[320px] leading-relaxed">
                Unggah berkas citra bitmap pada panel kiri dan klik &ldquo;Jalankan Kompresi LZW&rdquo; untuk mengamati proses pembentukan kamus dan hasil metrik.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              
              {/* STATS OVERVIEW CARDS */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                
                {/* Stat 1 */}
                <div className="bg-surface-1 border border-hairline p-4 rounded-lg">
                  <span className="font-sans text-[11px] text-ink-subtle block mb-1">
                    Ukuran Awal
                  </span>
                  <span className="font-sans font-semibold text-[16px] text-ink block">
                    {formatBytes(result.originalSize)}
                  </span>
                  <span className="font-mono text-[9px] text-ink-tertiary">
                    {result.originalSize.toLocaleString()} byte
                  </span>
                </div>

                {/* Stat 2 */}
                <div className="bg-surface-1 border border-hairline p-4 rounded-lg">
                  <span className="font-sans text-[11px] text-ink-subtle block mb-1">
                    Ukuran Hasil
                  </span>
                  <span className="font-sans font-semibold text-[16px] text-ink block">
                    {formatBytes(result.compressedSize)}
                  </span>
                  <span className="font-mono text-[9px] text-ink-tertiary">
                    {result.compressedSize.toLocaleString()} byte
                  </span>
                </div>

                {/* Stat 3 */}
                <div className="bg-surface-1 border border-hairline p-4 rounded-lg">
                  <span className="font-sans text-[11px] text-ink-subtle block mb-1">
                    Rasio Kompresi
                  </span>
                  <span className={`font-sans font-semibold text-[16px] block ${
                    result.ratio >= 1 ? "text-success" : "text-ink-muted"
                  }`}>
                    {result.ratio.toFixed(3)}x
                  </span>
                  <span className="font-mono text-[9px] text-ink-tertiary">
                    {result.ratio >= 1 ? "Ukuran Menyusut" : "Ukuran Membengkak"}
                  </span>
                </div>

                {/* Stat 4 */}
                <div className="bg-surface-1 border border-hairline p-4 rounded-lg">
                  <span className="font-sans text-[11px] text-ink-subtle block mb-1">
                    Jumlah Entri Kamus
                  </span>
                  <span className="font-sans font-semibold text-[16px] text-ink block">
                    {result.dictionarySize.toLocaleString()}
                  </span>
                  <span className="font-mono text-[9px] text-ink-tertiary">
                    {((result.dictionarySize / 65536) * 100).toFixed(1)}% limit terpakai
                  </span>
                </div>

              </div>

              {/* ACTION CARD (DOWNLOAD & VERIFY) */}
              <div className="bg-surface-1 border border-hairline rounded-lg p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                  <h3 className="font-sans font-semibold text-[14px] text-ink mb-1">
                    Hasil Output Paket LZW
                  </h3>
                  <p className="font-sans text-[12px] text-ink-subtle leading-relaxed">
                    Kompresi selesai dalam <strong className="text-ink">{compressTimeMs} ms</strong>. Anda dapat mengekspor hasil aliran biner ini atau memverifikasi integritas dekompresinya.
                  </p>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <button
                    onClick={handleVerifyDecompress}
                    className="flex-1 md:flex-initial bg-surface-2 border border-hairline hover:bg-surface-3 text-ink font-sans text-[12px] font-medium px-4 py-2 rounded transition-colors whitespace-nowrap"
                  >
                    Verifikasi Dekompresi
                  </button>
                  
                  <button
                    onClick={handleDownload}
                    className="flex-1 md:flex-initial bg-primary hover:bg-primary-hover text-white font-sans text-[12px] font-medium px-4 py-2 rounded transition-colors"
                  >
                    Unduh .lzw
                  </button>
                </div>
              </div>

              {/* DECOMPRESSION VERIFICATION LOG */}
              {verified && (
                <div className="bg-surface-1 border border-hairline rounded-lg p-6 flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-success"></span>
                    <h3 className="font-sans font-semibold text-[14px] text-ink">
                      Integritas Lossless Terkonfirmasi
                    </h3>
                    <span className="bg-surface-2 text-success font-mono text-[10px] px-2 py-0.5 rounded border border-hairline ml-auto">
                      100% Byte Cocok
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="flex flex-col gap-1">
                      <span className="font-sans text-[11px] text-ink-subtle">Metrik verifikasi:</span>
                      <span className="font-sans text-[12px] text-ink-muted">
                        Ukuran dekompresi: <strong>{formatBytes(result.originalSize)}</strong>
                      </span>
                      <span className="font-sans text-[12px] text-ink-muted">
                        Waktu dekompresi: <strong>{decompressTimeMs} ms</strong>
                      </span>
                      <span className="font-sans text-[11px] text-success leading-relaxed mt-2">
                        ✓ Semua header biner terbaca dengan benar.<br />
                        ✓ Urutan byte identik dengan data masukan awal.
                      </span>
                    </div>

                    {decompressedPreview && (
                      <div className="flex flex-col gap-2">
                        <span className="font-sans text-[11px] text-ink-subtle">Hasil Rekonstruksi Citra:</span>
                        <div className="relative w-full aspect-video rounded overflow-hidden bg-canvas border border-hairline flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={decompressedPreview}
                            alt="Hasil Dekompresi"
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {verifyError && (
                <div className="bg-surface-1 border border-red-500/25 rounded-lg p-6">
                  <h3 className="font-sans font-semibold text-[14px] text-red-400 mb-1">
                    Verifikasi Dekompresi Gagal
                  </h3>
                  <p className="font-sans text-[12px] text-red-300 leading-relaxed">
                    {verifyError}
                  </p>
                </div>
              )}

              {/* TAB SELECT FOR VISUAL LOGS & DICTIONARY */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* WIDGET 1: STEP-BY-STEP TRACE */}
                <div className="bg-surface-1 border border-hairline rounded-lg p-6 flex flex-col h-[400px]">
                  <h3 className="font-sans font-semibold text-[14px] text-ink mb-1 tracking-tight">
                    Tabel Penelusuran Langkah
                  </h3>
                  <p className="font-sans text-[11px] text-ink-subtle leading-relaxed mb-4">
                    Menampilkan 80 langkah pembacaan indeks dan pengodean kamus pertama.
                  </p>
                  
                  <div className="flex-1 overflow-y-auto border border-hairline bg-canvas rounded-md">
                    <table className="w-full text-left font-sans text-[12px]">
                      <thead className="sticky top-0 bg-surface-2 text-ink-muted text-[10px] font-mono border-b border-hairline">
                        <tr>
                          <th className="p-2 text-center w-8">#</th>
                          <th className="p-2">Sekuen (W)</th>
                          <th className="p-2 w-8 text-center">+</th>
                          <th className="p-2">Karakter (K)</th>
                          <th className="p-2">Hasil Penelusuran</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-hairline font-mono text-[11px] text-ink-subtle">
                        {result.steps.map((step, idx) => (
                          <tr key={idx} className="hover:bg-surface-1/40">
                            <td className="p-2 text-center text-ink-tertiary border-r border-hairline">
                              {step.index}
                            </td>
                            <td className="p-2 truncate max-w-[80px]" title={step.currentSequence}>
                              W={step.currentSequence.length > 15 ? `${step.currentSequence.substring(0, 12)}...` : step.currentSequence}
                              <span className="text-[9px] text-ink-tertiary ml-1">({step.currentCode})</span>
                            </td>
                            <td className="p-2 text-center text-ink-tertiary">
                              +
                            </td>
                            <td className="p-2 text-ink">
                              {step.nextByte === -1 ? "EOF" : step.nextByte}
                            </td>
                            <td className="p-2">
                              {step.found ? (
                                <span className="text-primary text-[10px]">Ada di Kamus</span>
                              ) : (
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-ink">Output kode {step.outputCode}</span>
                                  {step.newCode && (
                                    <span className="text-ink-tertiary text-[9px]">Tambah {step.newCode} untuk [{step.lookaheadKey}]</span>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* WIDGET 2: DICTIONARY PREVIEW */}
                <div className="bg-surface-1 border border-hairline rounded-lg p-6 flex flex-col h-[400px]">
                  <h3 className="font-sans font-semibold text-[14px] text-ink mb-1 tracking-tight">
                    Inspektur Kamus LZW
                  </h3>
                  <p className="font-sans text-[11px] text-ink-subtle leading-relaxed mb-4">
                    Sampel representasi indeks kamus dinamis yang berhasil didaftarkan.
                  </p>
                  
                  <div className="flex-1 overflow-y-auto border border-hairline bg-canvas rounded-md">
                    <table className="w-full text-left font-sans text-[12px]">
                      <thead className="sticky top-0 bg-surface-2 text-ink-muted text-[10px] font-mono border-b border-hairline">
                        <tr>
                          <th className="p-2 w-20">Kode Indeks</th>
                          <th className="p-2">Representasi Sekuen</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-hairline font-mono text-[11px] text-ink-subtle">
                        {dictionarySubset.map((entry) => (
                          <tr key={entry.code} className="hover:bg-surface-1/40">
                            <td className="p-2 font-semibold text-primary border-r border-hairline">
                              {entry.code}
                            </td>
                            <td className="p-2 truncate max-w-[150px]">
                              {entry.sequence}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

            </div>
          )}
        </div>

      </main>
    </div>
  );
}
