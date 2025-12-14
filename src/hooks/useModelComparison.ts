import { useState, useCallback, useRef } from "react";
import { AVAILABLE_MODELS, AIModel } from "@/lib/models";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useMode } from "@/contexts/ModeContext";

const STORAGE_KEY = "hyokai-compare-model-indices";

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
  const [isCompareMode, setIsCompareMode] = useState(false);
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
  const startTimesRef = useRef<Map<number, number>>(new Map());
  const timersRef = useRef<Map<number, NodeJS.Timeout>>(new Map());

  // Persist selected indices
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

  // Transform a single model
  const transformWithModel = useCallback(async (
    modelIndex: number,
    userPrompt: string,
    currentMode: string
  ): Promise<{ output: string | null; error: string | null }> => {
    const model = AVAILABLE_MODELS[modelIndex];

    try {
      const { data, error } = await supabase.functions.invoke("transform-prompt", {
        body: {
          userPrompt,
          model: model.id,
          mode: currentMode,
          thinking: model.thinking || false,
        },
      });

      if (error) {
        return { output: null, error: error.message || "Failed to transform" };
      }

      if (data?.error) {
        return { output: null, error: data.error };
      }

      return { output: data?.result || "No output received", error: null };
    } catch (err) {
      return {
        output: null,
        error: err instanceof Error ? err.message : "Unknown error"
      };
    }
  }, []);

  // Run comparison
  const compare = useCallback(async () => {
    if (!input.trim()) {
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

    // Run all transformations concurrently
    const promises = selectedIndices.map(async (index) => {
      const result = await transformWithModel(index, input, mode);
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

    await Promise.all(promises);
    setIsLoading(false);
  }, [input, selectedIndices, mode, transformWithModel, clearAllTimers]);

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
