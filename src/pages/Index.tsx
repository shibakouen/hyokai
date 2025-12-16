import { useEffect, useRef, useState } from "react";
import { Header } from "@/components/Header";
import { ModelSelector } from "@/components/ModelSelector";
import { PromptInput } from "@/components/PromptInput";
import { OutputPanel } from "@/components/OutputPanel";
import { Button } from "@/components/ui/button";
import { usePromptTransformer } from "@/hooks/usePromptTransformer";
import { useModelComparison } from "@/hooks/useModelComparison";
import { Sparkles, ArrowDown, GitCompare, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "@/hooks/use-toast";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ModeToggle } from "@/components/ModeToggle";
import { CompareToggle } from "@/components/CompareToggle";
import { ModelMultiSelector } from "@/components/ModelMultiSelector";
import { ComparisonPanel } from "@/components/ComparisonPanel";
import { HistoryPanel } from "@/components/HistoryPanel";
import { UserContextEditor } from "@/components/UserContextEditor";
import { GitRepoEditor } from "@/components/GitRepoEditor";
import { BeginnerModeToggle } from "@/components/BeginnerModeToggle";
import { BeginnerView } from "@/components/BeginnerView";
import { useMode } from "@/contexts/ModeContext";
import { AVAILABLE_MODELS } from "@/lib/models";
import { addHistoryEntry, HistoryEntry } from "@/lib/history";
import { ComparisonResult } from "@/hooks/useModelComparison";

