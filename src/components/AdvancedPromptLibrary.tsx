import { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMode } from '@/contexts/ModeContext';
import { CODING_PROMPTS, PROMPTING_PROMPTS, AdvancedPrompt } from '@/lib/advancedPrompts';
import { TranslationKey } from '@/lib/translations';

const PROMPTS_PER_PAGE = 25;

interface AdvancedPromptLibraryProps {
  onSelectPrompt: (prompt: string) => void;
}

export function AdvancedPromptLibrary({ onSelectPrompt }: AdvancedPromptLibraryProps) {
  const { t } = useLanguage();
  const { mode } = useMode();
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);

  // Get prompts based on current mode
  const prompts = mode === 'coding' ? CODING_PROMPTS : PROMPTING_PROMPTS;
  const totalPages = Math.ceil(prompts.length / PROMPTS_PER_PAGE);

  // Get prompts for current page
  const startIndex = currentPage * PROMPTS_PER_PAGE;
  const pagePrompts = prompts.slice(startIndex, startIndex + PROMPTS_PER_PAGE);

  const handlePrevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(0, prev - 1));
    setSelectedPromptId(null);
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1));
    setSelectedPromptId(null);
  }, [totalPages]);

  const handleSelectPrompt = useCallback((prompt: AdvancedPrompt) => {
    if (selectedPromptId === prompt.id) {
      setSelectedPromptId(null);
    } else {
      setSelectedPromptId(prompt.id);
      const promptText = t(prompt.promptKey as TranslationKey);
      onSelectPrompt(promptText);
    }
  }, [selectedPromptId, t, onSelectPrompt]);

  const selectedPrompt = prompts.find(p => p.id === selectedPromptId);

  return (
    <div className="space-y-4">
      {/* Section Header with Navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">
            {t('advPrompts.sectionTitle' as TranslationKey)}
          </h3>
          <p className="text-xs text-muted-foreground/70">
            {t('advPrompts.sectionSubtitle' as TranslationKey)}
          </p>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 0}
              className="p-1.5 rounded-lg hover:bg-white/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-muted-foreground tabular-nums">
              {t('advPrompts.page' as TranslationKey)} {currentPage + 1} {t('advPrompts.of' as TranslationKey)} {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages - 1}
              className="p-1.5 rounded-lg hover:bg-white/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Selected Prompt Display */}
      {selectedPrompt && (
        <div className="frost-glass rounded-xl p-4 space-y-2 border border-cb-blue/20 bg-cb-blue/5">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-cb-blue mt-0.5 flex-shrink-0" />
            <div className="space-y-1 min-w-0">
              <p className="text-xs font-medium text-cb-blue">
                {t('advPrompts.tryThis' as TranslationKey)}
              </p>
              <p className="text-sm text-foreground/80">
                {t(selectedPrompt.explanationKey as TranslationKey)}
              </p>
              <p className="text-xs text-muted-foreground/70 italic">
                {t('advPrompts.editHint' as TranslationKey)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Prompt Grid - 5 columns on desktop, responsive */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {pagePrompts.map((prompt) => {
          const isSelected = selectedPromptId === prompt.id;
          return (
            <button
              key={prompt.id}
              onClick={() => handleSelectPrompt(prompt)}
              className={`
                ${prompt.colorClass}
                p-3 rounded-xl text-left transition-all duration-200
                hover:scale-[1.02] hover:shadow-md
                ${isSelected
                  ? 'ring-2 ring-cb-blue ring-offset-1 scale-[1.02] shadow-md'
                  : 'hover:ring-1 hover:ring-gray-300'
                }
              `}
            >
              <span className="text-xs sm:text-sm font-medium text-gray-700 line-clamp-2">
                {t(prompt.titleKey as TranslationKey)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
