import { useState, useCallback, useRef, useEffect } from "react";
import { AVAILABLE_MODELS, AIModel } from "@/lib/models";
import { supabase, anonSupabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useMode } from "@/contexts/ModeContext";
import { useUserContext } from "@/contexts/UserContextContext";
import { useAuth } from "@/contexts/AuthContext";
import { useUsage } from "@/contexts/UsageContext";

const STORAGE_KEY = "hyokai-compare-model-indices";
const ANON_TRANSFORM_COUNT_KEY = "hyokai-anon-transform-count";
const ANON_TRANSFORM_LIMIT = 2;

// Helper to add timeout to promises
function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), ms)
    )
  ]);
}

// Helper to delay execution
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Check if error is retryable (transient)
function isRetryableError(error: string): boolean {
  const retryablePatterns = [
    'timed out',
    'timeout',
    'rate limit',
    '429',
    '502',
    '503',
    '504',
    'network',
    'fetch failed',
    'connection',
    'ECONNRESET',
    'socket hang up',
  ];
  const lowerError = error.toLowerCase();
  return retryablePatterns.some(pattern => lowerError.includes(pattern.toLowerCase()));
}

export interface ComparisonResult {
  modelIndex: number;
  model: AIModel;
  output: string | null;
  error: string | null;
  elapsedTime: number | null;
  isLoading: boolean;
}

