import { useEffect, useRef } from "react";
import { Header } from "@/components/Header";
import { ModelSelector } from "@/components/ModelSelector";
import { PromptInput } from "@/components/PromptInput";
import { OutputPanel } from "@/components/OutputPanel";
import { Button } from "@/components/ui/button";
import { usePromptTransformer } from "@/hooks/usePromptTransformer";
import { useModelComparison } from "@/hooks/useModelComparison";
import { Sparkles, ArrowDown, GitCompare } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ModeToggle } from "@/components/ModeToggle";
import { CompareToggle } from "@/components/CompareToggle";
import { ModelMultiSelector } from "@/components/ModelMultiSelector";
import { ComparisonPanel } from "@/components/ComparisonPanel";
import { HistoryPanel } from "@/components/HistoryPanel";
import { UserContextEditor } from "@/components/UserContextEditor";
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
  const { mode: taskMode } = useMode();

  // Track previous loading states to detect when transformation completes
  const prevSingleLoadingRef = useRef(singleIsLoading);
  const prevCompareLoadingRef = useRef(compareIsLoading);

  // Save to history when single model transformation completes
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
    }
  }, [singleIsLoading, output, singleInput, selectedModelIndex, taskMode, elapsedTime]);

  // Save to history when compare mode transformation completes
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
  const { t } = useLanguage();

  // Handle mode toggle - reset comparison results when switching
  const handleCompareModeToggle = (value: boolean) => {
    if (!value) {
      resetComparison();
    }
    setIsCompareMode(value);
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Language selector - top left */}
      <LanguageSelector />

      {/* Controls - top right */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        <UserContextEditor />
        <HistoryPanel onRestore={handleRestore} />
      </div>

      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-ice-frost via-background to-ice-crystal opacity-50 pointer-events-none" />

      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

      <div className={`relative z-10 container mx-auto px-4 py-8 md:py-16 ${isCompareMode ? 'max-w-6xl' : 'max-w-3xl'}`}>
        <Header />

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
              className="min-w-[200px] bg-primary text-black hover:bg-primary/90"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
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
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              {t('output.label')}
            </label>
            {isCompareMode ? (
              <ComparisonPanel results={results} isLoading={isLoading} />
            ) : (
              <OutputPanel content={output} isLoading={singleIsLoading} />
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-xs text-muted-foreground">
          <p>
            {t('footer.text')}
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
