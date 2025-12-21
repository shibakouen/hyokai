import { useState, useCallback, useEffect, useRef } from "react";
import { AVAILABLE_MODELS } from "@/lib/models";
import { supabase, anonSupabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useMode } from "@/contexts/ModeContext";
import { useUserContext } from "@/contexts/UserContextContext";
import { useGitContext } from "@/hooks/useGitContext";
import { useAuth } from "@/contexts/AuthContext";
import { useUsage } from "@/contexts/UsageContext";

const STORAGE_KEY = "hyokai-selected-model-index";
const ANON_TRANSFORM_COUNT_KEY = "hyokai-anon-transform-count";
const ANON_TRANSFORM_LIMIT = 2;
const PENDING_REQUEST_KEY = "hyokai-pending-transformation";

// Helper to add timeout to promises
function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), ms)
    )
  ]);
}

export function usePromptTransformer() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  // Ref to always have latest input value (fixes mobile stale closure issues)
  const inputValueRef = useRef(input);
  const { mode } = useMode();
  const { userContext } = useUserContext();
  const { gitContext } = useGitContext();
  const { isAuthenticated, user, session } = useAuth();
  const { updateRemaining, getSessionId, refreshUsage } = useUsage();

  // Track if we've loaded from database
  const [hasLoadedFromDb, setHasLoadedFromDb] = useState(false);

  // Store index instead of ID since multiple models can have same ID (thinking variant)
  const [selectedModelIndex, setSelectedModelIndex] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      const index = stored ? parseInt(stored, 10) : 0;
      return index >= 0 && index < AVAILABLE_MODELS.length ? index : 0;
    }
    return 0;
  });

  // Load from database when authenticated
  useEffect(() => {
    if (!isAuthenticated || !user || hasLoadedFromDb) return;

    const loadFromDatabase = async () => {
      // Add timeout to prevent infinite loading
      const DB_TIMEOUT_MS = 30000;
      const timeoutId = setTimeout(() => {
        console.warn('PromptTransformer database load timed out');
        setHasLoadedFromDb(true);
      }, DB_TIMEOUT_MS);

      try {
        // Use maybeSingle() to avoid errors when no row exists
        const { data, error } = await supabase
          .from('user_preferences')
          .select('selected_model_index')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!error && data?.selected_model_index !== null && data?.selected_model_index !== undefined) {
          const index = data.selected_model_index;
          if (index >= 0 && index < AVAILABLE_MODELS.length) {
            setSelectedModelIndex(index);
          }
        }
        clearTimeout(timeoutId);
        setHasLoadedFromDb(true);
      } catch (e) {
        console.error('Failed to load model preference:', e);
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

  // Persist to localStorage (always)
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, selectedModelIndex.toString());
  }, [selectedModelIndex]);

  // Sync to database when model changes (for authenticated users)
  useEffect(() => {
    if (!isAuthenticated || !user || !hasLoadedFromDb) return;

    const syncToDatabase = async () => {
      try {
        await supabase
          .from('user_preferences')
          .upsert({ user_id: user.id, selected_model_index: selectedModelIndex });
      } catch (e) {
        console.error('Failed to sync model preference:', e);
      }
    };

    const timeout = setTimeout(syncToDatabase, 500);
    return () => clearTimeout(timeout);
  }, [isAuthenticated, user, hasLoadedFromDb, selectedModelIndex]);

  // Keep ref in sync with state (ensures callbacks always have latest value)
  useEffect(() => {
    inputValueRef.current = input;
  }, [input]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Warn user if they try to leave during transformation
  useEffect(() => {
    if (!isLoading) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const message = "A transformation is in progress. If you leave now, your request may be lost.";
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isLoading]);

  // Check for interrupted transformation on mount
  useEffect(() => {
    const pendingData = localStorage.getItem(PENDING_REQUEST_KEY);
    if (pendingData) {
      try {
        const pending = JSON.parse(pendingData);
        const startedAt = new Date(pending.startedAt).getTime();
        const now = Date.now();
        const ageMinutes = (now - startedAt) / 1000 / 60;

        // If pending request is less than 5 minutes old, warn user
        if (ageMinutes < 5) {
          toast({
            title: "Transformation was interrupted",
            description: `Your last transformation using ${pending.model} was interrupted. The API credits may have been used. Consider waiting before retrying.`,
            variant: "destructive",
          });
        }
        // Clear stale pending request
        localStorage.removeItem(PENDING_REQUEST_KEY);
      } catch {
        localStorage.removeItem(PENDING_REQUEST_KEY);
      }
    }
  }, []);

  const startTimer = useCallback(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Reset and start
    setElapsedTime(0);
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      if (startTimeRef.current) {
        setElapsedTime(Date.now() - startTimeRef.current);
      }
    }, 100); // Update every 100ms for smooth display
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    // Final elapsed time calculation
    if (startTimeRef.current) {
      setElapsedTime(Date.now() - startTimeRef.current);
    }
  }, []);

  const selectedModel = AVAILABLE_MODELS[selectedModelIndex];

  const transform = useCallback(async () => {
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

    setIsLoading(true);
    setOutput("");
    startTimer();

    // Store pending request state for recovery
    localStorage.setItem(PENDING_REQUEST_KEY, JSON.stringify({
      startedAt: new Date().toISOString(),
      model: selectedModel.name,
      inputPreview: currentInput.substring(0, 100),
    }));

    try {
      // Get session ID for anonymous tracking
      const sessionId = !isAuthenticated ? getSessionId() : undefined;

      // Build request options with auth header if authenticated
      const requestOptions: { body: Record<string, unknown>; headers?: Record<string, string> } = {
        body: {
          userPrompt: currentInput,
          userContext: userContext || undefined,
          gitContext: gitContext || undefined,
          model: selectedModel.id,
          mode: mode,
          thinking: selectedModel.thinking || false,
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
        "Request timed out. The AI model is taking too long. Please try again or select a faster model."
      );

      if (error) {
        throw new Error(error.message || "Failed to transform prompt");
      }

      // Handle rate limit errors
      if (data?.code === "RATE_LIMIT_EXCEEDED") {
        toast({
          title: "Rate limit exceeded",
          description: data.error || "You have reached your usage limit. Please try again later.",
          variant: "destructive",
        });
        // Update the UI with remaining tokens
        if (data.dailyRemaining !== undefined || data.monthlyRemaining !== undefined) {
          updateRemaining(
            data.dailyRemaining ?? -1,
            data.monthlyRemaining ?? -1,
            false
          );
        }
        return;
      }

      // Handle premium model access errors
      if (data?.code === "PLAN_UPGRADE_REQUIRED") {
        toast({
          title: "Plan upgrade required",
          description: data.premiumAccess?.message || `This model requires a ${data.premiumAccess?.requiredPlan || 'higher'} plan.`,
          variant: "destructive",
        });
        return;
      }

      if (data?.code === "PREMIUM_LIMIT_REACHED") {
        const remaining = data.premiumAccess?.remaining ?? 0;
        const limit = data.premiumAccess?.monthlyLimit ?? 0;
        toast({
          title: "Model limit reached",
          description: data.premiumAccess?.message || `You've used all ${limit} monthly uses of this premium model.`,
          variant: "destructive",
        });
        return;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setOutput(data?.result || "No output received");

      // Increment anonymous user transform count after successful transformation
      if (!isAuthenticated) {
        const storedCount = localStorage.getItem(ANON_TRANSFORM_COUNT_KEY);
        const count = storedCount ? parseInt(storedCount, 10) : 0;
        localStorage.setItem(ANON_TRANSFORM_COUNT_KEY, (count + 1).toString());
      }

      // Update usage stats from response
      if (data?.usage) {
        updateRemaining(
          data.usage.dailyRemaining ?? -1,
          data.usage.monthlyRemaining ?? -1,
          data.usage.isUnlimited ?? false
        );
      }
    } catch (error) {
      console.error("Transform error:", error);
      toast({
        title: "Transformation failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      // Clear pending request state - transformation completed (success or failure)
      localStorage.removeItem(PENDING_REQUEST_KEY);
      stopTimer();
      setIsLoading(false);
    }
  }, [selectedModel, mode, userContext, gitContext, startTimer, stopTimer, isAuthenticated, session, getSessionId, updateRemaining]);

  return {
    input,
    setInput,
    output,
    setOutput,
    isLoading,
    elapsedTime,
    selectedModelIndex,
    setSelectedModelIndex,
    transform,
  };
}
