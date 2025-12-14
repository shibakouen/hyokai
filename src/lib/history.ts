// History types and localStorage utilities

export interface SingleModelResult {
  type: 'single';
  modelName: string;
  modelProvider: string;
  output: string;
  elapsedTime: number | null;
}

export interface CompareModelResult {
  type: 'compare';
  results: Array<{
    modelName: string;
    modelProvider: string;
    output: string | null;
    error: string | null;
    elapsedTime: number | null;
  }>;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  input: string;
  taskMode: 'coding' | 'prompting';
  result: SingleModelResult | CompareModelResult;
}

const STORAGE_KEY = 'hyokai-history';
const MAX_HISTORY_ENTRIES = 50;

// Generate a unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Load history from localStorage
export function loadHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    return parsed;
  } catch {
    console.error('Failed to load history from localStorage');
    return [];
  }
}

// Save history to localStorage
export function saveHistory(entries: HistoryEntry[]): void {
  if (typeof window === 'undefined') return;

  try {
    // Keep only the most recent entries
    const trimmed = entries.slice(0, MAX_HISTORY_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Failed to save history to localStorage:', error);
  }
}

// Add a new entry to history
export function addHistoryEntry(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): HistoryEntry {
  const newEntry: HistoryEntry = {
    ...entry,
    id: generateId(),
    timestamp: Date.now(),
  };

  const existing = loadHistory();
  const updated = [newEntry, ...existing];
  saveHistory(updated);

  return newEntry;
}

// Delete a history entry
export function deleteHistoryEntry(id: string): void {
  const existing = loadHistory();
  const filtered = existing.filter(entry => entry.id !== id);
  saveHistory(filtered);
}

// Clear all history
export function clearHistory(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

// Format timestamp for display
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - timestamp;

  // Less than 1 minute
  if (diff < 60 * 1000) {
    return 'Just now';
  }

  // Less than 1 hour
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000));
    return `${minutes}m ago`;
  }

  // Less than 24 hours
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    return `${hours}h ago`;
  }

  // Less than 7 days
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    return `${days}d ago`;
  }

  // Otherwise show date
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

// Truncate text for preview
export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}
