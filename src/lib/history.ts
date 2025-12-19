// History types and localStorage utilities
import { supabase } from '@/integrations/supabase/client';
import { withRetry } from '@/lib/dbRetry';
import { safeSetJSON, safeGetJSON } from '@/lib/storage';

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
const SYNC_QUEUE_KEY = 'hyokai-sync-queue';
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

// Save history to localStorage (with quota handling)
export function saveHistory(entries: HistoryEntry[]): void {
  if (typeof window === 'undefined') return;

  // Use safe storage with automatic trimming on quota exceeded
  safeSetJSON(STORAGE_KEY, entries, MAX_HISTORY_ENTRIES);
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

// ============================================
// Sync Queue Management
// ============================================

export function getSyncQueue(): HistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(SYNC_QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addToSyncQueue(entry: HistoryEntry) {
  if (typeof window === 'undefined') return;
  const queue = getSyncQueue();
  if (!queue.some(e => e.id === entry.id)) {
    queue.push(entry);
    safeSetJSON(SYNC_QUEUE_KEY, queue, 20); // Keep last 20 failed syncs
  }
}

export function removeFromSyncQueue(id: string) {
  if (typeof window === 'undefined') return;
  const queue = getSyncQueue();
  const filtered = queue.filter(e => e.id !== id);
  safeSetJSON(SYNC_QUEUE_KEY, filtered, 20);
}

export async function processSyncQueue(userId: string) {
  const queue = getSyncQueue();
  if (queue.length === 0) return;

  console.log(`[Sync] Processing queue for user ${userId.slice(0, 8)} (${queue.length} items)`);

  for (const entry of queue) {
    const success = await saveHistoryEntryToDb(userId, entry, false);
    if (success) {
      removeFromSyncQueue(entry.id);
    }
  }
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

// ============================================
// Database sync functions (for authenticated users)
// ============================================

// Load history from database with retry
export async function loadHistoryFromDb(userId: string): Promise<HistoryEntry[] | null> {
  console.log('[History] Loading from database for user:', userId.slice(0, 8) + '...');

  try {
    const data = await withRetry(
      async () => {
        const { data, error } = await supabase
          .from('history_entries')
          .select('*')
          .eq('user_id', userId)
          .order('timestamp', { ascending: false })
          .limit(MAX_HISTORY_ENTRIES);

        if (error) {
          console.error('[History] Database select error:', error.message);
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
      taskMode: entry.task_mode as 'coding' | 'prompting',
      result: entry.result_data as unknown as SingleModelResult | CompareModelResult,
    }));

    console.log('[History] Loaded from database:', entries.length, 'entries');
    return entries;
  } catch (e) {
    console.error('[History] Failed to load from database after retries:', e);
    return null;
  }
}

// Save an existing entry to database (preserves ID) with retry
export async function saveHistoryEntryToDb(
  userId: string,
  entry: HistoryEntry,
  autoQueue: boolean = true
): Promise<boolean> {
  console.log('[History] Saving to database:', { id: entry.id, userId: userId.slice(0, 8) + '...' });

  try {
    const result = await withRetry(
      async () => {
        const { error } = await supabase
          .from('history_entries')
          .insert({
            id: entry.id,
            user_id: userId,
            timestamp: new Date(entry.timestamp).toISOString(),
            input: entry.input,
            task_mode: entry.taskMode,
            result_data: entry.result as any,
          });

        if (error) {
          // Ignore duplicate key errors (entry already exists)
          if (error.code === '23505') {
            console.log('[History] Entry already exists in database:', entry.id);
            return true;
          }
          console.error('[History] Database insert error:', error.message);
          throw error;
        }
        return true;
      },
      { maxRetries: 2 }
    );

    console.log('[History] Successfully saved to database:', entry.id);
    return true;
  } catch (e) {
    console.error('[History] Failed to save entry to database after retries:', e);

    // Add to sync queue for later retry if specified
    if (autoQueue) {
      console.log('[History] Adding to sync queue for retry:', entry.id);
      addToSyncQueue(entry);
    }

    return false;
  }
}

// Add entry to database with retry (generates new ID - DEPRECATED, use saveHistoryEntryToDb)
export async function addHistoryEntryToDb(
  userId: string,
  entry: Omit<HistoryEntry, 'id' | 'timestamp'>
): Promise<HistoryEntry | null> {
  const newEntry: HistoryEntry = {
    ...entry,
    id: generateId(),
    timestamp: Date.now(),
  };

  const success = await saveHistoryEntryToDb(userId, newEntry);
  return success ? newEntry : null;
}

// Delete entry from database with retry
export async function deleteHistoryEntryFromDb(userId: string, id: string): Promise<void> {
  try {
    await withRetry(
      async () => {
        const { error } = await supabase
          .from('history_entries')
          .delete()
          .eq('user_id', userId)
          .eq('id', id);

        if (error) throw error;
      },
      { maxRetries: 2 }
    );
  } catch (e) {
    console.error('Failed to delete history entry from database after retries:', e);
  }
}

// Clear all history from database with retry
export async function clearHistoryFromDb(userId: string): Promise<void> {
  try {
    await withRetry(
      async () => {
        const { error } = await supabase
          .from('history_entries')
          .delete()
          .eq('user_id', userId);

        if (error) throw error;
      },
      { maxRetries: 2 }
    );
  } catch (e) {
    console.error('Failed to clear history from database after retries:', e);
  }
}
