import { useState, useCallback, useEffect, useRef } from "react";
import { AVAILABLE_MODELS } from "@/lib/models";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useMode } from "@/contexts/ModeContext";
import { useUserContext } from "@/contexts/UserContextContext";

const STORAGE_KEY = "hyokai-selected-model-index";

export function usePromptTransformer() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const { mode } = useMode();
  const { userContext } = useUserContext();
  // Store index instead of ID since multiple models can have same ID (thinking variant)
  const [selectedModelIndex, setSelectedModelIndex] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      const index = stored ? parseInt(stored, 10) : 0;
      return index >= 0 && index < AVAILABLE_MODELS.length ? index : 0;
    }
    return 0;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, selectedModelIndex.toString());
  }, [selectedModelIndex]);

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
    if (!input.trim()) {
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
          userPrompt: input,
          userContext: userContext || undefined,
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
  }, [input, selectedModel, mode, userContext, startTimer, stopTimer]);

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
