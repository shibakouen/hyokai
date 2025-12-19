import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Timeout values for different request types
const DB_TIMEOUT_MS = 30000;  // 30 seconds for database operations
const EDGE_FUNCTION_TIMEOUT_MS = 150000;  // 150 seconds (2.5 min) for Edge Functions

// AI model API calls through Edge Functions can take 30-120+ seconds,
// especially for "thinking" models or during high load. The Edge Function
// itself has a 120-second timeout for OpenRouter API calls.

// Create custom fetch with dynamic timeout based on URL
const fetchWithTimeout = (url: RequestInfo | URL, options?: RequestInit): Promise<Response> => {
  const controller = new AbortController();

  // Use longer timeout for Edge Function calls (they call external AI APIs)
  const urlString = url instanceof Request ? url.url : url.toString();
  const isEdgeFunction = urlString.includes('/functions/v1/');
  const timeoutMs = isEdgeFunction ? EDGE_FUNCTION_TIMEOUT_MS : DB_TIMEOUT_MS;

  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, {
    ...options,
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));
};

// Main Supabase client with authentication
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    fetch: fetchWithTimeout,
  },
});

// Anonymous Supabase client for edge functions that don't require auth
// This bypasses session handling which can hang when auth state is corrupted
// Uses custom storage key to avoid "Multiple GoTrueClient instances" warning
export const anonSupabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
    storageKey: 'sb-anon-auth-token', // Different key to avoid conflict with main client
    storage: {
      // No-op storage since we don't persist sessions for anon client
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    },
  },
  global: {
    fetch: fetchWithTimeout,
  },
});
