/**
 * LZW Image Compression Analyzer - Session History Manager
 * Saves and loads metadata of compressed files using localStorage.
 * SSR-safe.
 */

export interface HistoryEntry {
  id: string;
  fileName: string;
  fileType: string;
  mode: "pixel" | "file";
  originalSize: number;
  compressedSize: number;
  ratio: number;
  dictionarySize: number;
  timestamp: number;
}

const STORAGE_KEY = "lzw_analyzer_history";

/**
 * Checks if window is defined (client-side execution).
 */
function isClient(): boolean {
  return typeof window !== "undefined";
}

/**
 * Loads all compression history records.
 */
export function getHistory(): HistoryEntry[] {
  if (!isClient()) return [];
  
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.sort((a, b) => b.timestamp - a.timestamp); // Newer first
    }
  } catch (e) {
    console.error("Failed to parse compression history:", e);
  }
  
  return [];
}

/**
 * Saves the list of history entries.
 */
export function saveHistory(history: HistoryEntry[]): void {
  if (!isClient()) return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (e) {
    console.error("Failed to save compression history:", e);
  }
}

/**
 * Appends a new entry to the history.
 */
export function addHistoryEntry(entry: Omit<HistoryEntry, "id" | "timestamp">): HistoryEntry {
  const newEntry: HistoryEntry = {
    ...entry,
    id: Math.random().toString(36).substring(2, 9),
    timestamp: Date.now(),
  };

  const history = getHistory();
  history.unshift(newEntry); // Prepend so it appears first
  saveHistory(history);
  return newEntry;
}

/**
 * Clears all compression history records.
 */
export function clearHistory(): void {
  if (!isClient()) return;
  
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error("Failed to clear compression history:", e);
  }
}
