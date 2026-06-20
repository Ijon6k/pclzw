"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { getHistory, clearHistory, HistoryEntry } from "@/lib/history";

export default function AnalysisPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [activeTab, setActiveTab] = useState<"table" | "charts">("charts");

  // Load history on mount
  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const handleClear = () => {
    if (confirm("Are you sure you want to clear the entire compression history?")) {
      clearHistory();
      setHistory([]);
    }
  };

  // Format bytes for readable display
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Compute aggregate statistics
  const totalFiles = history.length;
  
  const totalOriginalBytes = history.reduce((sum, item) => sum + item.originalSize, 0);
  const totalCompressedBytes = history.reduce((sum, item) => sum + item.compressedSize, 0);
  
  const averageRatio = totalFiles > 0 
    ? history.reduce((sum, item) => sum + item.ratio, 0) / totalFiles 
    : 0;

  const totalSpaceSavedPercent = totalOriginalBytes > 0
    ? ((totalOriginalBytes - totalCompressedBytes) / totalOriginalBytes) * 100
    : 0;

  // Custom SVG Chart 1: File Size Comparison (Original vs Compressed)
  const renderFileSizeChart = () => {
    if (history.length === 0) return null;

    // Use a subset of history for cleaner visualization (max 6 items)
    const chartData = [...history].slice(0, 6).reverse(); 

    // Find the maximum original size to scale the bars
    const maxVal = Math.max(...chartData.map((d) => Math.max(d.originalSize, d.compressedSize)));

    const width = 500;
    const barHeight = 14;
    const groupGap = 20; // gap between groups
    const elementHeight = barHeight * 2 + 18; // label + original bar + compressed bar
    const height = chartData.length * (elementHeight + groupGap) + 40;

    return (
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[400px] h-auto font-sans" fill="none">
          {/* Grid lines */}
          <line x1="80" y1="20" x2="80" y2={height - 20} stroke="#23252a" strokeWidth="1" />
          <line x1="185" y1="20" x2="185" y2={height - 20} stroke="#23252a" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="290" y1="20" x2="290" y2={height - 20} stroke="#23252a" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="395" y1="20" x2="395" y2={height - 20} stroke="#23252a" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="490" y1="20" x2="490" y2={height - 20} stroke="#23252a" strokeWidth="1" />

          {/* Grid labels */}
          <text x="80" y="15" className="fill-ink-tertiary text-[9px] text-center" textAnchor="middle">0%</text>
          <text x="185" y="15" className="fill-ink-tertiary text-[9px] text-center" textAnchor="middle">25%</text>
          <text x="290" y="15" className="fill-ink-tertiary text-[9px] text-center" textAnchor="middle">50%</text>
          <text x="395" y="15" className="fill-ink-tertiary text-[9px] text-center" textAnchor="middle">75%</text>
          <text x="490" y="15" className="fill-ink-tertiary text-[9px] text-center" textAnchor="middle">100%</text>

          {chartData.map((d, idx) => {
            const y = 30 + idx * (elementHeight + groupGap);
            const origWidth = Math.max(2, (d.originalSize / maxVal) * 380);
            const compWidth = Math.max(2, (d.compressedSize / maxVal) * 380);

            return (
              <g key={d.id}>
                {/* Filename label */}
                <text x="0" y={y + 10} className="fill-ink font-medium text-[11px]" textAnchor="start">
                  {d.fileName.length > 30 ? `${d.fileName.substring(0, 27)}...` : d.fileName}
                </text>
                
                {/* Mode Indicator */}
                <text x="495" y={y + 10} className="fill-ink-subtle font-mono text-[9px]" textAnchor="end">
                  {d.mode === "pixel" ? "PIXEL" : "FILE"}
                </text>

                {/* Original Size Bar (Subtle charcoal gray) */}
                <rect x="80" y={y + 18} width={origWidth} height={barHeight} fill="#23252a" rx="2" />
                <text x={85 + origWidth} y={y + 28} className="fill-ink-subtle font-mono text-[9px]">
                  {formatBytes(d.originalSize)} (Orig)
                </text>

                {/* Compressed Size Bar (Lavender blue) */}
                <rect x="80" y={y + 18 + barHeight + 4} width={compWidth} height={barHeight} fill="#5e6ad2" rx="2" />
                <text x={85 + compWidth} y={y + 28 + barHeight + 4} className="fill-primary font-mono text-[9px] font-medium">
                  {formatBytes(d.compressedSize)} ({d.ratio.toFixed(2)}x)
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  // Custom SVG Chart 2: Space Saved (%) Chart
  const renderSpaceSavedChart = () => {
    if (history.length === 0) return null;

    const chartData = [...history].slice(0, 6).reverse(); 

    const width = 500;
    const barHeight = 16;
    const rowHeight = 45;
    const height = chartData.length * rowHeight + 40;

    return (
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[400px] h-auto font-sans" fill="none">
          {/* Scale Lines */}
          <line x1="100" y1="20" x2="100" y2={height - 20} stroke="#23252a" strokeWidth="1" />
          <line x1="195" y1="20" x2="195" y2={height - 20} stroke="#23252a" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="290" y1="20" x2="290" y2={height - 20} stroke="#23252a" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="385" y1="20" x2="385" y2={height - 20} stroke="#23252a" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="480" y1="20" x2="480" y2={height - 20} stroke="#23252a" strokeWidth="1" />

          {/* Scale Labels */}
          <text x="100" y="15" className="fill-ink-tertiary text-[9px]" textAnchor="middle">0%</text>
          <text x="195" y="15" className="fill-ink-tertiary text-[9px]" textAnchor="middle">25%</text>
          <text x="290" y="15" className="fill-ink-tertiary text-[9px]" textAnchor="middle">50%</text>
          <text x="385" y="15" className="fill-ink-tertiary text-[9px]" textAnchor="middle">75%</text>
          <text x="480" y="15" className="fill-ink-tertiary text-[9px]" textAnchor="middle">100%</text>

          {chartData.map((d, idx) => {
            const y = 30 + idx * rowHeight;
            const savingsPercent = Math.max(-100, Math.min(100, ((d.originalSize - d.compressedSize) / d.originalSize) * 100));
            
            // Map savings to canvas pixels. 0% is at x=100. 100% is at x=480. Range = 380px.
            // If negative savings (expansion), the bar will render backwards or have 0 width for display.
            const isNegative = savingsPercent < 0;
            const barWidth = Math.abs(savingsPercent) * 3.8;
            const barX = isNegative ? Math.max(10, 100 - barWidth) : 100;

            return (
              <g key={d.id}>
                {/* Filename label on the left */}
                <text x="0" y={y + 12} className="fill-ink font-medium text-[10px]" textAnchor="start">
                  {d.fileName.length > 15 ? `${d.fileName.substring(0, 12)}...` : d.fileName}
                </text>

                {/* Savings bar */}
                <rect 
                  x={barX} 
                  y={y} 
                  width={barWidth} 
                  height={barHeight} 
                  fill={isNegative ? "#34343a" : "#5e6ad2"} 
                  rx="2" 
                />
                
                {/* Value Text */}
                <text 
                  x={isNegative ? 95 : 105 + barWidth} 
                  y={y + 12} 
                  className={`font-mono text-[9px] font-medium ${isNegative ? "fill-ink-subtle text-right" : "fill-primary"}`}
                  textAnchor={isNegative ? "end" : "start"}
                >
                  {savingsPercent.toFixed(1)}%
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-canvas text-ink selection:bg-primary selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-6 md:px-8 py-8 flex flex-col gap-8">
        
        {/* PAGE HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-sans font-semibold text-3xl tracking-[-0.02em] text-ink mb-1.5">
              Analysis Dashboard
            </h1>
            <p className="font-sans text-[13px] text-ink-muted leading-relaxed">
              Review and compare compression performance across your upload history.
            </p>
          </div>

          {history.length > 0 && (
            <button
              onClick={handleClear}
              className="self-start bg-surface-1 border border-hairline hover:bg-surface-2 text-ink-subtle hover:text-ink font-sans text-[12px] font-medium px-4 py-2 rounded transition-colors"
            >
              Clear Session History
            </button>
          )}
        </div>

        {history.length === 0 ? (
          /* EMPTY STATE */
          <div className="bg-surface-1 border border-hairline rounded-lg py-20 px-8 flex flex-col items-center justify-center text-center">
            <svg className="w-12 h-12 text-ink-tertiary mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
            </svg>
            <h3 className="font-sans font-medium text-[15px] text-ink mb-2">
              No History Available
            </h3>
            <p className="font-sans text-[12px] text-ink-subtle max-w-[320px] leading-relaxed mb-6">
              You haven&apos;t compressed any files in this session yet. Upload and compress files to populate the charts.
            </p>
            <Link
              href="/compress"
              className="bg-primary hover:bg-primary-hover text-white font-sans text-[13px] font-medium px-5 py-2.5 rounded-md transition-colors"
            >
              Go to Compressor
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            
            {/* CUMULATIVE STATS CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Card 1 */}
              <div className="bg-surface-1 border border-hairline p-5 rounded-lg">
                <span className="font-sans text-[12px] text-ink-subtle block mb-1">
                  Total Runs
                </span>
                <span className="font-sans font-semibold text-2xl text-ink block mb-0.5">
                  {totalFiles}
                </span>
                <span className="font-sans text-[11px] text-ink-tertiary">
                  Images processed this session
                </span>
              </div>

              {/* Card 2 */}
              <div className="bg-surface-1 border border-hairline p-5 rounded-lg">
                <span className="font-sans text-[12px] text-ink-subtle block mb-1">
                  Average Compression Ratio
                </span>
                <span className="font-sans font-semibold text-2xl text-success block mb-0.5">
                  {averageRatio.toFixed(3)}x
                </span>
                <span className="font-sans text-[11px] text-ink-tertiary">
                  Higher ratio means better space savings
                </span>
              </div>

              {/* Card 3 */}
              <div className="bg-surface-1 border border-hairline p-5 rounded-lg">
                <span className="font-sans text-[12px] text-ink-subtle block mb-1">
                  Cumulative Space Saved
                </span>
                <span className={`font-sans font-semibold text-2xl block mb-0.5 ${
                  totalOriginalBytes >= totalCompressedBytes ? "text-success" : "text-ink-subtle"
                }`}>
                  {totalOriginalBytes >= totalCompressedBytes ? "" : "-"}
                  {formatBytes(Math.abs(totalOriginalBytes - totalCompressedBytes))}
                </span>
                
                {/* Horizontal bar representation of cumulative space saved */}
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-1.5 bg-canvas rounded-full overflow-hidden border border-hairline">
                    <div 
                      className="h-full bg-primary" 
                      style={{ width: `${Math.max(0, Math.min(100, totalSpaceSavedPercent))}%` }}
                    ></div>
                  </div>
                  <span className="font-mono text-[10px] text-ink-subtle whitespace-nowrap">
                    {totalSpaceSavedPercent.toFixed(1)}% saved
                  </span>
                </div>
              </div>

            </div>

            {/* TAB TOGGLE: CHARTS VS TABLE */}
            <div className="w-full flex border-b border-hairline gap-6 mb-2">
              <button
                onClick={() => setActiveTab("charts")}
                className={`font-sans text-[13px] font-medium pb-2 border-b-2 transition-colors ${
                  activeTab === "charts" 
                    ? "border-primary text-ink" 
                    : "border-transparent text-ink-subtle hover:text-ink"
                }`}
              >
                Analytical Graphs
              </button>
              <button
                onClick={() => setActiveTab("table")}
                className={`font-sans text-[13px] font-medium pb-2 border-b-2 transition-colors ${
                  activeTab === "table" 
                    ? "border-primary text-ink" 
                    : "border-transparent text-ink-subtle hover:text-ink"
                }`}
              >
                History Table
              </button>
            </div>

            {/* VIEW A: CHARTS VISUALIZATION */}
            {activeTab === "charts" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Size Comparison Chart Card */}
                <div className="bg-surface-1 border border-hairline rounded-lg p-6">
                  <h3 className="font-sans font-semibold text-[14px] text-ink mb-1 tracking-tight">
                    File Size Comparison
                  </h3>
                  <p className="font-sans text-[11px] text-ink-subtle leading-relaxed mb-6">
                    Compares original vs. compressed binary footprints (showing up to 6 recent items).
                  </p>
                  
                  {renderFileSizeChart()}

                  <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-hairline font-sans text-[11px] text-ink-subtle">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded bg-hairline-strong inline-block"></span>
                      <span>Original Size</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded bg-primary inline-block"></span>
                      <span>Compressed Size</span>
                    </div>
                  </div>
                </div>

                {/* Space Saved Chart Card */}
                <div className="bg-surface-1 border border-hairline rounded-lg p-6">
                  <h3 className="font-sans font-semibold text-[14px] text-ink mb-1 tracking-tight">
                    Net Space Saved (%)
                  </h3>
                  <p className="font-sans text-[11px] text-ink-subtle leading-relaxed mb-6">
                    Visualizes percentage compression reduction or footprint expansion (showing up to 6 recent items).
                  </p>
                  
                  {renderSpaceSavedChart()}

                  <div className="mt-4 pt-4 border-t border-hairline font-sans text-[10px] text-ink-tertiary leading-relaxed">
                    Note: Negative percentage values signify dictionary initialization overhead on already compressed payloads.
                  </div>
                </div>

              </div>
            )}

            {/* VIEW B: COMPREHENSIVE TABLE */}
            {activeTab === "table" && (
              <div className="bg-surface-1 border border-hairline rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-sans text-[13px]">
                    <thead className="bg-surface-2 text-ink-muted text-[11px] font-mono border-b border-hairline">
                      <tr>
                        <th className="p-4 font-medium">File Name</th>
                        <th className="p-4 font-medium">Method Mode</th>
                        <th className="p-4 font-medium text-right">Original Size</th>
                        <th className="p-4 font-medium text-right">Compressed Size</th>
                        <th className="p-4 font-medium text-right">Ratio</th>
                        <th className="p-4 font-medium text-right">Space Saved</th>
                        <th className="p-4 font-medium text-right">Dict Size</th>
                        <th className="p-4 font-medium text-right">Processed On</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline text-ink-subtle">
                      {history.map((item) => {
                        const savings = ((item.originalSize - item.compressedSize) / item.originalSize) * 100;
                        const date = new Date(item.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        });
                        
                        return (
                          <tr key={item.id} className="hover:bg-surface-2/30">
                            <td className="p-4 font-medium text-ink truncate max-w-[200px]" title={item.fileName}>
                              {item.fileName}
                            </td>
                            <td className="p-4 font-mono text-[11px]">
                              {item.mode === "pixel" ? (
                                <span className="text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/20">Pixels</span>
                              ) : (
                                <span className="text-ink-muted bg-surface-2 px-2 py-0.5 rounded border border-hairline">Binary</span>
                              )}
                            </td>
                            <td className="p-4 text-right font-mono text-[11px]">
                              {formatBytes(item.originalSize)}
                            </td>
                            <td className="p-4 text-right font-mono text-[11px]">
                              {formatBytes(item.compressedSize)}
                            </td>
                            <td className="p-4 text-right font-mono text-[11px] text-ink font-semibold">
                              {item.ratio.toFixed(3)}x
                            </td>
                            <td className={`p-4 text-right font-mono text-[11px] font-medium ${
                              savings >= 0 ? "text-success" : "text-ink-tertiary"
                            }`}>
                              {savings.toFixed(1)}%
                            </td>
                            <td className="p-4 text-right font-mono text-[11px]">
                              {item.dictionarySize}
                            </td>
                            <td className="p-4 text-right text-ink-tertiary text-[11px]">
                              {date}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}

      </main>
    </div>
  );
}
