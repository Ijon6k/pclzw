"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  // Sync theme with document class on mount/change
  useEffect(() => {
    setMounted(true);
    const localTheme = localStorage.getItem("theme") as "dark" | "light" | null;
    if (localTheme) {
      setTheme(localTheme);
      document.documentElement.classList.remove("dark", "light");
      document.documentElement.classList.add(localTheme);
    } else {
      // Default to dark
      document.documentElement.classList.remove("dark", "light");
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.classList.add(nextTheme);
  };

  const navLinks = [
    { name: "Beranda", href: "/" },
    { name: "Algoritma", href: "/#algoritma" },
    { name: "Kompresi", href: "/compress" },
    { name: "Analisis", href: "/analysis" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full h-14 bg-canvas/80 backdrop-blur-md border-b border-hairline flex items-center justify-between px-6 md:px-8">
      {/* Kode Identifikasi Proyek */}
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-5 h-5 flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="w-full h-full text-primary"
            >
              <polygon points="12 2 2 22 22 22" strokeLinejoin="round" />
              <circle cx="12" cy="10" r="2" fill="currentColor" />
            </svg>
          </div>
          <span className="font-sans font-medium text-[13px] tracking-tight text-ink">
            Proyek LZW Citra
          </span>
        </Link>
      </div>

      {/* Tautan Navigasi Akademik */}
      <nav className="hidden md:flex items-center gap-8">
        {navLinks.map((link) => {
          const isActive = pathname === link.href || (link.href.startsWith("/#") && pathname === "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`font-sans text-[13px] font-medium transition-colors ${
                isActive
                  ? "text-ink"
                  : "text-ink-subtle hover:text-ink"
              }`}
            >
              {link.name}
            </Link>
          );
        })}
      </nav>

      {/* Tombol Tema & Aksi Utama */}
      <div className="flex items-center gap-4">
        {mounted && (
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="w-8 h-8 flex items-center justify-center text-ink-subtle hover:text-ink border border-hairline bg-surface-1 rounded-md transition-colors"
          >
            {theme === "dark" ? (
              // Sun icon for dark mode (click -> light)
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            ) : (
              // Moon icon for light mode (click -> dark)
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        )}

        {pathname !== "/compress" ? (
          <Link
            href="/compress"
            className="bg-primary hover:bg-primary-hover active:bg-primary-focus text-white font-sans text-[12px] font-medium px-3.5 py-1.5 rounded-md transition-colors"
          >
            Mulai Kompresi
          </Link>
        ) : (
          <Link
            href="/analysis"
            className="bg-surface-1 border border-hairline hover:bg-surface-2 text-ink font-sans text-[12px] font-medium px-3.5 py-1.5 rounded-md transition-colors"
          >
            Analisis Data
          </Link>
        )}
      </div>
    </header>
  );
}
