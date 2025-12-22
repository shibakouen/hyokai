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

  // Toggle selection - shows suggestion preview without inserting into input
  // Matches beginner mode behavior: click to preview, user writes their own prompt
  const handleSelectPrompt = useCallback((prompt: AdvancedPrompt) => {
    setSelectedPromptId(prev => prev === prompt.id ? null : prompt.id);
  }, []);

  const selectedPrompt = prompts.find(p => p.id === selectedPromptId);

  return (
    <div className="space-y-4">
      {/* Section Header with Navigation - ice-design styling */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold gradient-text">
            {t('advPrompts.sectionTitle' as TranslationKey)}
          </h3>
          <p className="text-xs text-muted-foreground/70">
            {t('advPrompts.sectionSubtitle' as TranslationKey)}
          </p>
        </div>

        {/* Pagination Controls - ice-design styling */}
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 0}
              className="p-1.5 rounded-lg bg-white/60 backdrop-blur-sm border border-white/40 hover:bg-white/80 hover:border-[#0ea5e9]/30 hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-xs text-muted-foreground tabular-nums px-2 py-1 bg-white/40 rounded-md backdrop-blur-sm">
              {t('advPrompts.page' as TranslationKey)} {currentPage + 1} {t('advPrompts.of' as TranslationKey)} {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages - 1}
              className="p-1.5 rounded-lg bg-white/60 backdrop-blur-sm border border-white/40 hover:bg-white/80 hover:border-[#0ea5e9]/30 hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        )}
      </div>

      {/* Selected Prompt Suggestion Preview - ice-design premium panel */}
      {selectedPrompt && (
        <div className="premium-frost-panel rounded-2xl p-5 border border-[#0ea5e9]/20 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-xl bg-gradient-to-br from-[#0ea5e9]/20 to-[#0284c7]/10 flex-shrink-0">
              <Sparkles className="w-5 h-5 text-[#0ea5e9]" />
            </div>
            <div className="space-y-3 min-w-0 flex-1">
              <p className="text-xs font-semibold text-[#0ea5e9] uppercase tracking-wide">
                {t('advPrompts.tryThis' as TranslationKey)}
              </p>
              {/* Show full prompt text as preview */}
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {t(selectedPrompt.promptKey as TranslationKey)}
              </p>
              {/* Explanation as additional context */}
              <div className="border-t border-[#0ea5e9]/10 pt-3">
                <p className="text-xs text-muted-foreground/80">
                  {t(selectedPrompt.explanationKey as TranslationKey)}
                </p>
              </div>
              {/* Edit hint */}
              <p className="text-xs text-muted-foreground/60 italic flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-[#0ea5e9]/50" />
                {t('advPrompts.editHint' as TranslationKey)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Prompt Grid - 5 columns on desktop, responsive - ice-design template cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {pagePrompts.map((prompt) => {
          const isSelected = selectedPromptId === prompt.id;
          return (
            <button
              key={prompt.id}
              onClick={() => handleSelectPrompt(prompt)}
              className={`
                template-card group
                p-3 rounded-xl text-left
                ${isSelected
                  ? 'ring-2 ring-[#0ea5e9] ring-offset-2 ring-offset-white/50 template-card-active'
                  : ''
                }
              `}
            >
              {/* Card shimmer effect on hover */}
              <div className="template-card-shimmer" />

              {/* Card sphere decoration */}
              <div className="card-sphere-decoration opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <span className="relative z-10 text-xs sm:text-sm font-medium text-gray-700 line-clamp-2 group-hover:text-[#0284c7] transition-colors duration-300">
                {t(prompt.titleKey as TranslationKey)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
