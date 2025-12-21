import { useEffect, useRef, useState } from "react";
import { Header } from "@/components/Header";
import { ModelSelector } from "@/components/ModelSelector";
import { PromptInput } from "@/components/PromptInput";
import { OutputPanel } from "@/components/OutputPanel";
import { Button } from "@/components/ui/button";
import { usePromptTransformer } from "@/hooks/usePromptTransformer";
import { useModelComparison } from "@/hooks/useModelComparison";
import { useInstructions } from "@/hooks/useInstructions";
import { Sparkles, GitCompare, ArrowLeft } from "lucide-react";
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
import { AdvancedPromptLibrary } from "@/components/AdvancedPromptLibrary";
import { CustomInstructionsPanel } from "@/components/CustomInstructionsPanel";
import { AuthButton } from "@/components/AuthButton";
import { TokenUsageDisplay } from "@/components/TokenUsageDisplay";
import { UsageMeterCompact } from "@/components/UsageMeter";
import { useMode } from "@/contexts/ModeContext";
import { useAuth } from "@/contexts/AuthContext";
import { AVAILABLE_MODELS } from "@/lib/models";
import { addHistoryEntry, saveHistoryEntryToDb, HistoryEntry } from "@/lib/history";
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

  // Auth context for database sync
  const { isAuthenticated, user } = useAuth();

  // Language hook - must be before useEffects that use t()
  const { t } = useLanguage();

  // Custom instructions hook
  const {
    isEnabled: instructionsEnabled,
    setIsEnabled: setInstructionsEnabled,
    customInstructions,
    setCustomInstructions,
    savedInstructions,
    selectedInstructionIds,
    toggleInstructionSelection,
    createInstruction,
    updateInstruction,
    deleteInstruction,
    getAppendText,
    getAppliedInstructions,
    isLoading: instructionsLoading,
  } = useInstructions();

  // Track previous loading states to detect when transformation completes
  const prevSingleLoadingRef = useRef(singleIsLoading);
  const prevCompareLoadingRef = useRef(compareIsLoading);

  // Guard to prevent duplicate history saves in compare mode
  const compareHistorySavedRef = useRef(false);

  // Ref for output section to enable auto-scroll
  const outputSectionRef = useRef<HTMLDivElement>(null);

  // Mobile full-screen output view state (triggered on successful generation)
  const [showMobileOutput, setShowMobileOutput] = useState(false);

  // Desktop unified panel view state - shows output in place of input after generation
  const [isViewingOutput, setIsViewingOutput] = useState(false);

  // Save to history and handle post-transformation UX when single model transformation completes
  useEffect(() => {
    const wasLoading = prevSingleLoadingRef.current;
    prevSingleLoadingRef.current = singleIsLoading;

    // Check if loading just finished and we have output
    if (wasLoading && !singleIsLoading && output && singleInput.trim()) {
      const model = AVAILABLE_MODELS[selectedModelIndex];

      // Append custom instructions to output if enabled
      const appendText = getAppendText();
      const finalOutput = appendText ? output + appendText : output;
      const appliedInstructions = getAppliedInstructions();

      // Update the output state with appended instructions
      if (appendText) {
        setOutput(finalOutput);
      }

      const entryData = {
        input: singleInput,
        taskMode,
        result: {
          type: 'single' as const,
          modelName: model.name,
          modelProvider: model.provider,
          output: finalOutput,
          elapsedTime,
          appliedInstructions: appliedInstructions.length > 0 ? appliedInstructions : undefined,
        },
      };

      // Save to localStorage (for all users) - this generates the ID
      const savedEntry = addHistoryEntry(entryData);

      // Also save to database for authenticated users - use SAME entry with SAME ID
      if (isAuthenticated && user) {
        saveHistoryEntryToDb(user.id, savedEntry).catch(e => {
          console.error('Failed to save history to database:', e);
        });
      }

      // Switch to output view (desktop unified panel) and mobile full-screen
      setIsViewingOutput(true);
      setShowMobileOutput(true);

      // Auto-copy to clipboard (single model mode only) - use final output with instructions
      navigator.clipboard.writeText(finalOutput).then(() => {
        toast({
          title: t('output.autoCopied'),
          description: t('output.autoCopiedMessage'),
        });
      }).catch(() => {
        // Silently fail - user can manually copy
      });
    }
  }, [singleIsLoading, output, singleInput, selectedModelIndex, taskMode, elapsedTime, t, isAuthenticated, user, getAppendText, getAppliedInstructions, setOutput]);

  // Save to history and handle post-transformation UX when compare mode transformation completes
  useEffect(() => {
    const wasLoading = prevCompareLoadingRef.current;
    prevCompareLoadingRef.current = compareIsLoading;

    // Reset the save guard when a new transformation starts
    if (!wasLoading && compareIsLoading) {
      compareHistorySavedRef.current = false;
    }

    // Check if loading just finished and we have results
    if (wasLoading && !compareIsLoading && results.length > 0 && compareInput.trim()) {
      // Only save if all results are complete (not loading) AND we haven't saved yet
      const allComplete = results.every(r => !r.isLoading);
      if (allComplete && !compareHistorySavedRef.current) {
        // Mark as saved FIRST to prevent any race conditions
        compareHistorySavedRef.current = true;

        // Append custom instructions to each model's output if enabled
        const appendText = getAppendText();
        const appliedInstructions = getAppliedInstructions();

        // Update results with appended instructions
        if (appendText) {
          const updatedResults = results.map(r => ({
            ...r,
            output: r.output ? r.output + appendText : r.output,
          }));
          setResults(updatedResults);
        }

        const entryData = {
          input: compareInput,
          taskMode,
          result: {
            type: 'compare' as const,
            results: results.map(r => ({
              modelName: r.model.name,
              modelProvider: r.model.provider,
              output: appendText && r.output ? r.output + appendText : r.output,
              error: r.error,
              elapsedTime: r.elapsedTime,
            })),
            appliedInstructions: appliedInstructions.length > 0 ? appliedInstructions : undefined,
          },
        };

        // Save to localStorage (for all users) - this generates the ID
        const savedEntry = addHistoryEntry(entryData);

        // Also save to database for authenticated users - use SAME entry with SAME ID
        if (isAuthenticated && user) {
          saveHistoryEntryToDb(user.id, savedEntry).catch(e => {
            console.error('Failed to save compare history to database:', e);
          });
        }

        // Switch to output view (desktop unified panel) and mobile full-screen
        setIsViewingOutput(true);
        setShowMobileOutput(true);
      }
    }
  }, [compareIsLoading, results, compareInput, taskMode, isAuthenticated, user, getAppendText, getAppliedInstructions, setResults]);

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
      // Show output view since we have output
      setIsViewingOutput(true);
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
      // Show output view since we have results
      setIsViewingOutput(true);
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
    if (isCompareMode) {
      resetComparison();
    } else {
      setOutput('');
    }
    setSingleInput('');
    setCompareInput('');
  };

  // Handle switching back to input view without clearing content
  const handleBackToInput = () => {
    setShowMobileOutput(false);
    setIsViewingOutput(false);
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
        <UsageMeterCompact />
        <TokenUsageDisplay compact className="hidden sm:flex" />
        <AuthButton />
        <BeginnerModeToggle />
        {!isBeginnerMode && (
          <>
            <GitRepoEditor />
            <UserContextEditor />
          </>
        )}
        {/* History panel visible in all modes - restore disabled in beginner mode since BeginnerView has separate state */}
        <HistoryPanel onRestore={isBeginnerMode ? undefined : handleRestore} />
      </div>

      <div className={`relative z-10 container mx-auto py-6 sm:py-8 md:py-16 px-4 ${isCompareMode ? 'max-w-6xl' : 'max-w-4xl'}`}>
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

            {/* Custom Instructions Panel - Advanced Mode Only */}
            <CustomInstructionsPanel
              isEnabled={instructionsEnabled}
              onToggle={setInstructionsEnabled}
              customInstructions={customInstructions}
              onCustomInstructionsChange={setCustomInstructions}
              savedInstructions={savedInstructions}
              selectedInstructionIds={selectedInstructionIds}
              onToggleSelection={toggleInstructionSelection}
              onCreateInstruction={createInstruction}
              onUpdateInstruction={updateInstruction}
              onDeleteInstruction={deleteInstruction}
              isLoading={instructionsLoading}
            />

            <div className="space-y-8 mt-8">
              {/* Model Selection - always visible */}
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

              {/* Unified Panel - Shows INPUT or OUTPUT in same location (no scrolling) */}
              {!isViewingOutput ? (
                /* INPUT VIEW - Show input, generate button, and templates */
                <>
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

                  {/* Advanced Prompt Library - Prompt Templates */}
                  <AdvancedPromptLibrary onSelectPrompt={setInput} />

                  {/* Output Section - Only show when there's actual output (loading state shown in button) */}
                  {(output || results.some(r => r.output)) && (
                    <div ref={outputSectionRef} className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        {t('output.label')}
                      </label>
                      {isCompareMode ? (
                        <ComparisonPanel results={results} isLoading={isLoading} />
                      ) : (
                        <OutputPanel content={output} isLoading={singleIsLoading} />
                      )}
                    </div>
                  )}
                </>
              ) : (
                /* OUTPUT VIEW - Show output with prominent back/new prompt buttons */
                <>
                  {/* Output Header with actions */}
                  <div className="space-y-4">
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
                        <span className="font-medium">{t('input.label')}:</span>
                      </div>
                      <p className="text-sm text-foreground/80 line-clamp-2">
                        {input || t('input.placeholder')}
                      </p>
                    </div>
                  </div>

                  {/* Output Section - Full view (no onNewPrompt since blue button above) */}
                  <div ref={outputSectionRef} className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      {t('output.label')}
                    </label>
                    {isCompareMode ? (
                      <ComparisonPanel results={results} isLoading={isLoading} />
                    ) : (
                      <OutputPanel content={output} isLoading={singleIsLoading} />
                    )}
                  </div>

                  {/* Floating New Prompt button (fixed on mobile for easy access) */}
                  <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                    <Button
                      size="lg"
                      onClick={handleNewPrompt}
                      className="gap-2 px-8 bg-cb-blue hover:bg-cb-blue-dark text-white shadow-xl shadow-cb-blue/30 rounded-2xl"
                    >
                      <Sparkles className="w-5 h-5" />
                      {t('output.newPrompt')}
                    </Button>
                  </div>
                </>
              )}
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