const Index = () => {
  // Single model mode
  const {
    input: singleInput,
    setInput: setSingleInput,
    output,
    setOutput,
    isLoading: singleIsLoading,
    elapsedTime,
    selectedModelIndex,
    setSelectedModelIndex,
    transform,
  } = usePromptTransformer();

  // Compare mode
  const {
    input: compareInput,
    setInput: setCompareInput,
    isCompareMode,
    setIsCompareMode,
    selectedIndices,
    toggleModel,
    results,
    setResults,
    isLoading: compareIsLoading,
    compare,
    resetComparison,
  } = useModelComparison();

  // Task mode context
  const { mode: taskMode, isBeginnerMode } = useMode();

  // Language hook - must be before useEffects that use t()
  const { t } = useLanguage();

  // Track previous loading states to detect when transformation completes
  const prevSingleLoadingRef = useRef(singleIsLoading);
  const prevCompareLoadingRef = useRef(compareIsLoading);

  // Ref for output section to enable auto-scroll
  const outputSectionRef = useRef<HTMLDivElement>(null);

  // Mobile full-screen output view state (triggered on successful generation)
  const [showMobileOutput, setShowMobileOutput] = useState(false);

  // Save to history and handle post-transformation UX when single model transformation completes
  useEffect(() => {
    const wasLoading = prevSingleLoadingRef.current;
    prevSingleLoadingRef.current = singleIsLoading;

    // Check if loading just finished and we have output
    if (wasLoading && !singleIsLoading && output && singleInput.trim()) {
      const model = AVAILABLE_MODELS[selectedModelIndex];
      addHistoryEntry({
        input: singleInput,
        taskMode,
        result: {
          type: 'single',
          modelName: model.name,
          modelProvider: model.provider,
          output,
          elapsedTime,
        },
      });

      // Auto-scroll to output section (desktop) or show mobile output view
      if (outputSectionRef.current) {
        outputSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      // Trigger mobile full-screen output view
      setShowMobileOutput(true);

      // Auto-copy to clipboard (single model mode only)
      navigator.clipboard.writeText(output).then(() => {
        toast({
          title: t('output.autoCopied'),
          description: t('output.autoCopiedMessage'),
        });
      }).catch(() => {
        // Silently fail - user can manually copy
      });
    }
  }, [singleIsLoading, output, singleInput, selectedModelIndex, taskMode, elapsedTime, t]);

  // Save to history and handle post-transformation UX when compare mode transformation completes
  useEffect(() => {
    const wasLoading = prevCompareLoadingRef.current;
    prevCompareLoadingRef.current = compareIsLoading;

    // Check if loading just finished and we have results
    if (wasLoading && !compareIsLoading && results.length > 0 && compareInput.trim()) {
      // Only save if all results are complete (not loading)
      const allComplete = results.every(r => !r.isLoading);
      if (allComplete) {
        addHistoryEntry({
          input: compareInput,
          taskMode,
          result: {
            type: 'compare',
            results: results.map(r => ({
              modelName: r.model.name,
              modelProvider: r.model.provider,
              output: r.output,
              error: r.error,
              elapsedTime: r.elapsedTime,
            })),
          },
        });

        // Auto-scroll to output section (no auto-copy for compare mode)
        if (outputSectionRef.current) {
          outputSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        // Trigger mobile full-screen output view
        setShowMobileOutput(true);
      }
    }
  }, [compareIsLoading, results, compareInput, taskMode]);

  // Shared state based on mode
  const input = isCompareMode ? compareInput : singleInput;
  const setInput = isCompareMode ? setCompareInput : setSingleInput;
  const isLoading = isCompareMode ? compareIsLoading : singleIsLoading;

  // Handle restoring from history - restores both input and output
  const handleRestore = (entry: HistoryEntry) => {
    if (entry.result.type === 'single') {
      // Restore single model result
      setSingleInput(entry.input);
      setOutput(entry.result.output);
      // Switch to single mode if in compare mode
      if (isCompareMode) {
        setIsCompareMode(false);
        resetComparison();
      }
    } else {
      // Restore compare mode results
      setCompareInput(entry.input);
      // Convert history results back to ComparisonResult format
      const restoredResults: ComparisonResult[] = entry.result.results.map((r, idx) => {
        // Find matching model index by name and provider
        const modelIndex = AVAILABLE_MODELS.findIndex(
          m => m.name === r.modelName && m.provider === r.modelProvider
        );
        return {
          modelIndex: modelIndex >= 0 ? modelIndex : idx,
          model: modelIndex >= 0 ? AVAILABLE_MODELS[modelIndex] : {
            id: '',
            name: r.modelName,
            provider: r.modelProvider,
          },
          output: r.output,
          error: r.error,
          elapsedTime: r.elapsedTime,
          isLoading: false,
        };
      });
      setResults(restoredResults);
      // Switch to compare mode if not already
      if (!isCompareMode) {
        setIsCompareMode(true);
      }
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
    if (isCompareMode) {
      resetComparison();
    } else {
      setOutput('');
    }
    setSingleInput('');
    setCompareInput('');
  };

  // Handle mode toggle - reset comparison results when switching
  const handleCompareModeToggle = (value: boolean) => {
    if (!value) {
      resetComparison();
    }
    setIsCompareMode(value);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Layered background - matching lander */}
      <div className="fixed inset-0 bg-[#f0f9ff]" />
      <div className="fixed inset-0 bg-gradient-to-b from-sky-50 to-blue-100/50" />

      {/* Animated blobs - hidden on mobile to prevent overflow */}
      <div className="hidden md:block fixed top-20 left-10 w-72 h-72 bg-purple-200/30 rounded-full blur-3xl animate-blob mix-blend-multiply" />
      <div className="hidden md:block fixed top-40 right-20 w-72 h-72 bg-cyan-200/30 rounded-full blur-3xl animate-blob animation-delay-2000 mix-blend-multiply" />
      <div className="hidden md:block fixed bottom-20 left-1/3 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl animate-blob animation-delay-4000 mix-blend-multiply" />

      {/* Noise texture overlay */}
      <div className="noise-overlay" />

      {/* Mobile Full-Screen Output View - only visible on mobile after successful generation */}
      {showMobileOutput && !isBeginnerMode && (output || results.some(r => r.output && !r.error)) && (
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
            <div className="frost-glass rounded-2xl p-4 h-full flex flex-col">
              <h2 className="text-lg font-semibold mb-4 text-center flex-shrink-0">
                {t('output.mobileResultTitle')}
              </h2>
              <div className="flex-1 min-h-0 overflow-auto">
                {isCompareMode ? (
                  <ComparisonPanel results={results} isLoading={false} />
                ) : (
                  <OutputPanel content={output} isLoading={false} />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Language selector - top left */}
      <LanguageSelector />

      {/* Controls - top right, responsive with beginner mode optimization */}
      <div className={`absolute top-3 right-3 md:top-4 md:right-4 z-50 flex items-center gap-1.5 md:gap-2 flex-wrap justify-end ${isBeginnerMode ? 'max-w-[calc(100%-5rem)]' : 'max-w-[calc(100%-4rem)]'}`}>
        <BeginnerModeToggle />
        {!isBeginnerMode && (
          <>
            <GitRepoEditor />
            <UserContextEditor />
            <HistoryPanel onRestore={handleRestore} />
          </>
        )}
      </div>

      <div className={`relative z-10 container mx-auto py-6 sm:py-8 md:py-16 px-4 ${isCompareMode ? 'max-w-6xl' : 'max-w-3xl'}`}>
        <Header />

        {isBeginnerMode ? (
          /* Beginner Mode - Simplified View with optimized mobile layout */
          <>
            <BeginnerView />

            {/* Footer - hidden on mobile in beginner mode to reduce clutter */}
            <footer className="mt-8 sm:mt-12 text-center text-xs text-muted-foreground/50 hidden sm:block">
              <p>
                {t('footer.text')}
              </p>
            </footer>
          </>
        ) : (
          /* Advanced Mode - Full Interface */
          <>
            <ModeToggle />

            {/* Compare Mode Toggle */}
            <CompareToggle
              isCompareMode={isCompareMode}
              onToggle={handleCompareModeToggle}
            />

            <div className="space-y-8 mt-8">
              {/* Model Selection - conditional based on mode */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  {t('model.label')}
                </label>
                {isCompareMode ? (
                  <ModelMultiSelector
                    selectedIndices={selectedIndices}
                    onToggle={toggleModel}
                  />
                ) : (
                  <ModelSelector
                    value={selectedModelIndex}
                    onChange={setSelectedModelIndex}
                  />
                )}
              </div>

              {/* Input Section */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  {t('input.label')}
                </label>
                <PromptInput
                  value={input}
                  onChange={setInput}
                  disabled={isLoading}
                  placeholder={t('input.placeholder')}
                />
              </div>

              {/* Generate Button */}
              <div className="flex flex-col items-center gap-2">
                <Button
                  size="lg"
                  onClick={isCompareMode ? compare : transform}
                  disabled={isLoading || !input.trim() || (isCompareMode && selectedIndices.length < 2)}
                  className="min-w-[200px] touch-manipulation"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t('button.generating')}
                    </>
                  ) : isCompareMode ? (
                    <>
                      <GitCompare className="w-4 h-4" />
                      {t('compare.generate')}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      {t('button.generate')}
                    </>
                  )}
                </Button>
                {!isCompareMode && elapsedTime !== null && (
                  <span className={`text-sm tabular-nums ${isLoading ? 'text-muted-foreground animate-pulse' : 'text-muted-foreground/70'}`}>
                    {formatTime(elapsedTime)}
                  </span>
                )}
              </div>

              {/* Arrow indicator */}
              <div className="flex justify-center">
                <ArrowDown className="w-5 h-5 text-muted-foreground/50" />
              </div>

              {/* Output Section - conditional based on mode */}
              <div ref={outputSectionRef} className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  {t('output.label')}
                </label>
                {isCompareMode ? (
                  <ComparisonPanel results={results} isLoading={isLoading} />
                ) : (
                  <OutputPanel content={output} isLoading={singleIsLoading} onNewPrompt={handleNewPrompt} />
                )}
              </div>
            </div>

            {/* Footer */}
            <footer className="mt-12 text-center text-xs text-muted-foreground">
              <p>
                {t('footer.text')}
              </p>
            </footer>
          </>
        )}
      </div>
    </div>
  );
};

export default Index;
