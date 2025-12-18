// Database operation retry utility with exponential backoff

interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry'>> = {
  maxRetries: 3,
  baseDelayMs: 500,
  maxDelayMs: 5000,
};

/**
 * Wraps an async operation with retry logic using exponential backoff.
 *
 * @param operation - The async function to retry
 * @param options - Configuration for retry behavior
 * @returns The result of the operation
 * @throws The last error if all retries fail
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries, baseDelayMs, maxDelayMs, onRetry } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
        onRetry?.(attempt + 1, lastError);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Checks if an error is likely transient and worth retrying.
 * Useful for deciding whether to use withRetry.
 */
export function isTransientError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  const transientPatterns = [
    'timeout',
    'network',
    'connection',
    'econnreset',
    'econnrefused',
    'fetch failed',
    'failed to fetch',
    '502',
    '503',
    '504',
    'rate limit',
    'too many requests',
  ];

  return transientPatterns.some(pattern => message.includes(pattern));
}

/**
 * Wraps a Supabase query result and throws if there's an error.
 * Makes Supabase queries compatible with withRetry.
 */
export function throwOnError<T>(
  result: { data: T | null; error: { message: string } | null }
): T {
  if (result.error) {
    throw new Error(result.error.message);
  }
  return result.data as T;
}
