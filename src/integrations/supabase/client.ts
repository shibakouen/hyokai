import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Create Supabase client with custom fetch that has timeouts
const fetchWithTimeout = (url: RequestInfo | URL, options?: RequestInit): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

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
