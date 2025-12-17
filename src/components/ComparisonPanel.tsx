import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Check, AlertCircle, Clock, RotateCcw } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ComparisonResult } from "@/hooks/useModelComparison";
import { ChatGPTButton } from "@/components/ChatGPTButton";
import { TooltipProvider } from "@/components/ui/tooltip";

const STORAGE_KEY_PREFIX = "hyokai-compare-height-";
const DEFAULT_HEIGHT = 200;

interface ComparisonPanelProps {
  results: ComparisonResult[];
  isLoading: boolean;
}

function formatTime(ms: number | null): string {
  if (ms === null) return "";
  const seconds = ms / 1000;
  return `${seconds.toFixed(1)}s`;
}

function ResultCard({ result }: { result: ComparisonResult }) {
  const [copied, setCopied] = useState(false);
  const [editedContent, setEditedContent] = useState(result.output || "");
  const [isEdited, setIsEdited] = useState(false);
  const { t } = useLanguage();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const storageKey = `${STORAGE_KEY_PREFIX}${result.modelIndex}`;

  // Sync editedContent when new content comes from transformation
  useEffect(() => {
    setEditedContent(result.output || "");
    setIsEdited(false);
  }, [result.output]);

  // Auto-resize textarea to fit content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || !editedContent) return;

    // Reset height to auto to get accurate scrollHeight
    textarea.style.height = 'auto';
    // Set height to scrollHeight (content height)
    const newHeight = Math.max(textarea.scrollHeight, DEFAULT_HEIGHT);
    textarea.style.height = `${newHeight}px`;
  }, [editedContent]);

  // Load saved height from localStorage
  useEffect(() => {
    const savedHeight = localStorage.getItem(storageKey);
    if (savedHeight && textareaRef.current) {
      textareaRef.current.style.height = `${savedHeight}px`;
    }
  }, [storageKey]);

  // Save height to localStorage on resize
  const handleResize = useCallback(() => {
    if (textareaRef.current) {
      const height = textareaRef.current.offsetHeight;
      localStorage.setItem(storageKey, height.toString());
    }
  }, [storageKey]);

  // Use ResizeObserver to detect resize
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(textarea);

    return () => resizeObserver.disconnect();
  }, [handleResize]);

  const handleCopy = async () => {
    if (!editedContent) return;
    await navigator.clipboard.writeText(editedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleChange = (value: string) => {
    setEditedContent(value);
    setIsEdited(value !== result.output);
  };

  const handleReset = () => {
    setEditedContent(result.output || "");
    setIsEdited(false);
  };

  // Calculate word count for comparison
  const wordCount = editedContent ? editedContent.split(/\s+/).filter(Boolean).length : 0;
  const charCount = editedContent ? editedContent.length : 0;

  return (
    <div className="frost-glass rounded-2xl flex flex-col transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border/30">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{result.model.name}</div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{result.model.provider}</span>
            {result.elapsedTime !== null && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 tabular-nums">
                  <Clock className="w-3 h-3" />
                  {formatTime(result.elapsedTime)}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isEdited && editedContent && !result.isLoading && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-8 px-2 text-muted-foreground hover:text-foreground"
              title={t('output.resetToOriginal')}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
          {editedContent && !result.isLoading && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="h-8 px-2"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
              <TooltipProvider>
                <ChatGPTButton prompt={editedContent} variant="compact" />
              </TooltipProvider>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-3">
        {result.isLoading ? (
          <div className="flex items-center justify-center" style={{ minHeight: `${DEFAULT_HEIGHT}px` }}>
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-primary animate-frost-pulse" />
              <div className="w-2 h-2 rounded-full bg-primary animate-frost-pulse [animation-delay:200ms]" />
              <div className="w-2 h-2 rounded-full bg-primary animate-frost-pulse [animation-delay:400ms]" />
              <span className="ml-2 text-sm">{t('button.generating')}</span>
            </div>
          </div>
        ) : result.error ? (
          <div className="flex items-center gap-2 text-destructive text-sm" style={{ minHeight: `${DEFAULT_HEIGHT}px` }}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{result.error}</span>
          </div>
        ) : editedContent ? (
          <Textarea
            ref={textareaRef}
            value={editedContent}
            onChange={(e) => handleChange(e.target.value)}
            style={{ minHeight: `${DEFAULT_HEIGHT}px` }}
            className="resize-y sm:resize bg-white/20 dark:bg-slate-900/20 rounded-xl text-sm text-foreground font-mono leading-relaxed border-white/30 focus:border-white/60 focus:ring-cb-blue/20 transition-colors duration-300"
          />
        ) : (
          <div className="flex items-center justify-center text-muted-foreground text-sm" style={{ minHeight: `${DEFAULT_HEIGHT}px` }}>
            {t('output.placeholder')}
          </div>
        )}
      </div>

      {/* Footer with stats */}
      {editedContent && !result.isLoading && (
        <div className="px-3 py-2 border-t border-border/30 text-xs text-muted-foreground flex gap-3">
          <span>{wordCount} {t('output.words')}</span>
          <span>{charCount} {t('output.chars')}</span>
          {isEdited && <span className="text-cb-blue">{t('output.edited')}</span>}
        </div>
      )}
    </div>
  );
}

export function ComparisonPanel({ results, isLoading }: ComparisonPanelProps) {
  const { t } = useLanguage();

  if (results.length === 0) {
    return (
      <div className="frost-glass rounded-2xl min-h-[200px] p-4 flex items-center justify-center">
        <div className="text-muted-foreground text-sm text-center">
          {t('compare.placeholder')}
        </div>
      </div>
    );
  }

  // Determine grid columns based on number of results
  const gridClass = results.length === 2
    ? "grid-cols-1 md:grid-cols-2"
    : results.length === 3
    ? "grid-cols-1 md:grid-cols-3"
    : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";

  return (
    <div className="space-y-4">
      <div className={`grid ${gridClass} gap-4`}>
        {results.map((result) => (
          <ResultCard key={result.modelIndex} result={result} />
        ))}
      </div>

      {/* Summary comparison */}
      {!isLoading && results.every(r => r.output && !r.error) && (
        <div className="frost-glass rounded-2xl p-4">
          <h4 className="font-medium text-sm mb-3">{t('compare.summary')}</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {results.map((result) => {
              const wordCount = result.output ? result.output.split(/\s+/).filter(Boolean).length : 0;
              return (
                <div key={result.modelIndex} className="text-center">
                  <div className="font-medium truncate">{result.model.name}</div>
                  <div className="text-muted-foreground text-xs mt-1">
                    {formatTime(result.elapsedTime)} • {wordCount} {t('output.words')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
