// Simple mode history types and localStorage utilities
// Completely separate from advanced mode history
import { supabase } from '@/integrations/supabase/client';
import { withRetry } from '@/lib/dbRetry';
import { safeSetJSON } from '@/lib/storage';

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

// Save history to localStorage (with quota handling)
export function saveSimpleHistory(entries: SimpleHistoryEntry[]): void {
  if (typeof window === 'undefined') return;

  // Use safe storage with automatic trimming on quota exceeded
  safeSetJSON(STORAGE_KEY, entries, MAX_HISTORY_ENTRIES);
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

// Load simple history from database with retry
export async function loadSimpleHistoryFromDb(userId: string): Promise<SimpleHistoryEntry[] | null> {
  console.log('[SimpleHistory] Loading from database for user:', userId.slice(0, 8) + '...');

  try {
    const data = await withRetry(
      async () => {
        const { data, error } = await supabase
          .from('simple_history_entries')
          .select('*')
          .eq('user_id', userId)
          .order('timestamp', { ascending: false })
          .limit(MAX_HISTORY_ENTRIES);

        if (error) {
          console.error('[SimpleHistory] Database select error:', error.message);
          throw error;
        }
        return data;
      },
      { maxRetries: 2 }
    );

    const entries = (data || []).map(entry => ({
      id: entry.id,
      timestamp: new Date(entry.timestamp).getTime(),
      input: entry.input,
      output: entry.output,
      elapsedTime: entry.elapsed_time,
    }));

    console.log('[SimpleHistory] Loaded from database:', entries.length, 'entries');
    return entries;
  } catch (e) {
    console.error('[SimpleHistory] Failed to load from database after retries:', e);
    return null;
  }
}

// Add entry to database with retry
export async function addSimpleHistoryEntryToDb(
  userId: string,
  entry: Omit<SimpleHistoryEntry, 'id' | 'timestamp'>
): Promise<SimpleHistoryEntry | null> {
  const newEntry: SimpleHistoryEntry = {
    ...entry,
    id: generateSimpleId(),
    timestamp: Date.now(),
  };

  console.log('[SimpleHistory] Saving to database:', { id: newEntry.id, userId: userId.slice(0, 8) + '...' });

  try {
    await withRetry(
      async () => {
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
          console.error('[SimpleHistory] Database insert error:', error.message);
          throw error;
        }
      },
      { maxRetries: 2 }
    );

    console.log('[SimpleHistory] Successfully saved to database:', newEntry.id);
    return newEntry;
  } catch (e) {
    console.error('[SimpleHistory] Failed to add entry to database after retries:', e);
    // Entry is still saved in localStorage as fallback
    return null;
  }
}

// Delete entry from database with retry
export async function deleteSimpleHistoryEntryFromDb(userId: string, id: string): Promise<void> {
  try {
    await withRetry(
      async () => {
        const { error } = await supabase
          .from('simple_history_entries')
          .delete()
          .eq('user_id', userId)
          .eq('id', id);

        if (error) throw error;
      },
      { maxRetries: 2 }
    );
  } catch (e) {
    console.error('Failed to delete simple history entry from database after retries:', e);
  }
}

// Clear all simple history from database with retry
export async function clearSimpleHistoryFromDb(userId: string): Promise<void> {
  try {
    await withRetry(
      async () => {
        const { error } = await supabase
          .from('simple_history_entries')
          .delete()
          .eq('user_id', userId);

        if (error) throw error;
      },
      { maxRetries: 2 }
    );
  } catch (e) {
    console.error('Failed to clear simple history from database after retries:', e);
  }
}
