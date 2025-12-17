// Simple mode history types and localStorage utilities
// Completely separate from advanced mode history
import { supabase } from '@/integrations/supabase/client';

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

// ============================================
// Database sync functions (for authenticated users)
// ============================================

// Load simple history from database
export async function loadSimpleHistoryFromDb(userId: string): Promise<SimpleHistoryEntry[]> {
  try {
    const { data, error } = await supabase
      .from('simple_history_entries')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(MAX_HISTORY_ENTRIES);

    if (error) {
      console.error('Failed to load simple history from database:', error);
      return [];
    }

    return (data || []).map(entry => ({
      id: entry.id,
      timestamp: new Date(entry.timestamp).getTime(),
      input: entry.input,
      output: entry.output,
      elapsedTime: entry.elapsed_time,
    }));
  } catch (e) {
    console.error('Failed to load simple history from database:', e);
    return [];
  }
}

// Add entry to database
export async function addSimpleHistoryEntryToDb(
  userId: string,
  entry: Omit<SimpleHistoryEntry, 'id' | 'timestamp'>
): Promise<SimpleHistoryEntry | null> {
  const newEntry: SimpleHistoryEntry = {
    ...entry,
    id: generateSimpleId(),
    timestamp: Date.now(),
  };

  try {
    const { error } = await supabase
      .from('simple_history_entries')
      .insert({
        id: newEntry.id,
        user_id: userId,
        timestamp: new Date(newEntry.timestamp).toISOString(),
        input: newEntry.input,
        output: newEntry.output,
        elapsed_time: newEntry.elapsedTime,
      });

    if (error) {
      console.error('Failed to add simple history entry to database:', error);
      return null;
    }

    return newEntry;
  } catch (e) {
    console.error('Failed to add simple history entry to database:', e);
    return null;
  }
}

// Delete entry from database
export async function deleteSimpleHistoryEntryFromDb(userId: string, id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('simple_history_entries')
      .delete()
      .eq('user_id', userId)
      .eq('id', id);

    if (error) {
      console.error('Failed to delete simple history entry from database:', error);
    }
  } catch (e) {
    console.error('Failed to delete simple history entry from database:', e);
  }
}

// Clear all simple history from database
export async function clearSimpleHistoryFromDb(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('simple_history_entries')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to clear simple history from database:', error);
    }
  } catch (e) {
    console.error('Failed to clear simple history from database:', e);
  }
}
