import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Sparkles,
  ArrowDown,
  Copy,
  Check,
  Lightbulb,
  HelpCircle,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Grok 4 Fast model ID - fast and reliable for beginners
const BEGINNER_MODEL_ID = "x-ai/grok-4-fast";
const INPUT_STORAGE_KEY = "hyokai-beginner-input-height";
const OUTPUT_STORAGE_KEY = "hyokai-beginner-output-height";

export function BeginnerView() {
  const { t } = useLanguage();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [editedOutput, setEditedOutput] = useState("");
  const [isOutputEdited, setIsOutputEdited] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [elapsedTime, setElapsedTime] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const outputRef = useRef<HTMLTextAreaElement>(null);
  const outputSectionRef = useRef<HTMLDivElement>(null);
  // Ref to always have latest input value (fixes mobile stale closure issues)
  const inputValueRef = useRef(input);
  // Ref to track previous loading state for detecting transformation completion
  const prevLoadingRef = useRef(isLoading);

  // Keep ref in sync with state (ensures callbacks always have latest value)
  useEffect(() => {
    inputValueRef.current = input;
  }, [input]);

  // Sync editedOutput when new output comes from transformation
  useEffect(() => {
    setEditedOutput(output);
    setIsOutputEdited(false);
  }, [output]);

  // Handle post-transformation UX: auto-scroll and auto-copy
  useEffect(() => {
    const wasLoading = prevLoadingRef.current;
    prevLoadingRef.current = isLoading;

    // Check if loading just finished and we have output
    if (wasLoading && !isLoading && output) {
      // Auto-scroll to output section
      if (outputSectionRef.current) {
        outputSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      // Auto-copy to clipboard
      navigator.clipboard.writeText(output).then(() => {
        toast({
          title: t('output.autoCopied'),
          description: t('output.autoCopiedMessage'),
        });
      }).catch(() => {
        // Silently fail - user can manually copy
      });
    }
  }, [isLoading, output, t]);

  // Auto-resize output textarea to fit content
  useEffect(() => {
    const textarea = outputRef.current;
    if (!textarea || !editedOutput) return;

    // Reset height to auto to get accurate scrollHeight
    textarea.style.height = 'auto';
    // Set height to scrollHeight (content height), minimum 140px
    const newHeight = Math.max(textarea.scrollHeight, 140);
    textarea.style.height = `${newHeight}px`;
  }, [editedOutput]);

  // Load saved heights from localStorage
  useEffect(() => {
    const savedInputHeight = localStorage.getItem(INPUT_STORAGE_KEY);
    const savedOutputHeight = localStorage.getItem(OUTPUT_STORAGE_KEY);
    if (savedInputHeight && inputRef.current) {
      inputRef.current.style.height = `${savedInputHeight}px`;
    }
    if (savedOutputHeight && outputRef.current) {
      outputRef.current.style.height = `${savedOutputHeight}px`;
    }
  }, []);

  // Save heights to localStorage on resize
  const handleInputResize = useCallback(() => {
    if (inputRef.current) {
      localStorage.setItem(INPUT_STORAGE_KEY, inputRef.current.offsetHeight.toString());
    }
  }, []);

  const handleOutputResize = useCallback(() => {
    if (outputRef.current) {
      localStorage.setItem(OUTPUT_STORAGE_KEY, outputRef.current.offsetHeight.toString());
    }
  }, []);

  // Use ResizeObserver to detect resize
  useEffect(() => {
    const inputEl = inputRef.current;
    const outputEl = outputRef.current;
    const resizeObserver = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target === inputEl) handleInputResize();
        if (entry.target === outputEl) handleOutputResize();
      });
    });
    if (inputEl) resizeObserver.observe(inputEl);
    if (outputEl) resizeObserver.observe(outputEl);
    return () => resizeObserver.disconnect();
  }, [handleInputResize, handleOutputResize]);

  const handleOutputChange = (value: string) => {
    setEditedOutput(value);
    setIsOutputEdited(value !== output);
  };

  const handleResetOutput = () => {
    setEditedOutput(output);
    setIsOutputEdited(false);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setElapsedTime(0);
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      if (startTimeRef.current) {
        setElapsedTime(Date.now() - startTimeRef.current);
      }
    }, 100);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (startTimeRef.current) {
      setElapsedTime(Date.now() - startTimeRef.current);
    }
  }, []);

  const handleTransform = useCallback(async () => {
    // Use ref to get latest input value (fixes mobile stale closure issues)
    const currentInput = inputValueRef.current;

    if (!currentInput.trim()) {
      toast({
        title: t("beginner.emptyPromptTitle"),
        description: t("beginner.emptyPromptMessage"),
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
          model: BEGINNER_MODEL_ID,
          mode: "prompting",
          beginnerMode: true,
        },
      });

      if (error) {
        throw new Error(error.message || t("beginner.errorGeneric"));
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setOutput(data?.result || t("beginner.noOutput"));
    } catch (error) {
      console.error("Transform error:", error);
      toast({
        title: t("beginner.errorTitle"),
        description: t("beginner.errorMessage"),
        variant: "destructive",
      });
    } finally {
      stopTimer();
      setIsLoading(false);
    }
  }, [startTimer, stopTimer, t]);

  const handleCopy = useCallback(async () => {
    if (!editedOutput) return;
    try {
      await navigator.clipboard.writeText(editedOutput);
      setCopied(true);
      toast({
        title: t("output.copied"),
        description: t("beginner.copiedMessage"),
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: t("beginner.copyError"),
        description: t("beginner.copyErrorMessage"),
        variant: "destructive",
      });
    }
  }, [editedOutput, t]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleTransform();
    }
  };

  const formatTime = (ms: number | null): string => {
    if (ms === null) return "";
    const seconds = ms / 1000;
    return `${seconds.toFixed(1)}s`;
  };

  return (
    <TooltipProvider>
      <div className="space-y-5 sm:space-y-8">
        {/* Step indicator - hero badge */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full frost-glass border border-cb-blue/20 shadow-lg shadow-cb-blue/10">
            <Lightbulb className="w-4 h-4 text-cb-blue" />
            <span className="text-sm font-semibold text-cb-blue">
              {t("beginner.threeSteps")}
            </span>
          </div>
        </div>

        {/* Step 1: Input - Card style */}
        <div className="frost-glass rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-3 sm:space-y-4 shadow-lg">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-cb-blue to-cb-blue-light text-white font-bold text-base sm:text-lg shadow-md shadow-cb-blue/30">
              1
            </div>
            <label className="text-base sm:text-lg font-semibold flex-1">
              {t("beginner.step1Label")}
            </label>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="text-muted-foreground hover:text-cb-blue transition-colors p-1.5 -mr-1.5 rounded-full hover:bg-cb-blue/10"
                  aria-label={t("beginner.step1HelpAria")}
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[260px] sm:max-w-[280px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <p className="text-sm">{t("beginner.step1Tooltip")}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("beginner.inputPlaceholder")}
            disabled={isLoading}
            style={{ minHeight: "160px" }}
            className="resize-y sm:resize text-base sm:text-lg leading-relaxed bg-white/40 dark:bg-slate-900/40 rounded-xl sm:rounded-2xl border-white/50 focus:border-cb-blue/50 focus:ring-2 focus:ring-cb-blue/20 placeholder:text-muted-foreground/50 shadow-inner"
            aria-label={t("beginner.inputAria")}
          />
          <p className="text-xs sm:text-sm text-muted-foreground/70 text-center hidden sm:block">
            {t("beginner.inputHint")}
          </p>
        </div>

        {/* Step 2: Transform Button - Prominent CTA */}
        <div className="flex flex-col items-center gap-3 sm:gap-4 py-2 overflow-visible">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-cb-blue to-cb-blue-light text-white font-bold text-base sm:text-lg shadow-md shadow-cb-blue/30">
              2
            </div>
            <span className="text-base sm:text-lg font-semibold">{t("beginner.step2Label")}</span>
          </div>
          <div className="p-1 overflow-visible">
            {/* Button without Tooltip wrapper - tooltips interfere with mobile touch events */}
            <Button
              size="lg"
              onClick={handleTransform}
              disabled={isLoading || !input.trim()}
              className="min-w-[200px] sm:min-w-[240px] h-12 sm:h-14 text-base sm:text-lg rounded-xl sm:rounded-2xl shadow-xl shadow-cb-blue/30 hover:shadow-cb-blue/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 touch-manipulation"
              aria-label={t("beginner.transformAria")}
              title={t("beginner.transformTooltip")}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>{t("beginner.transforming")}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>{t("beginner.transformButton")}</span>
                </>
              )}
            </Button>
          </div>
          {elapsedTime !== null && (
            <span
              className={`text-xs sm:text-sm tabular-nums ${
                isLoading ? "text-cb-blue animate-pulse" : "text-muted-foreground/60"
              }`}
            >
              {formatTime(elapsedTime)}
            </span>
          )}
        </div>

        {/* Arrow - subtle connector */}
        <div className="flex justify-center py-1">
          <div className="flex flex-col items-center gap-1">
            <div className="w-0.5 h-3 bg-gradient-to-b from-cb-blue/30 to-transparent rounded-full" />
            <ArrowDown className="w-5 h-5 sm:w-6 sm:h-6 text-cb-blue/40" />
            <div className="w-0.5 h-3 bg-gradient-to-t from-cb-blue/30 to-transparent rounded-full" />
          </div>
        </div>

        {/* Step 3: Output - Card style */}
        <div ref={outputSectionRef} className="frost-glass rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-3 sm:space-y-4 shadow-lg">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-cb-blue to-cb-blue-light text-white font-bold text-base sm:text-lg shadow-md shadow-cb-blue/30">
              3
            </div>
            <label className="text-base sm:text-lg font-semibold flex-1">
              {t("beginner.step3Label")}
            </label>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="text-muted-foreground hover:text-cb-blue transition-colors p-1.5 -mr-1.5 rounded-full hover:bg-cb-blue/10"
                  aria-label={t("beginner.step3HelpAria")}
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[260px] sm:max-w-[280px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <p className="text-sm">{t("beginner.step3Tooltip")}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="relative">
            {isLoading ? (
              <div
                className="min-h-[140px] sm:min-h-[180px] p-4 sm:p-5 bg-white/40 dark:bg-slate-900/40 rounded-xl sm:rounded-2xl shadow-inner border border-white/30 flex items-center justify-center"
                role="region"
                aria-live="polite"
              >
                <div className="flex items-center gap-3 text-cb-blue">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span className="font-medium">{t("beginner.generating")}</span>
                </div>
              </div>
            ) : editedOutput ? (
              <>
                <Textarea
                  ref={outputRef}
                  value={editedOutput}
                  onChange={(e) => handleOutputChange(e.target.value)}
                  style={{ minHeight: "140px" }}
                  className="resize-y sm:resize text-base sm:text-lg leading-relaxed bg-white/40 dark:bg-slate-900/40 rounded-xl sm:rounded-2xl border-white/50 focus:border-cb-blue/50 focus:ring-2 focus:ring-cb-blue/20 shadow-inner pr-14"
                  aria-label={t("beginner.outputAria")}
                />
                {/* Stats and edit indicator */}
                <div className="absolute bottom-3 left-4 text-xs text-muted-foreground/70 pointer-events-none flex gap-2">
                  <span>{editedOutput.length} {t("beginner.chars")}</span>
                  {isOutputEdited && <span className="text-cb-blue">{t("beginner.edited")}</span>}
                </div>
                {/* Action buttons */}
                <div className="mt-3 flex justify-center gap-2 sm:flex-row">
                  {isOutputEdited && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleResetOutput}
                      className="h-10 px-3 text-muted-foreground hover:text-foreground"
                      title={t("beginner.resetToOriginal")}
                    >
                      <RotateCcw className="w-4 h-4 mr-1.5" />
                      <span className="text-sm">{t("beginner.reset")}</span>
                    </Button>
                  )}
                  <Button
                    size="lg"
                    onClick={handleCopy}
                    className="gap-2 min-w-[160px] h-11 rounded-xl bg-cb-blue hover:bg-cb-blue-dark text-white shadow-lg shadow-cb-blue/25"
                    aria-label={t("beginner.copyAria")}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span>{t("output.copied")}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span>{t("beginner.copyButton")}</span>
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <div
                className="min-h-[140px] sm:min-h-[180px] p-4 sm:p-5 bg-white/40 dark:bg-slate-900/40 rounded-xl sm:rounded-2xl text-muted-foreground/50 italic shadow-inner border border-white/30 flex items-center justify-center"
                role="region"
                aria-label={t("beginner.outputAria")}
              >
                {t("beginner.outputPlaceholder")}
              </div>
            )}
          </div>
          {editedOutput && !isLoading && (
            <p className="text-xs sm:text-sm text-cb-blue/70 text-center font-medium">
              {t("beginner.outputHint")}
            </p>
          )}
        </div>

        {/* Encouragement message - subtle footer */}
        <div className="text-center px-4 pb-2">
          <p className="text-xs sm:text-sm text-muted-foreground/60 italic leading-relaxed">
            {t("beginner.encouragement")}
          </p>
        </div>
      </div>
    </TooltipProvider>
  );
}
