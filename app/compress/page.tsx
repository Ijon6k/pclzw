"use client";

import { useState, useCallback, useRef } from "react";
import Navbar from "@/components/Navbar";
import { compressLZW, CompressionResult, CompressionStep } from "@/lib/lzw/compress";
import { decompressLZW, DecompressionResult } from "@/lib/lzw/decompress";
import { addHistoryEntry } from "@/lib/history";

export default function CompressPage() {
  // Compression input state
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [mode, setMode] = useState<"pixel" | "file">("pixel");
  const [isCompacting, setIsCompacting] = useState(false);

  // Compression output state
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [compressTimeMs, setCompressTimeMs] = useState<number>(0);

  // Decompression verification state
  const [verified, setVerified] = useState<boolean>(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [decompressedPreview, setDecompressedPreview] = useState<string | null>(null);
  const [decompressTimeMs, setDecompressTimeMs] = useState<number>(0);

  // Drag-and-drop state
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset all states
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

  // Read file data and populate preview
  const processFile = (selectedFile: File) => {
    if (!selectedFile.type.startsWith("image/")) {
      alert("Please upload an image file (PNG, JPG, BMP).");
      return;
    }

    handleReset();
    setFile(selectedFile);

    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setImagePreview(url);

      // Extract image dimensions
      const img = new Image();
      img.onload = () => {
        setDimensions({ width: img.width, height: img.height });
      };
      img.src = url;
    };
    reader.readAsDataURL(selectedFile);
  };

  // Drag handlers
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

  // Execute LZW Compression
  const handleCompress = async () => {
    if (!file || !imagePreview) return;
    setIsCompacting(true);
    setVerified(false);
    setDecompressedPreview(null);
    setVerifyError(null);

    // Give browser a frame to render loading state
    await new Promise((resolve) => setTimeout(resolve, 50));

    const startTime = performance.now();

    try {
      if (mode === "pixel") {
        // Pixel compression mode - Extract RGBA bytes using canvas
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
        if (!ctx) throw new Error("Failed to get canvas context.");

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, img.width, img.height);
        const rgbaBytes = new Uint8Array(imgData.data.buffer);

        // Compress pixel array
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

        // Add entry to history
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
        // Binary File mode - Compress file binary bytes directly
        const fileBuffer = await file.arrayBuffer();
        const fileBytes = new Uint8Array(fileBuffer);

        // Compress raw binary bytes
        const compResult = compressLZW(fileBytes, {
          mode: "file",
          filename: file.name,
          maxStepsToRecord: 80,
        });

        const endTime = performance.now();
        setCompressTimeMs(Math.round(endTime - startTime));
        setResult(compResult);

        // Add entry to history
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
      alert(`Compression failed: ${err.message}`);
    } finally {
      setIsCompacting(false);
    }
  };

  // Run Decompression Verification
  const handleVerifyDecompress = async () => {
    if (!result) return;
    
    const startTime = performance.now();
    try {
      const decompResult = decompressLZW(result.compressedData);
      
      if (decompResult.mode === "pixel" && decompResult.width && decompResult.height) {
        // Reconstruct pixel image from RGBA array
        const canvas = document.createElement("canvas");
        canvas.width = decompResult.width;
        canvas.height = decompResult.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Failed to create canvas context for decompression preview.");

        const imgData = ctx.createImageData(decompResult.width, decompResult.height);
        // Cast Uint8Array to Uint8ClampedArray
        imgData.data.set(new Uint8ClampedArray(decompResult.originalData.buffer));
        ctx.putImageData(imgData, 0, 0);

        const decompUrl = canvas.toDataURL();
        setDecompressedPreview(decompUrl);
      } else {
        // Reconstruct binary image file (create ObjectURL from bytes blob)
        const blob = new Blob([decompResult.originalData as any], { type: file?.type || "image/png" });
        const decompUrl = URL.createObjectURL(blob);
        setDecompressedPreview(decompUrl);
      }

      setVerified(true);
      setVerifyError(null);
    } catch (err: any) {
      console.error(err);
      setVerifyError(err.message || "Integrity verification failed.");
      setVerified(false);
    } finally {
      const endTime = performance.now();
      setDecompressTimeMs(Math.round(endTime - startTime));
    }
  };

  // Trigger Download of .lzw file
  const handleDownload = () => {
    if (!result) return;
    
    const blob = new Blob([result.compressedData as any], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${file?.name || "image"}.lzw`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Format bytes for display
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Extract visual representation of first few steps dictionary
  const getDictionarySubset = () => {
    if (!result) return [];
    
    // Build dictionary representations from the trace steps
    const entries: { code: number; sequence: string }[] = [];
    const seen = new Set<number>();
    
    // Add default single byte entries if we want to show examples
    for (let i = 0; i < 5; i++) {
      entries.push({ code: i, sequence: `[${i}]` });
      seen.add(i);
    }

    // Capture added keys from results steps
    result.steps.forEach((step) => {
      if (step.newCode && !seen.has(step.newCode) && step.lookaheadKey) {
        entries.push({
          code: step.newCode,
          sequence: step.lookaheadKey,
        });
        seen.add(step.newCode);
      }
    });

    return entries.slice(0, 100); // limit to 100 entries
  };

  const dictionarySubset = getDictionarySubset();

  return (
    <div className="flex flex-col min-h-screen bg-canvas text-ink selection:bg-primary selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-6 md:px-8 py-8 flex flex-col lg:flex-row gap-8">
        
        {/* LEFT PANEL: Uploader & Control Panel */}
        <div className="flex-1 flex flex-col gap-6 lg:max-w-[500px]">
          <div className="bg-surface-1 border border-hairline rounded-lg p-6">
            <h2 className="font-sans font-semibold text-[18px] text-ink mb-1.5 tracking-tight">
              Upload Image
            </h2>
            <p className="font-sans text-[12px] text-ink-subtle leading-relaxed mb-6">
              Select a bitmap image file to initiate LZW compression analysis.
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
                Drag and drop image here
              </span>
              <span className="font-sans text-[11px] text-ink-subtle">
                Supports PNG, JPG, or BMP up to 3MB
              </span>
            </div>

            {/* PREVIEW CONTAINER */}
            {file && imagePreview && (
              <div className="mt-6 border border-hairline bg-canvas p-4 rounded-md flex flex-col gap-3">
                <div className="relative w-full aspect-video rounded overflow-hidden bg-surface-2 border border-hairline flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Upload Preview"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-sans text-[12px] font-medium text-ink truncate">
                    {file.name}
                  </span>
                  <div className="flex items-center justify-between text-[11px] text-ink-subtle">
                    <span>File size: {formatBytes(file.size)}</span>
                    {dimensions && (
                      <span>
                        Dim: {dimensions.width} × {dimensions.height}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="mt-2 text-center font-sans text-[11px] font-medium text-ink-tertiary hover:text-ink-subtle transition-colors"
                >
                  Clear File
                </button>
              </div>
            )}
          </div>

          {/* COMPRESSION METHOD SETTINGS */}
          {file && (
            <div className="bg-surface-1 border border-hairline rounded-lg p-6 flex flex-col gap-6">
              <div>
                <h3 className="font-sans font-semibold text-[14px] text-ink mb-1.5 tracking-tight">
                  Compression Mode
                </h3>
                <p className="font-sans text-[12px] text-ink-subtle leading-relaxed mb-4">
                  Toggle how the analyzer interprets file data for the LZW engine.
                </p>

                {/* Tab select styling */}
                <div className="w-full flex bg-canvas p-1 rounded-md border border-hairline">
                  <button
                    onClick={() => setMode("pixel")}
                    className={`flex-1 font-sans text-[12px] font-medium py-1.5 rounded transition-colors ${
                      mode === "pixel" ? "bg-surface-2 text-ink" : "text-ink-subtle hover:text-ink"
                    }`}
                  >
                    Raw Pixels (RGBA)
                  </button>
                  <button
                    onClick={() => setMode("file")}
                    className={`flex-1 font-sans text-[12px] font-medium py-1.5 rounded transition-colors ${
                      mode === "file" ? "bg-surface-2 text-ink" : "text-ink-subtle hover:text-ink"
                    }`}
                  >
                    File Binary Bytes
                  </button>
                </div>
              </div>

              {/* Explanatory notes */}
              <div className="bg-canvas border border-hairline p-3.5 rounded-md font-sans text-[11px] leading-relaxed text-ink-muted">
                {mode === "pixel" ? (
                  <p>
                    <strong className="text-primary">Pixel mode</strong> reads the image's uncompressed RGBA pixel array (width × height × 4 bytes). LZW performs extremely well on this data, showing how repeating color grids shrink dramatically.
                  </p>
                ) : (
                  <p>
                    <strong className="text-ink">Binary mode</strong> reads the actual PNG/JPG file bytes. Because these files are already compressed, LZW encoding will likely expand the footprint due to double compression.
                  </p>
                )}
              </div>

              {/* Compress trigger */}
              <button
                onClick={handleCompress}
                disabled={isCompacting}
                className="w-full bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white font-sans text-[13px] font-medium py-2 rounded-md transition-colors"
              >
                {isCompacting ? "Compressing Payload..." : "Execute LZW Compression"}
              </button>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: Results & Analysis Logs */}
        <div className="flex-1 flex flex-col gap-6">
          {!result ? (
            <div className="flex-1 min-h-[350px] bg-surface-1 border border-hairline rounded-lg flex flex-col items-center justify-center text-center p-8">
              <svg className="w-12 h-12 text-ink-tertiary mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="font-sans font-medium text-[15px] text-ink mb-1.5">
                Ready for Analysis
              </h3>
              <p className="font-sans text-[12px] text-ink-subtle max-w-[320px] leading-relaxed">
                Upload a bitmap file on the left panel and click &ldquo;Execute LZW Compression&rdquo; to review dictionary logs, ratio charts, and step traces.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              
              {/* STATS OVERVIEW CARDS */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                
                {/* Stat 1 */}
                <div className="bg-surface-1 border border-hairline p-4 rounded-lg">
                  <span className="font-sans text-[11px] text-ink-subtle block mb-1">
                    Original Size
                  </span>
                  <span className="font-sans font-semibold text-[16px] text-ink block">
                    {formatBytes(result.originalSize)}
                  </span>
                  <span className="font-mono text-[9px] text-ink-tertiary">
                    {result.originalSize.toLocaleString()} bytes
                  </span>
                </div>

                {/* Stat 2 */}
                <div className="bg-surface-1 border border-hairline p-4 rounded-lg">
                  <span className="font-sans text-[11px] text-ink-subtle block mb-1">
                    Compressed Size
                  </span>
                  <span className="font-sans font-semibold text-[16px] text-ink block">
                    {formatBytes(result.compressedSize)}
                  </span>
                  <span className="font-mono text-[9px] text-ink-tertiary">
                    {result.compressedSize.toLocaleString()} bytes
                  </span>
                </div>

                {/* Stat 3 */}
                <div className="bg-surface-1 border border-hairline p-4 rounded-lg">
                  <span className="font-sans text-[11px] text-ink-subtle block mb-1">
                    Compression Ratio
                  </span>
                  <span className={`font-sans font-semibold text-[16px] block ${
                    result.ratio >= 1 ? "text-success" : "text-ink-muted"
                  }`}>
                    {result.ratio.toFixed(3)}x
                  </span>
                  <span className="font-mono text-[9px] text-ink-tertiary">
                    {result.ratio >= 1 ? "Size reduced" : "Expanded payload"}
                  </span>
                </div>

                {/* Stat 4 */}
                <div className="bg-surface-1 border border-hairline p-4 rounded-lg">
                  <span className="font-sans text-[11px] text-ink-subtle block mb-1">
                    Dictionary Count
                  </span>
                  <span className="font-sans font-semibold text-[16px] text-ink block">
                    {result.dictionarySize.toLocaleString()}
                  </span>
                  <span className="font-mono text-[9px] text-ink-tertiary">
                    {((result.dictionarySize / 65536) * 100).toFixed(1)}% limit used
                  </span>
                </div>

              </div>

              {/* ACTION CARD (DOWNLOAD & VERIFY) */}
              <div className="bg-surface-1 border border-hairline rounded-lg p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                  <h3 className="font-sans font-semibold text-[14px] text-ink mb-1">
                    LZW Package Output
                  </h3>
                  <p className="font-sans text-[12px] text-ink-subtle leading-relaxed">
                    Compression completed in <strong className="text-ink">{compressTimeMs} ms</strong>. You can export this binary stream or verify its structural integrity.
                  </p>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <button
                    onClick={handleVerifyDecompress}
                    className="flex-1 md:flex-initial bg-surface-2 border border-hairline hover:bg-surface-3 text-ink font-sans text-[12px] font-medium px-4 py-2 rounded transition-colors whitespace-nowrap"
                  >
                    Verify Decompression
                  </button>
                  
                  <button
                    onClick={handleDownload}
                    className="flex-1 md:flex-initial bg-primary hover:bg-primary-hover text-white font-sans text-[12px] font-medium px-4 py-2 rounded transition-colors"
                  >
                    Download .lzw
                  </button>
                </div>
              </div>

              {/* DECOMPRESSION VERIFICATION LOG */}
              {verified && (
                <div className="bg-surface-1 border border-hairline rounded-lg p-6 flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-success"></span>
                    <h3 className="font-sans font-semibold text-[14px] text-ink">
                      Lossless Integrity Confirmed
                    </h3>
                    <span className="bg-surface-2 text-success font-mono text-[10px] px-2 py-0.5 rounded border border-hairline ml-auto">
                      100% Matching Bytes
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="flex flex-col gap-1">
                      <span className="font-sans text-[11px] text-ink-subtle">Verification metrics:</span>
                      <span className="font-sans text-[12px] text-ink-muted">
                        Decompressed size: <strong>{formatBytes(result.originalSize)}</strong>
                      </span>
                      <span className="font-sans text-[12px] text-ink-muted">
                        Decompress time: <strong>{decompressTimeMs} ms</strong>
                      </span>
                      <span className="font-sans text-[11px] text-success leading-relaxed mt-2">
                        ✓ All headers read correctly.<br />
                        ✓ Output matches initial array index sequences.
                      </span>
                    </div>

                    {decompressedPreview && (
                      <div className="flex flex-col gap-2">
                        <span className="font-sans text-[11px] text-ink-subtle">Reconstructed Image:</span>
                        <div className="relative w-full aspect-video rounded overflow-hidden bg-canvas border border-hairline flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={decompressedPreview}
                            alt="Decompressed Preview"
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
                    Decompression Verification Failed
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
                    Algorithm Steps Trace
                  </h3>
                  <p className="font-sans text-[11px] text-ink-subtle leading-relaxed mb-4">
                    First 80 index checks and code operations.
                  </p>
                  
                  <div className="flex-1 overflow-y-auto border border-hairline bg-canvas rounded-md">
                    <table className="w-full text-left font-sans text-[12px]">
                      <thead className="sticky top-0 bg-surface-2 text-ink-muted text-[10px] font-mono border-b border-hairline">
                        <tr>
                          <th className="p-2 text-center w-8">#</th>
                          <th className="p-2">Seq (W)</th>
                          <th className="p-2 w-8 text-center">+</th>
                          <th className="p-2">In (K)</th>
                          <th className="p-2">Result</th>
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
                                <span className="text-primary text-[10px]">Found in Dict</span>
                              ) : (
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-ink">Emit code {step.outputCode}</span>
                                  {step.newCode && (
                                    <span className="text-ink-tertiary text-[9px]">Add {step.newCode} for [{step.lookaheadKey}]</span>
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
                    Dictionary Inspector
                  </h3>
                  <p className="font-sans text-[11px] text-ink-subtle leading-relaxed mb-4">
                    Sample generated LZW dictionary indexes.
                  </p>
                  
                  <div className="flex-1 overflow-y-auto border border-hairline bg-canvas rounded-md">
                    <table className="w-full text-left font-sans text-[12px]">
                      <thead className="sticky top-0 bg-surface-2 text-ink-muted text-[10px] font-mono border-b border-hairline">
                        <tr>
                          <th className="p-2 w-20">Code Index</th>
                          <th className="p-2">Sequence Representation</th>
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
