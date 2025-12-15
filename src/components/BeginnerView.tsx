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
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Grok 4 Fast model ID - fast and reliable for beginners
const BEGINNER_MODEL_ID = "x-ai/grok-4-fast";

export function BeginnerView() {
  const { t } = useLanguage();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [elapsedTime, setElapsedTime] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

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
    if (!input.trim()) {
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
          userPrompt: input,
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
  }, [input, startTimer, stopTimer, t]);

  const handleCopy = useCallback(async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
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
  }, [output, t]);

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
      <div className="space-y-8">
        {/* Step indicator */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <Lightbulb className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              {t("beginner.threeSteps")}
            </span>
          </div>
        </div>

        {/* Step 1: Input */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-lg">
              1
            </div>
            <label className="text-lg font-semibold">
              {t("beginner.step1Label")}
            </label>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={t("beginner.step1HelpAria")}
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[280px]">
                <p className="text-sm">{t("beginner.step1Tooltip")}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("beginner.inputPlaceholder")}
            disabled={isLoading}
            className="min-h-[140px] text-lg leading-relaxed resize-none frost-glass rounded-2xl border-white/30 focus:border-white/60 placeholder:text-muted-foreground/60"
            aria-label={t("beginner.inputAria")}
          />
          <p className="text-sm text-muted-foreground text-center">
            {t("beginner.inputHint")}
          </p>
        </div>

        {/* Step 2: Transform Button */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-lg">
              2
            </div>
            <span className="text-lg font-semibold">{t("beginner.step2Label")}</span>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="lg"
                onClick={handleTransform}
                disabled={isLoading || !input.trim()}
                className="min-w-[220px] h-14 text-lg"
                aria-label={t("beginner.transformAria")}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    {t("beginner.transforming")}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    {t("beginner.transformButton")}
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-sm">{t("beginner.transformTooltip")}</p>
            </TooltipContent>
          </Tooltip>
          {elapsedTime !== null && (
            <span
              className={`text-sm tabular-nums ${
                isLoading ? "text-muted-foreground animate-pulse" : "text-muted-foreground/70"
              }`}
            >
              {formatTime(elapsedTime)}
            </span>
          )}
        </div>

        {/* Arrow */}
        <div className="flex justify-center">
          <ArrowDown className="w-6 h-6 text-muted-foreground/50" />
        </div>

        {/* Step 3: Output */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-lg">
              3
            </div>
            <label className="text-lg font-semibold">
              {t("beginner.step3Label")}
            </label>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={t("beginner.step3HelpAria")}
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[280px]">
                <p className="text-sm">{t("beginner.step3Tooltip")}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="relative">
            <div
              className={`min-h-[180px] p-5 frost-glass rounded-2xl text-lg leading-relaxed whitespace-pre-wrap ${
                !output ? "text-muted-foreground/60 italic" : ""
              }`}
              role="region"
              aria-live="polite"
              aria-label={t("beginner.outputAria")}
            >
              {isLoading ? (
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                  <span>{t("beginner.generating")}</span>
                </div>
              ) : output ? (
                output
              ) : (
                t("beginner.outputPlaceholder")
              )}
            </div>
            {output && !isLoading && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleCopy}
                    className="absolute bottom-4 right-4 gap-2 bg-primary/20 hover:bg-primary/30 border-primary/30"
                    aria-label={t("beginner.copyAria")}
                  >
                    {copied ? (
                      <>
                        <Check className="w-5 h-5" />
                        {t("output.copied")}
                      </>
                    ) : (
                      <>
                        <Copy className="w-5 h-5" />
                        {t("beginner.copyButton")}
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-sm">{t("beginner.copyTooltip")}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          {output && !isLoading && (
            <p className="text-sm text-muted-foreground text-center">
              {t("beginner.outputHint")}
            </p>
          )}
        </div>

        {/* Encouragement message */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground/80 italic">
            {t("beginner.encouragement")}
          </p>
        </div>
      </div>
    </TooltipProvider>
  );
}
