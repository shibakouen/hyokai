// Simple mode history types and localStorage utilities
// Completely separate from advanced mode history

export interface SimpleHistoryEntry {
  id: string;
  timestamp: number;
  input: string;
  output: string;
  elapsedTime: number | null;
}

const STORAGE_KEY = 'hyokai-simple-history';
const MAX_HISTORY_ENTRIES = 30;

// Generate a unique ID
export function generateSimpleId(): string {
  return `simple-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Load history from localStorage
export function loadSimpleHistory(): SimpleHistoryEntry[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    return parsed;
  } catch {
    console.error('Failed to load simple history from localStorage');
    return [];
  }
}

// Save history to localStorage
export function saveSimpleHistory(entries: SimpleHistoryEntry[]): void {
  if (typeof window === 'undefined') return;

  try {
    // Keep only the most recent entries
    const trimmed = entries.slice(0, MAX_HISTORY_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Failed to save simple history to localStorage:', error);
  }
}

// Add a new entry to history
export function addSimpleHistoryEntry(
  entry: Omit<SimpleHistoryEntry, 'id' | 'timestamp'>
): SimpleHistoryEntry {
  const newEntry: SimpleHistoryEntry = {
    ...entry,
    id: generateSimpleId(),
    timestamp: Date.now(),
  };

  const existing = loadSimpleHistory();
  const updated = [newEntry, ...existing];
  saveSimpleHistory(updated);

  return newEntry;
}

// Delete a history entry
export function deleteSimpleHistoryEntry(id: string): void {
  const existing = loadSimpleHistory();
  const filtered = existing.filter(entry => entry.id !== id);
  saveSimpleHistory(filtered);
}

// Clear all simple history
export function clearSimpleHistory(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

// Format timestamp for display (reusing same logic)
export function formatSimpleTimestamp(timestamp: number): string {
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
export function truncateSimpleText(text: string, maxLength: number = 80): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}
