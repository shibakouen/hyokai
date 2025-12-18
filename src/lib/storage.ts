// Safe localStorage wrapper with quota handling

const MAX_HISTORY_ENTRIES = 50;
const MAX_SIMPLE_HISTORY_ENTRIES = 30;

interface SetItemResult {
  success: boolean;
  error?: 'quota' | 'unknown';
}

/**
 * Safely writes to localStorage with quota error detection.
 * Returns success status and error type if failed.
 */
export function safeSetItem(key: string, value: string): SetItemResult {
  if (typeof window === 'undefined') {
    return { success: false, error: 'unknown' };
  }

  try {
    localStorage.setItem(key, value);
    return { success: true };
  } catch (e) {
    if (
      e instanceof DOMException &&
      (e.code === 22 ||
        e.name === 'QuotaExceededError' ||
        e.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    ) {
      return { success: false, error: 'quota' };
    }
    console.error(`Failed to write to localStorage key "${key}":`, e);
    return { success: false, error: 'unknown' };
  }
}

/**
 * Safely reads from localStorage with error handling.
 * Returns null on any error.
 */
export function safeGetItem(key: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.error(`Failed to read from localStorage key "${key}":`, e);
    return null;
  }
}

/**
 * Safely removes from localStorage with error handling.
 */
export function safeRemoveItem(key: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    localStorage.removeItem(key);
    return true;
  } catch (e) {
    console.error(`Failed to remove localStorage key "${key}":`, e);
    return false;
  }
}

/**
 * Attempts to save JSON data to localStorage, with automatic trimming on quota error.
 * For arrays, removes oldest entries until save succeeds.
 *
 * @param key - localStorage key
 * @param data - Data to save (will be JSON stringified)
 * @param maxEntries - For arrays, the maximum number of entries to keep
 * @returns The saved data (possibly trimmed)
 */
export function safeSetJSON<T>(key: string, data: T, maxEntries?: number): T {
  // First, trim to max entries if it's an array
  let trimmedData = data;
  if (Array.isArray(data) && maxEntries && data.length > maxEntries) {
    trimmedData = data.slice(0, maxEntries) as T;
  }

  const result = safeSetItem(key, JSON.stringify(trimmedData));

  if (result.success) {
    return trimmedData;
  }

  if (result.error === 'quota' && Array.isArray(trimmedData)) {
    // Try progressively removing items until it fits
    let reducedData = [...trimmedData];
    while (reducedData.length > 0) {
      // Remove the oldest entry (last item, assuming newest-first order)
      reducedData = reducedData.slice(0, -1);
      const retryResult = safeSetItem(key, JSON.stringify(reducedData));
      if (retryResult.success) {
        console.warn(
          `localStorage quota exceeded for "${key}". Trimmed to ${reducedData.length} entries.`
        );
        return reducedData as T;
      }
    }
    // Even empty array failed - storage is completely full
    console.error(`localStorage completely full. Could not save to "${key}".`);
  }

  return trimmedData;
}

/**
 * Safely reads and parses JSON from localStorage.
 * Returns defaultValue on any error.
 */
export function safeGetJSON<T>(key: string, defaultValue: T): T {
  const raw = safeGetItem(key);
  if (raw === null) {
    return defaultValue;
  }

  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    console.error(`Failed to parse JSON from localStorage key "${key}":`, e);
    return defaultValue;
  }
}

/**
 * Trims history entries to make room for new entries.
 * Removes oldest entries first.
 */
export function trimHistoryForQuota(key: string, entries: unknown[]): unknown[] {
  const maxEntries =
    key === 'hyokai-simple-history' ? MAX_SIMPLE_HISTORY_ENTRIES : MAX_HISTORY_ENTRIES;
  return safeSetJSON(key, entries, maxEntries);
}

/**
 * Check if localStorage is available and writable.
 */
export function isStorageAvailable(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get approximate localStorage usage.
 */
export function getStorageUsage(): { used: number; available: number; percentage: number } {
  if (typeof window === 'undefined') {
    return { used: 0, available: 0, percentage: 0 };
  }

  try {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          total += key.length + value.length;
        }
      }
    }
    // Assume 5MB limit (common for most browsers)
    const limit = 5 * 1024 * 1024;
    return {
      used: total * 2, // UTF-16 encoding
      available: limit - total * 2,
      percentage: Math.round((total * 2 / limit) * 100),
    };
  } catch {
    return { used: 0, available: 0, percentage: 0 };
  }
}