export function useModelComparison() {
  const [input, setInput] = useState("");
  // Ref to always have latest input value (fixes mobile stale closure issues)
  const inputValueRef = useRef(input);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const { isAuthenticated, user, session } = useAuth();
  const { updateRemaining, getSessionId } = useUsage();
  const [hasLoadedFromDb, setHasLoadedFromDb] = useState(false);

  const [selectedIndices, setSelectedIndices] = useState<number[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length >= 2) {
            return parsed.filter((i: number) => i >= 0 && i < AVAILABLE_MODELS.length);
          }
        } catch {
          // Invalid stored value
        }
      }
    }
    // Default: first two models
    return [0, 2]; // Gemini 3 Pro and Claude Sonnet 4.5
  });
  const [results, setResults] = useState<ComparisonResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { mode } = useMode();
  const { userContext } = useUserContext();
  const startTimesRef = useRef<Map<number, number>>(new Map());
  const timersRef = useRef<Map<number, NodeJS.Timeout>>(new Map());

  // Load from database when authenticated
  useEffect(() => {
    if (!isAuthenticated || !user || hasLoadedFromDb) return;

    const loadFromDatabase = async () => {
      // Add timeout to prevent infinite loading
      const DB_TIMEOUT_MS = 30000;
      const timeoutId = setTimeout(() => {
        console.warn('ModelComparison database load timed out');
        setHasLoadedFromDb(true);
      }, DB_TIMEOUT_MS);

      try {
        // Use maybeSingle() to avoid errors when no row exists
        const { data, error } = await supabase
          .from('user_preferences')
          .select('compare_model_indices')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!error && data?.compare_model_indices) {
          const indices = data.compare_model_indices as number[];
          if (Array.isArray(indices) && indices.length >= 2) {
            const validIndices = indices.filter(i => i >= 0 && i < AVAILABLE_MODELS.length);
            if (validIndices.length >= 2) {
              setSelectedIndices(validIndices);
            }
          }
        }
        clearTimeout(timeoutId);
        setHasLoadedFromDb(true);
      } catch (e) {
        console.error('Failed to load compare indices:', e);
        clearTimeout(timeoutId);
        setHasLoadedFromDb(true);
      }
    };

    loadFromDatabase();
  }, [isAuthenticated, user, hasLoadedFromDb]);

  // Reset loaded flag when user changes
  useEffect(() => {
    if (!isAuthenticated) {
      setHasLoadedFromDb(false);
    }
  }, [isAuthenticated]);

  // Sync to database when indices change (for authenticated users)
  useEffect(() => {
    if (!isAuthenticated || !user || !hasLoadedFromDb) return;

    const syncToDatabase = async () => {
      try {
        await supabase
          .from('user_preferences')
          .upsert({ user_id: user.id, compare_model_indices: selectedIndices });
      } catch (e) {
        console.error('Failed to sync compare indices:', e);
      }
    };

    const timeout = setTimeout(syncToDatabase, 500);
    return () => clearTimeout(timeout);
  }, [isAuthenticated, user, hasLoadedFromDb, selectedIndices]);

  // Keep ref in sync with state (ensures callbacks always have latest value)
  useEffect(() => {
    inputValueRef.current = input;
  }, [input]);

  // Persist selected indices to localStorage (always)
  const updateSelectedIndices = useCallback((indices: number[]) => {
    setSelectedIndices(indices);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(indices));
  }, []);

  // Toggle a model selection
  const toggleModel = useCallback((index: number) => {
    setSelectedIndices(prev => {
      let newIndices: number[];
      if (prev.includes(index)) {
        // Remove if already selected (but keep minimum of 2)
        if (prev.length <= 2) {
          toast({
            title: "Minimum 2 models",
            description: "You need at least 2 models for comparison.",
            variant: "destructive",
          });
          return prev;
        }
        newIndices = prev.filter(i => i !== index);
      } else {
        // Add if not at max (4)
        if (prev.length >= 4) {
          toast({
            title: "Maximum 4 models",
            description: "You can compare up to 4 models at once.",
            variant: "destructive",
          });
          return prev;
        }
        newIndices = [...prev, index].sort((a, b) => a - b);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newIndices));
      return newIndices;
    });
  }, []);

  // Clear all timers
  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach((timer) => clearInterval(timer));
    timersRef.current.clear();
    startTimesRef.current.clear();
  }, []);

  // Transform a single model with retry logic
  const transformWithModel = useCallback(async (
    modelIndex: number,
    userPrompt: string,
    currentMode: string,
    currentUserContext: string
  ): Promise<{ output: string | null; error: string | null }> => {
    const model = AVAILABLE_MODELS[modelIndex];
    const MAX_RETRIES = 2;
    const BASE_DELAY_MS = 1000; // 1 second base delay for exponential backoff

    let lastError: string | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Add exponential backoff delay before retries (not before first attempt)
        if (attempt > 0) {
          const backoffDelay = BASE_DELAY_MS * Math.pow(2, attempt - 1); // 1s, 2s
          console.log(`[Compare] Retry ${attempt}/${MAX_RETRIES} for ${model.name} after ${backoffDelay}ms`);
          await delay(backoffDelay);
        }

        // Get session ID for anonymous tracking
        const sessionId = !isAuthenticated ? getSessionId() : undefined;

        // Build request options with auth header if authenticated
        const requestOptions: { body: Record<string, unknown>; headers?: Record<string, string> } = {
          body: {
            userPrompt,
            userContext: currentUserContext || undefined,
            model: model.id,
            mode: currentMode,
            thinking: model.thinking || false,
            sessionId,
          },
        };

        // Add auth header if we have a session
        if (session?.access_token) {
          requestOptions.headers = {
            Authorization: `Bearer ${session.access_token}`,
          };
        }

        // Add 180 second timeout as fallback (Supabase client has 150s timeout for Edge Functions)
        // AI models can take 30-120+ seconds, especially "thinking" variants
        // Use anonSupabase to bypass auth session handling that can hang
        const { data, error } = await withTimeout(
          anonSupabase.functions.invoke("transform-prompt", requestOptions),
          180000,
          "Request timed out. The model is taking too long to respond."
        );

        if (error) {
          const errorMsg = error.message || "Failed to transform";
          lastError = errorMsg;

          // Only retry on transient errors
          if (attempt < MAX_RETRIES && isRetryableError(errorMsg)) {
            console.warn(`[Compare] Retryable error for ${model.name}: ${errorMsg}`);
            continue;
          }
          return { output: null, error: errorMsg };
        }

        // Handle rate limit errors
        if (data?.code === "RATE_LIMIT_EXCEEDED") {
          // Update the UI with remaining tokens
          if (data.dailyRemaining !== undefined || data.monthlyRemaining !== undefined) {
            updateRemaining(
              data.dailyRemaining ?? -1,
              data.monthlyRemaining ?? -1,
              false
            );
          }
          return { output: null, error: data.error || "Rate limit exceeded" };
        }

        if (data?.error) {
          lastError = data.error;

          // Only retry on transient errors
          if (attempt < MAX_RETRIES && isRetryableError(data.error)) {
            console.warn(`[Compare] Retryable error for ${model.name}: ${data.error}`);
            continue;
          }
          return { output: null, error: data.error };
        }

        // Success!
        if (attempt > 0) {
          console.log(`[Compare] ${model.name} succeeded on retry ${attempt}`);
        }

        // Update usage stats from response
        if (data?.usage) {
          updateRemaining(
            data.usage.dailyRemaining ?? -1,
            data.usage.monthlyRemaining ?? -1,
            data.usage.isUnlimited ?? false
          );
        }

        return { output: data?.result || "No output received", error: null };

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        lastError = errorMsg;

        // Only retry on transient errors
        if (attempt < MAX_RETRIES && isRetryableError(errorMsg)) {
          console.warn(`[Compare] Retryable exception for ${model.name}: ${errorMsg}`);
          continue;
        }
        return { output: null, error: errorMsg };
      }
    }

    // All retries exhausted
    return {
      output: null,
      error: `Failed after ${MAX_RETRIES + 1} attempts: ${lastError}`
    };
  }, [isAuthenticated, session, getSessionId, updateRemaining]);

  // Run comparison
  const compare = useCallback(async () => {
    // Use ref to get latest input value (fixes mobile stale closure issues)
    const currentInput = inputValueRef.current;

    if (!currentInput.trim()) {
      toast({
        title: "Empty input",
        description: "Please enter a prompt to transform.",
        variant: "destructive",
      });
      return;
    }

    if (selectedIndices.length < 2) {
      toast({
        title: "Select more models",
        description: "Please select at least 2 models to compare.",
        variant: "destructive",
      });
      return;
    }

    // Check anonymous user rate limit (2 free transformations)
    if (!isAuthenticated) {
      const storedCount = localStorage.getItem(ANON_TRANSFORM_COUNT_KEY);
      const count = storedCount ? parseInt(storedCount, 10) : 0;

      if (count >= ANON_TRANSFORM_LIMIT) {
        toast({
          title: "Free limit reached",
          description: "Sign up to continue transforming prompts. It's free!",
          variant: "destructive",
        });
        return;
      }
    }

    // Clear previous timers
    clearAllTimers();
    setIsLoading(true);

    // Initialize results with loading state
    const initialResults: ComparisonResult[] = selectedIndices.map(index => ({
      modelIndex: index,
      model: AVAILABLE_MODELS[index],
      output: null,
      error: null,
      elapsedTime: 0,
      isLoading: true,
    }));
    setResults(initialResults);

    // Start timers for each model
    selectedIndices.forEach(index => {
      startTimesRef.current.set(index, Date.now());
      const timer = setInterval(() => {
        const startTime = startTimesRef.current.get(index);
        if (startTime) {
          setResults(prev => prev.map(r =>
            r.modelIndex === index
              ? { ...r, elapsedTime: Date.now() - startTime }
              : r
          ));
        }
      }, 100);
      timersRef.current.set(index, timer);
    });

    // Run all transformations with staggered starts to avoid rate limiting
    // Small delay between starting each request reduces simultaneous load
    const STAGGER_DELAY_MS = 200; // 200ms between each model start

    const promises = selectedIndices.map(async (index, position) => {
      // Stagger the start of each request
      if (position > 0) {
        await delay(position * STAGGER_DELAY_MS);
      }

      const result = await transformWithModel(index, currentInput, mode, userContext);
      const startTime = startTimesRef.current.get(index);
      const finalTime = startTime ? Date.now() - startTime : null;

      // Stop this model's timer
      const timer = timersRef.current.get(index);
      if (timer) {
        clearInterval(timer);
        timersRef.current.delete(index);
      }

      // Update this specific result
      setResults(prev => prev.map(r =>
        r.modelIndex === index
          ? {
              ...r,
              output: result.output,
              error: result.error,
              elapsedTime: finalTime,
              isLoading: false,
            }
          : r
      ));

      return { index, ...result, elapsedTime: finalTime };
    });

    const results = await Promise.all(promises);

    // Increment anonymous user transform count if any transformation succeeded
    const anySuccess = results.some(r => r.output !== null);
    if (!isAuthenticated && anySuccess) {
      const storedCount = localStorage.getItem(ANON_TRANSFORM_COUNT_KEY);
      const count = storedCount ? parseInt(storedCount, 10) : 0;
      localStorage.setItem(ANON_TRANSFORM_COUNT_KEY, (count + 1).toString());
    }

    setIsLoading(false);
  }, [selectedIndices, mode, userContext, transformWithModel, clearAllTimers, isAuthenticated]);

  // Reset comparison
  const resetComparison = useCallback(() => {
    clearAllTimers();
    setResults([]);
    setIsLoading(false);
  }, [clearAllTimers]);

  return {
    input,
    setInput,
    isCompareMode,
    setIsCompareMode,
    selectedIndices,
    toggleModel,
    updateSelectedIndices,
    results,
    setResults,
    isLoading,
    compare,
    resetComparison,
  };
}
