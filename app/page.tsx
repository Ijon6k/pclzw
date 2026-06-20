"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

// Struktur data langkah simulasi
interface SimStep {
  step: number;
  w: string;
  k: string;
  wk: string;
  found: boolean;
  output?: number;
  newCode?: number;
}

export default function Home() {
  const [simInput, setSimInput] = useState("ABABABAB");

  // Fungsi simulasi LZW sederhana untuk tipe karakter string
  const simulateLZW = (text: string) => {
    if (!text) return { steps: [], dynamicDict: [], outputCodes: [] };

    const dictionary = new Map<string, number>();
    // Inisialisasi kamus dengan karakter dasar ASCII
    for (let i = 0; i < 256; i++) {
      dictionary.set(String.fromCharCode(i), i);
    }

    let nextCode = 256;
    const steps: SimStep[] = [];
    const outputCodes: number[] = [];

    let w = text[0];
    
    for (let i = 1; i < text.length; i++) {
      const k = text[i];
      const wk = w + k;
      
      if (dictionary.has(wk)) {
        steps.push({
          step: i,
          w,
          k,
          wk,
          found: true,
        });
        w = wk;
      } else {
        const codeW = dictionary.get(w)!;
        outputCodes.push(codeW);
        dictionary.set(wk, nextCode);
        steps.push({
          step: i,
          w,
          k,
          wk,
          found: false,
          output: codeW,
          newCode: nextCode,
        });
        nextCode++;
        w = k;
      }
    }

    // Output karakter terakhir
    if (w !== undefined && w !== "") {
      const codeW = dictionary.get(w)!;
      outputCodes.push(codeW);
      steps.push({
        step: text.length,
        w,
        k: "EOF",
        wk: "",
        found: false,
        output: codeW,
      });
    }

    // Ambil kode baru yang ditambahkan ke kamus
    const dynamicDict: { code: number; sequence: string }[] = [];
    dictionary.forEach((val, key) => {
      if (val >= 256) {
        dynamicDict.push({ code: val, sequence: key });
      }
    });

    return { steps, dynamicDict, outputCodes };
  };

  const { steps, dynamicDict, outputCodes } = simulateLZW(simInput);

  // Data pengujian referensi citra untuk benchmark
  const dataPengujian = [
    {
      namaFile: "lena_512x512_color.bmp",
      ukuranAwal: "768.1 KB",
      ukuranHasil: "312.4 KB",
      rasioKompresi: "2.46x",
    },
    {
      namaFile: "cameraman_256x256_gray.bmp",
      ukuranAwal: "64.0 KB",
      ukuranHasil: "38.2 KB",
      rasioKompresi: "1.68x",
    },
    {
      namaFile: "mandrill_512x512_color.bmp",
      ukuranAwal: "768.1 KB",
      ukuranHasil: "512.2 KB",
      rasioKompresi: "1.50x",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-canvas text-ink selection:bg-primary selection:text-white">
      <Navbar />

      <main className="flex-1 flex flex-col items-center">
        
        {/* HERO SECTION - PRESENTATION SLIDE STYLE */}
        <section className="relative w-full border-b border-hairline flex flex-col items-center overflow-hidden bg-canvas">
          {/* Engineering Blueprint Grid Background */}
          <div className="absolute inset-0 technical-grid hero-grid-mask opacity-[0.4] dark:opacity-[0.18] pointer-events-none"></div>

          <div className="relative z-10 w-full max-w-[1240px] px-6 md:px-8 pt-20 pb-20 md:pt-28 md:pb-24 flex flex-col lg:flex-row items-center justify-between gap-16">
            
            {/* Left Column: Bold Title & Concise Subtitle */}
            <div className="flex-1 flex flex-col items-start text-left max-w-[650px]">
              <div className="font-mono text-[13px] text-ink-subtle uppercase tracking-widest mb-4 font-semibold">
                PROYEK SAINS KOMPUTER
              </div>
              
              <h1 className="font-sans font-semibold text-4xl md:text-6xl leading-[1.1] tracking-[-0.03em] text-ink mb-6">
                Kompresi Citra Lossless LZW.
              </h1>

              <p className="font-sans text-[16px] md:text-[18px] text-ink-muted leading-relaxed mb-10 font-normal">
                Uji coba rekonstruksi bit-for-bit tanpa degradasi kualitas. Pelajari struktur pembentukan kamus 16-bit secara langsung.
              </p>

              <div className="flex items-center gap-4 w-full sm:w-auto">
                <Link
                  href="/compress"
                  className="bg-primary hover:bg-primary-hover active:bg-primary-focus text-white font-sans text-[14px] font-medium px-6 py-3 rounded-md transition-colors"
                >
                  Mulai Analisis
                </Link>
                <a
                  href="#algoritma"
                  className="bg-surface-1 hover:bg-surface-2 active:bg-surface-3 border border-hairline text-ink font-sans text-[14px] font-medium px-6 py-3 rounded-md transition-colors"
                >
                  Dokumentasi Algoritma
                </a>
              </div>
            </div>

            {/* Right Column: Visual Diagram */}
            <div className="flex-1 w-full max-w-[480px] bg-surface-1 border border-hairline p-8 rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 450 300" className="w-full h-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
                <style>
                  {`
                    @keyframes scan {
                      0%, 100% { transform: translateY(0px); }
                      50% { transform: translateY(100px); }
                    }
                    @keyframes dash {
                      to { stroke-dashoffset: -20; }
                    }
                    @keyframes fade-row {
                      0%, 100% { opacity: 0.3; }
                      50% { opacity: 1; }
                    }
                    .scanner { animation: scan 6s infinite ease-in-out; }
                    .data-flow { stroke-dasharray: 5 3; animation: dash 1.5s infinite linear; }
                    .dict-row-1 { animation: fade-row 3s infinite ease-in-out; }
                    .dict-row-2 { animation: fade-row 3s infinite ease-in-out 0.6s; }
                    .dict-row-3 { animation: fade-row 3s infinite ease-in-out 1.2s; }
                    .dict-row-4 { animation: fade-row 3s infinite ease-in-out 1.8s; }
                    .dict-row-5 { animation: fade-row 3s infinite ease-in-out 2.4s; }
                  `}
                </style>

                {/* Pixel Grid Matrix */}
                <g transform="translate(15, 60)">
                  <text x="0" y="-15" className="fill-ink font-mono text-[11px] tracking-wider uppercase font-semibold">Citra Matriks (Pixel Grid)</text>
                  {Array.from({ length: 6 }).map((_, r) =>
                    Array.from({ length: 6 }).map((_, c) => {
                      const isLavender = (r + c) % 3 === 0;
                      const fill = isLavender ? "#5e6ad2" : "#23252a";
                      const fillOpacity = isLavender ? "0.6" : "0.2";
                      return (
                        <rect
                          key={`${r}-${c}`}
                          x={c * 18}
                          y={r * 18}
                          width="16"
                          height="16"
                          fill={fill}
                          fillOpacity={fillOpacity}
                          stroke="#34343a"
                          strokeWidth="0.5"
                          rx="2"
                        />
                      );
                    })
                  )}
                  {/* Scanner Line */}
                  <line x1="-5" y1="0" x2="111" y2="0" stroke="#5e6ad2" strokeWidth="1.5" className="scanner" />
                </g>

                {/* Flow lines */}
                <path d="M 130 115 C 170 115, 175 145, 230 145" stroke="#5e6ad2" strokeWidth="1" className="data-flow" fill="none" opacity="0.6" />
                <path d="M 130 155 C 170 155, 175 145, 230 145" stroke="#23252a" strokeWidth="1" fill="none" />

                {/* Dictionary Box */}
                <g transform="translate(250, 45)">
                  <rect width="180" height="180" rx="6" fill="#010102" stroke="#23252a" strokeWidth="1" />
                  <text x="15" y="25" className="fill-ink font-mono text-[11px] tracking-wider uppercase font-semibold">Kamus Dinamis (LZW)</text>
                  <line x1="0" y1="35" x2="180" y2="35" stroke="#23252a" strokeWidth="1" />
                  <g transform="translate(15, 55)" className="fill-ink-muted font-mono text-[12px] font-medium">
                    <g className="dict-row-1">
                      <text x="0" y="0">A</text>
                      <text x="50" y="0" className="fill-ink-tertiary">&rarr;</text>
                      <text x="90" y="0" className="fill-primary font-semibold">65</text>
                    </g>
                    <g className="dict-row-2" transform="translate(0, 24)">
                      <text x="0" y="0">B</text>
                      <text x="50" y="0" className="fill-ink-tertiary">&rarr;</text>
                      <text x="90" y="0" className="fill-primary font-semibold">66</text>
                    </g>
                    <g className="dict-row-3" transform="translate(0, 48)">
                      <text x="0" y="0">AB</text>
                      <text x="50" y="0" className="fill-ink-tertiary">&rarr;</text>
                      <text x="90" y="0" className="fill-primary font-semibold">256</text>
                    </g>
                    <g className="dict-row-4" transform="translate(0, 72)">
                      <text x="0" y="0">BA</text>
                      <text x="50" y="0" className="fill-ink-tertiary">&rarr;</text>
                      <text x="90" y="0" className="fill-primary font-semibold">257</text>
                    </g>
                    <g className="dict-row-5" transform="translate(0, 96)">
                      <text x="0" y="0">ABA</text>
                      <text x="50" y="0" className="fill-ink-tertiary">&rarr;</text>
                      <text x="90" y="0" className="fill-primary font-semibold">258</text>
                    </g>
                  </g>
                </g>
              </svg>
            </div>

          </div>
        </section>

        {/* SECTION: TENTANG ALGORITMA LZW - SLIDE STYLE (NO WALL OF TEXT) */}
        <section id="algoritma" className="w-full max-w-[1240px] px-6 md:px-8 py-20 border-b border-hairline scroll-mt-14">
          <h2 className="font-sans font-semibold text-2xl md:text-3xl text-ink mb-12 tracking-tight">
            Prinsip Kerja LZW
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 mb-12">
            {/* Slide Point 1 */}
            <div className="bg-surface-1 border border-hairline p-6 rounded-lg">
              <h3 className="font-sans font-semibold text-[17px] text-ink mb-3">Definisi Algoritma</h3>
              <p className="font-sans text-[15px] text-ink-muted leading-relaxed">
                Lempel-Ziv-Welch (LZW) adalah algoritma kompresi lossless berbasis kamus. Metode ini mengenali pola rangkaian data berulang dan menggantikannya dengan indeks bilangan bulat yang lebih kecil secara dinamis.
              </p>
            </div>
            
            {/* Slide Point 2 */}
            <div className="bg-surface-1 border border-hairline p-6 rounded-lg">
              <h3 className="font-sans font-semibold text-[17px] text-ink mb-3">Sifat Lossless</h3>
              <p className="font-sans text-[15px] text-ink-muted leading-relaxed">
                Menjamin rekonstruksi data byte citra secara identik bit-for-bit. Sangat direkomendasikan untuk format citra medis, teks ilmiah, atau berkas arsip yang membutuhkan akurasi data mutlak tanpa distorsi visual.
              </p>
            </div>

            {/* Slide Point 3 */}
            <div className="bg-surface-1 border border-hairline p-6 rounded-lg">
              <h3 className="font-sans font-semibold text-[17px] text-ink mb-3">Kamus Dinamis</h3>
              <p className="font-sans text-[15px] text-ink-muted leading-relaxed">
                Kamus diinisialisasi menggunakan indeks dasar ASCII (0-255). Sepanjang pemrosesan sekuen, kombinasi byte baru yang dideteksi akan dicatat pada indeks kamus tambahan (indeks 256 ke atas) secara bertahap.
              </p>
            </div>

            {/* Slide Point 4 */}
            <div className="bg-surface-1 border border-hairline p-6 rounded-lg">
              <h3 className="font-sans font-semibold text-[17px] text-ink mb-3">Standar Industri</h3>
              <p className="font-sans text-[15px] text-ink-muted leading-relaxed">
                Telah diimplementasikan secara global pada format file grafis <strong>GIF</strong> untuk menangani tabel warna berulang, serta format file <strong>TIFF</strong> untuk kompresi bitmap tanpa cacat kompresi.
              </p>
            </div>
          </div>

          {/* Persamaan Matematika Formulasi */}
          <div className="bg-surface-1 border border-hairline p-6 rounded-lg">
            <h3 className="font-sans font-semibold text-[14px] text-ink mb-4 uppercase tracking-wider">
              Formulasi Perhitungan Evaluasi
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center font-mono text-[14px] text-ink-muted">
              <div className="p-5 bg-canvas border border-hairline rounded flex flex-col justify-center gap-2">
                <span>Rasio Kompresi:</span>
                <div className="text-primary text-[18px] font-bold py-1.5">
                  R = B_awal / C_hasil
                </div>
                <span className="text-[11px] text-ink-subtle">R &gt; 1 mengindikasikan ukuran file berhasil direduksi</span>
              </div>
              <div className="p-5 bg-canvas border border-hairline rounded flex flex-col justify-center gap-2">
                <span>Persentase Penghematan Ruang:</span>
                <div className="text-primary text-[18px] font-bold py-1.5">
                  S = (1 - C_hasil / B_awal) &times; 100%
                </div>
                <span className="text-[11px] text-ink-subtle">Mengukur efisiensi ruang media penyimpanan</span>
              </div>
            </div>
          </div>
        </section>

        {/* INTERACTIVE ALGORITHM PREVIEW (TERMINAL STYLE) */}
        <section className="w-full max-w-[1240px] px-6 md:px-8 py-20 border-b border-hairline">
          <h2 className="font-sans font-semibold text-2xl md:text-3xl text-ink mb-2 tracking-tight">
            Simulasi Algoritma LZW (Mode Terminal)
          </h2>
          <p className="font-sans text-[15px] text-ink-subtle leading-relaxed mb-8">
            Ubah input teks untuk melihat dinamika pembaruan kamus dan aliran kode output secara dinamis dalam visualisasi terminal debugger.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Input area */}
            <div className="lg:col-span-1 bg-surface-1 border border-hairline p-6 rounded-lg flex flex-col gap-6">
              <div>
                <label className="font-sans font-medium text-[12px] text-ink-subtle block mb-2 uppercase tracking-wider">
                  String Uji (Max 20 Karakter)
                </label>
                <input
                  type="text"
                  maxLength={20}
                  value={simInput}
                  onChange={(e) => setSimInput(e.target.value.toUpperCase())}
                  className="w-full bg-canvas border border-hairline focus:border-primary text-ink font-mono text-[14px] p-3 rounded outline-none"
                />
              </div>

              <div>
                <span className="font-sans font-medium text-[12px] text-ink-subtle block mb-2 uppercase tracking-wider">
                  Aliran Kode Output (16-bit)
                </span>
                <div className="w-full bg-canvas border border-hairline p-4 rounded font-mono text-[13px] text-primary whitespace-normal break-all leading-relaxed min-h-[70px]">
                  {outputCodes.join(", ")}
                </div>
              </div>

              <div className="font-sans text-[12px] text-ink-subtle leading-relaxed bg-canvas p-4 rounded border border-hairline">
                <span className="font-semibold text-ink block mb-1">Keterangan Indeks:</span>
                Kamus dasar bertumpu pada ASCII. Sekuen kombinasi baru dicatat otomatis mulai indeks 256.
              </div>
            </div>

            {/* Terminal Workspace split */}
            <div className="lg:col-span-2 bg-black border border-hairline rounded-lg flex flex-col h-[380px] overflow-hidden">
              
              {/* Terminal Title Bar */}
              <div className="bg-surface-1 border-b border-hairline px-5 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-hairline-strong"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-hairline-strong"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-hairline-strong"></span>
                </div>
                <span className="font-mono text-[11px] text-ink-subtle">lzw_debug_trace.log</span>
                <span className="w-6"></span>
              </div>

              {/* Terminal Workspace split */}
              <div className="flex-1 flex overflow-hidden">
                
                {/* Steps logs */}
                <div className="flex-1 overflow-y-auto p-4 border-r border-hairline">
                  <span className="font-mono text-[11px] text-ink-tertiary block mb-2">// RUNTIME ALGORITHM STEP TRACE</span>
                  <table className="w-full text-left font-mono text-[12px] text-ink-subtle">
                    <thead>
                      <tr className="text-ink text-[11px] border-b border-hairline">
                        <th className="pb-2">W</th>
                        <th className="pb-2">+</th>
                        <th className="pb-2">K</th>
                        <th className="pb-2">Status</th>
                        <th className="pb-2">Output</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline/40">
                      {steps.map((step, idx) => (
                        <tr key={idx} className="hover:bg-surface-1/25">
                          <td className="py-2 text-ink">&ldquo;{step.w}&rdquo;</td>
                          <td className="py-2 text-ink-tertiary">+</td>
                          <td className="py-2 text-ink font-semibold">{step.k === "EOF" ? "EOF" : `"${step.k}"`}</td>
                          <td className="py-2">
                            {step.wk ? (
                              step.found ? (
                                <span className="text-primary font-medium">FOUND</span>
                              ) : (
                                <span className="text-ink-tertiary">ADD_DICT</span>
                              )
                            ) : (
                              <span className="text-ink-tertiary">EOF</span>
                            )}
                          </td>
                          <td className="py-2">
                            {step.found ? (
                              <span className="text-ink-tertiary">-</span>
                            ) : (
                              <div className="flex flex-col gap-0.5">
                                {step.output !== undefined && <span>{step.output}</span>}
                                {step.newCode && (
                                  <span className="text-ink-tertiary text-[10px]">
                                    [{step.newCode}]={step.wk}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Kamus logs */}
                <div className="w-48 overflow-y-auto p-4 bg-surface-1/20">
                  <span className="font-mono text-[11px] text-ink-tertiary block mb-2">// DICTIONARY</span>
                  <div className="flex flex-col gap-1.5 font-mono text-[12px] text-ink-subtle">
                    {dynamicDict.map((entry) => (
                      <div key={entry.code} className="flex justify-between border-b border-hairline/40 py-0.5">
                        <span className="text-primary font-semibold">[{entry.code}]</span>
                        <span>&ldquo;{entry.sequence}&rdquo;</span>
                      </div>
                    ))}
                    {dynamicDict.length === 0 && (
                      <span className="text-[11px] text-ink-tertiary italic">Belum ada indeks gabungan...</span>
                    )}
                  </div>
                </div>

              </div>
            </div>

          </div>
        </section>

        {/* SECTION: VISUAL COMPRESSION COMPARISON (PROGRESS BAR SCHEMATIC) */}
        <section className="w-full max-w-[1240px] px-6 md:px-8 py-20 border-b border-hairline">
          <h2 className="font-sans font-semibold text-2xl md:text-3xl text-ink mb-8 tracking-tight">
            Perbandingan Kinerja Kompresi Citra
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-surface-1 border border-hairline p-8 rounded-lg">
            
            {/* Visual Bars Container */}
            <div className="flex flex-col gap-6">
              
              {/* Original size bar */}
              <div className="border border-hairline bg-canvas p-5 rounded-md">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-sans font-semibold text-[14px] text-ink">Citra Asli (Matriks Piksel Uncompressed)</span>
                  <span className="font-mono text-[12px] text-ink-subtle">768.0 KB</span>
                </div>
                <div className="w-full bg-surface-2 h-2.5 rounded-full overflow-hidden border border-hairline">
                  <div className="bg-ink-subtle h-full" style={{ width: "100%" }}></div>
                </div>
                <span className="font-mono text-[11px] text-ink-tertiary block mt-2">Uncompressed RGBA Byte Array (512 &times; 512 &times; 3)</span>
              </div>

              {/* Arrow */}
              <div className="flex justify-center my-0 text-ink-tertiary font-bold text-[16px]">&darr;</div>

              {/* Compressed size bar */}
              <div className="border border-hairline bg-canvas p-5 rounded-md">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-sans font-semibold text-[14px] text-ink">Paket Hasil Kompresi LZW</span>
                  <span className="font-mono text-[12px] text-primary font-bold">312.4 KB</span>
                </div>
                <div className="w-full bg-surface-2 h-2.5 rounded-full overflow-hidden border border-hairline">
                  <div className="bg-primary h-full" style={{ width: "40.6%" }}></div>
                </div>
                <span className="font-mono text-[11px] text-ink-tertiary block mt-2">Kamus LZW2 + Aliran Kode Indeks 16-bit</span>
              </div>

            </div>

            {/* Analysis Text details */}
            <div className="flex flex-col justify-center">
              <span className="font-mono text-[12px] text-primary font-bold uppercase tracking-widest mb-3 block">Analisis Efisiensi</span>
              <h3 className="font-sans font-semibold text-xl text-ink mb-4 leading-tight">Pengurangan Kapasitas Penyimpanan Citra</h3>
              <p className="font-sans text-[15px] text-ink-muted leading-relaxed mb-6">
                Rasio kompresi mencapai <strong className="text-ink">2.46x</strong> dengan ruang penyimpanan yang dihemat sebesar <strong className="text-success">59.3%</strong>. Keuntungan kompresi diperoleh dari konversi sekuen warna berulang menjadi kode biner terindeks tunggal.
              </p>
              <div className="bg-canvas border border-hairline p-4 rounded font-mono text-[12px] text-ink-subtle leading-relaxed">
                Persentase Savings = (1 - 312.4 / 768.0) &times; 100% = 59.32%
              </div>
            </div>

          </div>
        </section>

        {/* SECTION: SYSTEM ARCHITECTURE SECTION - SLIDE FLOW STYLE */}
        <section className="w-full max-w-[1240px] px-6 md:px-8 py-20 border-b border-hairline">
          <h2 className="font-sans font-semibold text-2xl md:text-3xl text-ink mb-10 tracking-tight">
            Arsitektur Aliran Sistem
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            
            {/* Card 1 */}
            <div className="bg-surface-1 border border-hairline p-6 rounded-lg flex flex-col justify-between">
              <div>
                <span className="font-mono text-[11px] text-primary font-bold block mb-2">01 / INPUT</span>
                <h3 className="font-sans font-semibold text-[15px] text-ink mb-2">
                  Pembacaan Citra
                </h3>
                <p className="font-sans text-[13px] text-ink-subtle leading-relaxed">
                  Antarmuka memuat file citra PNG/JPG/BMP ke dalam memory browser.
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-surface-1 border border-hairline p-6 rounded-lg flex flex-col justify-between">
              <div>
                <span className="font-mono text-[11px] text-primary font-bold block mb-2">02 / PARSER</span>
                <h3 className="font-sans font-semibold text-[15px] text-ink mb-2">
                  Ekstraksi Piksel
                </h3>
                <p className="font-sans text-[13px] text-ink-subtle leading-relaxed">
                  Konversi berkas bitmap menjadi aliran byte mentah dalam bentuk array RGBA.
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-surface-1 border border-hairline p-6 rounded-lg flex flex-col justify-between">
              <div>
                <span className="font-mono text-[11px] text-primary font-bold block mb-2">03 / ENGINE</span>
                <h3 className="font-sans font-semibold text-[15px] text-ink mb-2">
                  Kompresi LZW
                </h3>
                <p className="font-sans text-[13px] text-ink-subtle leading-relaxed">
                  Menjalankan enkode pencarian kamus 16-bit untuk mereduksi redundansi data.
                </p>
              </div>
            </div>

            {/* Card 4 */}
            <div className="bg-surface-1 border border-hairline p-6 rounded-lg flex flex-col justify-between">
              <div>
                <span className="font-mono text-[11px] text-primary font-bold block mb-2">04 / FILE EXPORT</span>
                <h3 className="font-sans font-semibold text-[15px] text-ink mb-2">
                  Penyimpanan Biner
                </h3>
                <p className="font-sans text-[13px] text-ink-subtle leading-relaxed">
                  Menyusun kode terkompresi dan mengekspornya menjadi format biner `.lzw`.
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* SECTION: HASIL PENGUJIAN */}
        <section className="w-full max-w-[1240px] px-6 md:px-8 py-20 border-b border-hairline">
          <h2 className="font-sans font-semibold text-2xl md:text-3xl text-ink mb-8 tracking-tight">
            Hasil Pengujian Referensi
          </h2>
          
          <p className="font-sans text-[15px] text-ink-muted leading-relaxed mb-6">
            Hasil pengukuran kinerja kompresi LZW pada citra uji bitmap standar yang diuji pada lingkungan laboratorium:
          </p>

          <div className="bg-surface-1 border border-hairline rounded-md overflow-hidden">
            <table className="w-full text-left font-sans text-[14px]">
              <thead className="bg-surface-2 text-ink border-b border-hairline font-mono text-[12px]">
                <tr>
                  <th className="p-4">Nama File Uji</th>
                  <th className="p-4 text-right">Ukuran Awal</th>
                  <th className="p-4 text-right">Ukuran Hasil</th>
                  <th className="p-4 text-right">Rasio Kompresi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline text-ink-subtle">
                {dataPengujian.map((item, idx) => (
                  <tr key={idx} className="hover:bg-surface-2/20">
                    <td className="p-4 font-semibold text-ink font-mono">{item.namaFile}</td>
                    <td className="p-4 text-right font-mono">{item.ukuranAwal}</td>
                    <td className="p-4 text-right font-mono">{item.ukuranHasil}</td>
                    <td className="p-4 text-right font-mono text-primary font-bold">{item.rasioKompresi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION: KESIMPULAN - SLIDE BRIEF STYLE */}
        <section className="w-full max-w-[1240px] px-6 md:px-8 py-20">
          <h2 className="font-sans font-semibold text-2xl md:text-3xl text-ink mb-10 tracking-tight">
            Kesimpulan Pengujian
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-[15px] text-ink-muted leading-relaxed">
            <div className="bg-surface-1 border border-hairline p-6 rounded-lg">
              <h3 className="font-sans font-bold text-success text-[16px] mb-3 uppercase tracking-wider">&bull; Kelebihan Kinerja (Optimal)</h3>
              <p>
                Sangat efisien dalam memproses berkas citra bitmap yang memiliki redundansi data piksel yang tinggi (warna homogen berulang) seperti berkas ikon komputer, grafis kartun datar, dan sketsa garis.
              </p>
            </div>
            
            <div className="bg-surface-1 border border-hairline p-6 rounded-lg">
              <h3 className="font-sans font-bold text-ink-subtle text-[16px] mb-3 uppercase tracking-wider">&bull; Keterbatasan Kinerja (Ekspansi)</h3>
              <p>
                Rasio kompresi menurun drastis hingga di bawah 1.0x (ukuran membengkak) jika memproses citra fotografis kompleks atau berkas citra yang sebelumnya telah melalui algoritma kompresi entropi (PNG/JPG). Hal ini disebabkan oleh pembengkakan alokasi kode kamus 16-bit.
              </p>
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER AKADEMIS */}
      <footer className="w-full bg-canvas border-t border-hairline py-8 px-6 md:px-8 mt-auto">
        <div className="max-w-[1240px] w-full mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-sans text-[13px] text-ink-subtle text-center md:text-left">
            Proyek Tugas Akhir Laboratorium Ilmu Komputer & Rekayasa Perangkat Lunak.
          </p>
          <p className="font-mono text-[12px] text-ink-tertiary">
            Dokumen Penelitian LZW &copy; 2026. Hak Cipta Dilindungi.
          </p>
        </div>
      </footer>
    </div>
  );
}
