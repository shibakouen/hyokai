import { useState, useCallback, useEffect, useRef } from "react";
import { AVAILABLE_MODELS } from "@/lib/models";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useMode } from "@/contexts/ModeContext";
import { useUserContext } from "@/contexts/UserContextContext";
import { useGitContext } from "@/hooks/useGitContext";
import { useAuth } from "@/contexts/AuthContext";

const STORAGE_KEY = "hyokai-selected-model-index";

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
  const { isAuthenticated, user } = useAuth();

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
      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('selected_model_index')
          .eq('user_id', user.id)
          .single();

        if (!error && data?.selected_model_index !== null && data?.selected_model_index !== undefined) {
          const index = data.selected_model_index;
          if (index >= 0 && index < AVAILABLE_MODELS.length) {
            setSelectedModelIndex(index);
          }
        }
        setHasLoadedFromDb(true);
      } catch (e) {
        console.error('Failed to load model preference:', e);
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

    setIsLoading(true);
    setOutput("");
    startTimer();

    try {
      const { data, error } = await supabase.functions.invoke("transform-prompt", {
        body: {
          userPrompt: currentInput,
          userContext: userContext || undefined,
          gitContext: gitContext || undefined,
          model: selectedModel.id,
          mode: mode,
          thinking: selectedModel.thinking || false,
        },
      });

      if (error) {
        throw new Error(error.message || "Failed to transform prompt");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setOutput(data?.result || "No output received");
    } catch (error) {
      console.error("Transform error:", error);
      toast({
        title: "Transformation failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      stopTimer();
      setIsLoading(false);
    }
  }, [selectedModel, mode, userContext, gitContext, startTimer, stopTimer]);

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
