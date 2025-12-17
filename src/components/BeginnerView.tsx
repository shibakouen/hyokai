import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { anonSupabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ChatGPTButton } from "@/components/ChatGPTButton";
import {
  Sparkles,
  ArrowLeft,
  Copy,
  Check,
  Lightbulb,
  HelpCircle,
  RotateCcw,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SimpleHistoryPanel } from "@/components/SimpleHistoryPanel";
import { AuthButtonCompact } from "@/components/AuthButton";
import { useAuth } from "@/contexts/AuthContext";
import { addSimpleHistoryEntry, addSimpleHistoryEntryToDb, SimpleHistoryEntry } from "@/lib/simpleHistory";
import { BEGINNER_PROMPTS, BeginnerPrompt } from "@/lib/beginnerPrompts";

// Grok 4 Fast model ID - fast and reliable for beginners
const BEGINNER_MODEL_ID = "x-ai/grok-4-fast";
const INPUT_STORAGE_KEY = "hyokai-beginner-input-height";
// Unified height constant - matches advanced mode
const UNIFIED_HEIGHT = 200;

// Helper to add timeout to promises
function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), ms)
    )
  ]);
}

export function BeginnerView() {
  const { t } = useLanguage();
  const { isAuthenticated, user } = useAuth();

  // Use refs for auth state to avoid stale closures in callbacks
  const authRef = useRef({ isAuthenticated, user });
  useEffect(() => {
    authRef.current = { isAuthenticated, user };
  }, [isAuthenticated, user]);

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
  const unifiedOutputRef = useRef<HTMLTextAreaElement>(null);
  const inputViewOutputRef = useRef<HTMLTextAreaElement>(null);
  const outputSectionRef = useRef<HTMLDivElement>(null);
  // Ref to always have latest input value (fixes mobile stale closure issues)
  const inputValueRef = useRef(input);
  // Ref to track previous loading state for detecting transformation completion
  const prevLoadingRef = useRef(isLoading);

  // Mobile full-screen output view state
  const [showMobileOutput, setShowMobileOutput] = useState(false);

  // Desktop unified panel view state - shows output in place of input after generation
  const [isViewingOutput, setIsViewingOutput] = useState(false);

  // Selected prompt suggestion (for inspiration grid)
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);

  // Keep ref in sync with state (ensures callbacks always have latest value)
  useEffect(() => {
    inputValueRef.current = input;
  }, [input]);

  // Sync editedOutput when new output comes from transformation
  useEffect(() => {
    setEditedOutput(output);
    setIsOutputEdited(false);
  }, [output]);

  // Handle post-transformation UX: switch to output view and auto-copy
  useEffect(() => {
    const wasLoading = prevLoadingRef.current;
    prevLoadingRef.current = isLoading;

    // Check if loading just finished and we have output
    if (wasLoading && !isLoading && output) {
      // Switch to output view (desktop unified panel) and mobile full-screen
      setIsViewingOutput(true);
      setShowMobileOutput(true);

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

  // Clean up stale localStorage output height (was causing textarea to not auto-expand)
  useEffect(() => {
    localStorage.removeItem("hyokai-beginner-output-height");
  }, []);

  // Auto-resize output textareas to fit content (always expand to show full text)
  useEffect(() => {
    if (!editedOutput) return;

    // Resize both output textareas (only one is visible at a time)
    [unifiedOutputRef.current, inputViewOutputRef.current].forEach(textarea => {
      if (!textarea) return;
      // Reset height to auto to get accurate scrollHeight
      textarea.style.height = 'auto';
      // Set height to scrollHeight (content height), minimum matches advanced mode
      const newHeight = Math.max(textarea.scrollHeight, UNIFIED_HEIGHT);
      textarea.style.height = `${newHeight}px`;
    });
  }, [editedOutput]);

  // Load saved input height from localStorage (output auto-sizes to content)
  useEffect(() => {
    const savedInputHeight = localStorage.getItem(INPUT_STORAGE_KEY);
    if (savedInputHeight && inputRef.current) {
      inputRef.current.style.height = `${savedInputHeight}px`;
    }
  }, []);

  // Save input height to localStorage on resize
  const handleInputResize = useCallback(() => {
    if (inputRef.current) {
      localStorage.setItem(INPUT_STORAGE_KEY, inputRef.current.offsetHeight.toString());
    }
  }, []);

  // Use ResizeObserver to detect input resize only
  useEffect(() => {
    const inputEl = inputRef.current;
    if (!inputEl) return;

    const resizeObserver = new ResizeObserver(handleInputResize);
    resizeObserver.observe(inputEl);
    return () => resizeObserver.disconnect();
  }, [handleInputResize]);

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
      // Add 60 second timeout to prevent hanging forever
      // Use anonSupabase to bypass auth session handling that can hang
      const { data, error } = await withTimeout(
        anonSupabase.functions.invoke("transform-prompt", {
          body: {
            userPrompt: currentInput,
            model: BEGINNER_MODEL_ID,
            mode: "prompting",
            beginnerMode: true,
          },
        }),
        60000,
        "Request timed out. Please try again."
      );

      if (error) {
        throw new Error(error.message || t("beginner.errorGeneric"));
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const resultOutput = data?.result || t("beginner.noOutput");
      setOutput(resultOutput);

      // Save to history
      const finalElapsedTime = startTimeRef.current ? Date.now() - startTimeRef.current : null;
      const entryData = {
        input: currentInput,
        output: resultOutput,
        elapsedTime: finalElapsedTime,
      };

      // Save to localStorage (for all users)
      addSimpleHistoryEntry(entryData);

      // Also save to database for authenticated users (use ref to avoid stale closure)
      const auth = authRef.current;
      if (auth.isAuthenticated && auth.user) {
        addSimpleHistoryEntryToDb(auth.user.id, entryData).catch(e => {
          console.error('Failed to save simple history to database:', e);
        });
      }
    } catch (error) {
      console.error("Transform error:", error);
      toast({
        title: t("beginner.errorTitle"),
        description: error instanceof Error ? error.message : t("beginner.errorMessage"),
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

  // Handle mobile back button - return to input view
  const handleMobileBack = () => {
    setShowMobileOutput(false);
  };

  // Handle new prompt - clear output and return to input (works for both mobile and desktop)
  const handleNewPrompt = () => {
    setShowMobileOutput(false);
    setIsViewingOutput(false);
    setOutput('');
    setEditedOutput('');
    setInput('');
  };

  // Handle switching back to input view without clearing content
  const handleBackToInput = () => {
    setShowMobileOutput(false);
    setIsViewingOutput(false);
  };

  // Handle restoring from history
  const handleRestoreFromHistory = (entry: SimpleHistoryEntry) => {
    setInput(entry.input);
    setOutput(entry.output);
    setEditedOutput(entry.output);
    setIsOutputEdited(false);
    setElapsedTime(entry.elapsedTime);
    // Show output view since we have output
    setIsViewingOutput(true);
  };

  // Handle selecting a prompt suggestion
  const handleSelectPrompt = useCallback((prompt: BeginnerPrompt) => {
    // Toggle selection - clicking same prompt deselects it
    setSelectedPromptId(prev => prev === prompt.id ? null : prompt.id);
  }, []);

  // Get the currently selected prompt object
  const selectedPrompt = selectedPromptId
    ? BEGINNER_PROMPTS.find(p => p.id === selectedPromptId)
    : null;

  return (
    <TooltipProvider>
      {/* Mobile Full-Screen Output View - only visible on mobile after successful generation */}
      {showMobileOutput && editedOutput && (
        <div className="md:hidden fixed inset-0 z-[100] flex flex-col bg-gradient-to-b from-sky-50 to-blue-100">
          {/* Mobile output header */}
          <div className="flex items-center justify-between p-4 border-b border-white/30">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMobileBack}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
              aria-label={t('output.backToInput')}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t('output.backToInput')}</span>
            </Button>
            <Button
              variant="frost"
              size="sm"
              onClick={handleNewPrompt}
              className="gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>{t('output.newPrompt')}</span>
            </Button>
          </div>

          {/* Mobile output content */}
          <div className="flex-1 overflow-auto p-4 min-h-0">
            <div className="frost-glass rounded-2xl p-4 space-y-4 h-full flex flex-col">
              <h2 className="text-lg font-semibold text-center flex-shrink-0">
                {t('output.mobileResultTitle')}
              </h2>

              {/* Action toolbar - above textarea, ChatGPT primary */}
              <div className="flex items-center justify-between gap-2 flex-shrink-0">
                {/* Left: Reset (if edited) */}
                <div>
                  {isOutputEdited && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleResetOutput}
                      className="h-9 px-3 text-muted-foreground hover:text-foreground gap-1.5"
                      title={t("beginner.resetToOriginal")}
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span className="text-sm">{t("beginner.reset")}</span>
                    </Button>
                  )}
                </div>

                {/* Right: Copy (secondary) + ChatGPT (primary) */}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopy}
                    className="h-9 gap-1.5"
                    aria-label={t("beginner.copyAria")}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-green-500" />
                        <span>{t("output.copied")}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>{t("output.copy")}</span>
                      </>
                    )}
                  </Button>
                  <ChatGPTButton prompt={editedOutput} primary />
                </div>
              </div>

              {/* Textarea - clean, no overlapping buttons */}
              <Textarea
                value={editedOutput}
                onChange={(e) => handleOutputChange(e.target.value)}
                className="flex-1 min-h-[200px] text-base leading-relaxed bg-white/40 dark:bg-slate-900/40 rounded-xl border-white/50 focus:border-cb-blue/50 focus:ring-2 focus:ring-cb-blue/20 shadow-inner resize-none"
                aria-label={t("beginner.outputAria")}
              />

              {/* Stats */}
              <div className="text-xs text-muted-foreground/70 flex gap-2 justify-center flex-shrink-0">
                <span>{editedOutput.length} {t("beginner.chars")}</span>
                {isOutputEdited && <span className="text-cb-blue">{t("beginner.edited")}</span>}
              </div>

              {/* Hint */}
              <p className="text-xs text-cb-blue/70 text-center font-medium flex-shrink-0">
                {t("beginner.outputHint")}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-5 sm:space-y-8">
        {/* Step indicator and history */}
        <div className="flex items-center justify-between">
          <AuthButtonCompact />
          <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full frost-glass border border-cb-blue/20 shadow-lg shadow-cb-blue/10">
            <Lightbulb className="w-4 h-4 text-cb-blue" />
            <span className="text-sm font-semibold text-cb-blue">
              {t("beginner.threeSteps")}
            </span>
          </div>
          <SimpleHistoryPanel onRestore={handleRestoreFromHistory} />
        </div>

        {/* Desktop Unified Panel - hidden on mobile (uses full-screen overlay instead) */}
        {isViewingOutput && editedOutput ? (
          /* OUTPUT VIEW - Show output with prominent back/new prompt buttons (desktop only) */
          <div className="hidden md:block space-y-4">
            {/* Action buttons - prominent placement */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToInput}
                className="gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('output.backToInput')}
              </Button>
              <Button
                size="lg"
                onClick={handleNewPrompt}
                className="gap-2 min-w-[180px] bg-cb-blue hover:bg-cb-blue-dark text-white shadow-lg shadow-cb-blue/25 rounded-2xl"
              >
                <Sparkles className="w-5 h-5" />
                {t('output.newPrompt')}
              </Button>
            </div>

            {/* Original input preview (collapsed) */}
            <div className="frost-glass rounded-xl p-3 border border-white/30">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <span className="font-medium">{t("beginner.step1Label")}:</span>
              </div>
              <p className="text-sm text-foreground/80 line-clamp-2">
                {input || t("beginner.inputPlaceholder")}
              </p>
            </div>

            {/* Output Section - Full view */}
            <div ref={outputSectionRef} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-cb-blue/10 text-cb-blue text-xs font-semibold">
                  2
                </span>
                <label className="text-sm font-medium text-muted-foreground flex-1">
                  {t("beginner.step3Label")}
                </label>
              </div>

              {/* Action toolbar - outside textarea, ChatGPT as primary */}
              <div className="flex items-center justify-between gap-3">
                {/* Left side: Reset button */}
                <div className="flex items-center gap-2">
                  {isOutputEdited && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleResetOutput}
                      className="h-9 px-3 text-muted-foreground hover:text-foreground gap-1.5"
                      title={t("beginner.resetToOriginal")}
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>{t("beginner.reset")}</span>
                    </Button>
                  )}
                </div>

                {/* Right side: Copy (secondary) + ChatGPT (primary) */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="h-9 gap-1.5"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-green-500" />
                        {t("output.copied")}
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        {t("output.copy")}
                      </>
                    )}
                  </Button>
                  <ChatGPTButton prompt={editedOutput} primary />
                </div>
              </div>

              {/* Textarea - clean, no overlapping buttons */}
              <Textarea
                ref={unifiedOutputRef}
                value={editedOutput}
                onChange={(e) => handleOutputChange(e.target.value)}
                style={{ minHeight: `${UNIFIED_HEIGHT}px` }}
                className="resize-y frost-glass rounded-2xl text-sm text-foreground font-mono leading-relaxed focus:border-white/60 focus:ring-cb-blue/20 transition-colors duration-300"
                aria-label={t("beginner.outputAria")}
              />
              {/* Stats footer - outside textarea */}
              <div className="flex justify-end text-xs text-muted-foreground/70 gap-3 mt-2">
                <span>{editedOutput.split(/\s+/).filter(Boolean).length} {t("output.words")}</span>
                <span>{editedOutput.length} {t("output.chars")}</span>
                {isOutputEdited && <span className="text-cb-blue">{t("output.edited")}</span>}
              </div>
            </div>
          </div>
        ) : null}

        {/* INPUT VIEW - Show input, generate button, suggestions, and output (mobile always, desktop when not viewing output) */}
        <div className={isViewingOutput && editedOutput ? 'md:hidden' : ''}>
        {/* Step 1: Input */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-cb-blue/10 text-cb-blue text-xs font-semibold">
              1
            </span>
            <label className="text-sm font-medium text-muted-foreground flex-1">
              {t("beginner.step1Label")}
            </label>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="text-muted-foreground hover:text-cb-blue transition-colors p-1 rounded-full hover:bg-cb-blue/10"
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
          <div className="relative">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("beginner.inputPlaceholder")}
              disabled={isLoading}
              style={{ minHeight: `${UNIFIED_HEIGHT}px` }}
              className="resize-y sm:resize frost-glass rounded-2xl text-foreground placeholder:text-muted-foreground/60 focus:border-white/60 focus:ring-cb-blue/20 transition-colors duration-300"
              aria-label={t("beginner.inputAria")}
            />
            <div className="absolute bottom-3 right-3 text-xs text-muted-foreground pointer-events-none">
              {input.length} chars
            </div>
          </div>

          {/* Suggestion text display - shows when a prompt card is selected */}
          {selectedPrompt && (
            <div className="frost-glass rounded-xl p-3 border border-cb-blue/30 bg-cb-blue/5 animate-in fade-in slide-in-from-top-2 duration-200">
              <p className="text-xs font-medium text-cb-blue mb-1">
                {t("suggestions.tryThis")}
              </p>
              <p className="text-sm text-foreground leading-relaxed">
                {t(selectedPrompt.promptKey as any)}
              </p>
              <p className="text-xs text-muted-foreground mt-2 italic">
                {t("suggestions.editHint")}
              </p>
            </div>
          )}
        </div>

        {/* Generate Button - positioned with breathing room below input */}
        <div className="flex flex-col items-center gap-2 mt-5">
          <Button
            size="lg"
            onClick={handleTransform}
            disabled={isLoading || !input.trim()}
            className="min-w-[200px] touch-manipulation"
            aria-label={t("beginner.transformAria")}
            title={t("beginner.transformTooltip")}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t("beginner.transforming")}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {t("beginner.transformButton")}
              </>
            )}
          </Button>
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

        {/* Visual divider with sparkle accent */}
        <div className="flex items-center gap-3 py-5">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-cb-blue/20 to-transparent" />
          <Sparkles className="w-3 h-3 text-cb-blue/30" />
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-cb-blue/20 to-transparent" />
        </div>

        {/* Suggestions Grid - "Things AI Can Do" - now positioned as inspiration section */}
        <div className="space-y-3">
          <div className="text-center">
            <h3 className="text-sm font-medium text-muted-foreground">
              {t("suggestions.sectionTitle")}
            </h3>
            <p className="text-xs text-muted-foreground/70 mt-0.5">
              {t("suggestions.sectionSubtitle")}
            </p>
          </div>

          {/* 5x5 grid on desktop, 3 columns on tablet, 2 columns on mobile */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
            {BEGINNER_PROMPTS.map((prompt) => {
              const isSelected = selectedPromptId === prompt.id;
              return (
                <button
                  key={prompt.id}
                  onClick={() => handleSelectPrompt(prompt)}
                  className={`
                    aspect-square rounded-2xl p-2 sm:p-3
                    flex items-center justify-center text-center
                    transition-all duration-200 ease-out
                    touch-manipulation cursor-pointer
                    ${prompt.colorClass}
                    ${isSelected
                      ? 'ring-2 ring-cb-blue ring-offset-2 scale-[1.02] shadow-lg shadow-cb-blue/20'
                      : 'hover:scale-[1.02] hover:shadow-md hover:brightness-95 active:scale-[0.98]'
                    }
                  `}
                  aria-pressed={isSelected}
                  aria-label={t(prompt.titleKey as any)}
                >
                  <span className={`
                    text-xs sm:text-sm font-medium leading-tight
                    ${isSelected ? 'text-cb-blue' : 'text-slate-700'}
                  `}>
                    {t(prompt.titleKey as any)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Output - Only show when loading or has output (no empty placeholder) */}
        {(isLoading || editedOutput) && (
        <div ref={outputSectionRef} className="space-y-2 mt-6">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-cb-blue/10 text-cb-blue text-xs font-semibold">
              2
            </span>
            <label className="text-sm font-medium text-muted-foreground flex-1">
              {t("beginner.step3Label")}
            </label>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="text-muted-foreground hover:text-cb-blue transition-colors p-1 rounded-full hover:bg-cb-blue/10"
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
                className="frost-glass rounded-2xl p-5 transition-all duration-300 flex items-center justify-center"
                style={{ minHeight: `${UNIFIED_HEIGHT}px` }}
                role="region"
                aria-live="polite"
              >
                <div className="flex items-center gap-3 text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-primary animate-frost-pulse" />
                  <div className="w-2 h-2 rounded-full bg-primary animate-frost-pulse [animation-delay:200ms]" />
                  <div className="w-2 h-2 rounded-full bg-primary animate-frost-pulse [animation-delay:400ms]" />
                  <span className="ml-2 text-sm">{t("beginner.generating")}</span>
                </div>
              </div>
            ) : editedOutput ? (
              <div className="space-y-3">
                {/* Action toolbar - outside textarea, ChatGPT primary */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3">
                  {/* Left side: Reset button */}
                  <div className="flex items-center gap-2">
                    {isOutputEdited && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleResetOutput}
                        className="h-9 px-3 text-muted-foreground hover:text-foreground gap-1.5"
                        title={t("beginner.resetToOriginal")}
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span className="hidden sm:inline">{t("beginner.reset")}</span>
                      </Button>
                    )}
                  </div>

                  {/* Right side: Copy (secondary) + ChatGPT (primary) + New Prompt */}
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopy}
                      className="h-9 gap-1.5"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 text-green-500" />
                          {t("output.copied")}
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          {t("output.copy")}
                        </>
                      )}
                    </Button>
                    <ChatGPTButton prompt={editedOutput} primary />
                    <Button
                      variant="frost"
                      size="sm"
                      onClick={handleNewPrompt}
                      className="h-9 gap-1.5"
                    >
                      <Sparkles className="w-4 h-4" />
                      {t("output.newPrompt")}
                    </Button>
                  </div>
                </div>

                {/* Textarea - clean, no overlapping buttons */}
                <Textarea
                  ref={inputViewOutputRef}
                  value={editedOutput}
                  onChange={(e) => handleOutputChange(e.target.value)}
                  style={{ minHeight: `${UNIFIED_HEIGHT}px` }}
                  className="resize-y sm:resize frost-glass rounded-2xl text-sm text-foreground font-mono leading-relaxed focus:border-white/60 focus:ring-cb-blue/20 transition-colors duration-300"
                  aria-label={t("beginner.outputAria")}
                />
                {/* Stats footer - outside textarea */}
                <div className="flex justify-end text-xs text-muted-foreground/70 gap-3 mt-2">
                  <span>{editedOutput.split(/\s+/).filter(Boolean).length} {t("output.words")}</span>
                  <span>{editedOutput.length} {t("output.chars")}</span>
                  {isOutputEdited && <span className="text-cb-blue">{t("output.edited")}</span>}
                </div>
              </div>
            ) : null}
          </div>
        </div>
        )}
        </div>
        {/* End of INPUT VIEW wrapper */}
      </div>
    </TooltipProvider>
  );
}
