import { Button } from "@/components/ui/button";
import { Copy, Check, AlertCircle, Clock } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ComparisonResult } from "@/hooks/useModelComparison";

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
  const { t } = useLanguage();

  const handleCopy = async () => {
    if (!result.output) return;
    await navigator.clipboard.writeText(result.output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Calculate word count for comparison
  const wordCount = result.output ? result.output.split(/\s+/).filter(Boolean).length : 0;
  const charCount = result.output ? result.output.length : 0;

  return (
    <div className="frost-glass rounded-lg flex flex-col h-full">
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
        {result.output && !result.isLoading && (
          <Button
            variant="ghost"
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
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-3 overflow-auto min-h-[200px] max-h-[400px]">
        {result.isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-primary animate-frost-pulse" />
              <div className="w-2 h-2 rounded-full bg-primary animate-frost-pulse [animation-delay:200ms]" />
              <div className="w-2 h-2 rounded-full bg-primary animate-frost-pulse [animation-delay:400ms]" />
              <span className="ml-2 text-sm">{t('button.generating')}</span>
            </div>
          </div>
        ) : result.error ? (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{result.error}</span>
          </div>
        ) : result.output ? (
          <pre className="whitespace-pre-wrap text-sm text-foreground font-mono leading-relaxed">
            {result.output}
          </pre>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            {t('output.placeholder')}
          </div>
        )}
      </div>

      {/* Footer with stats */}
      {result.output && !result.isLoading && (
        <div className="px-3 py-2 border-t border-border/30 text-xs text-muted-foreground flex gap-3">
          <span>{wordCount} words</span>
          <span>{charCount} chars</span>
        </div>
      )}
    </div>
  );
}

export function ComparisonPanel({ results, isLoading }: ComparisonPanelProps) {
  const { t } = useLanguage();

  if (results.length === 0) {
    return (
      <div className="frost-glass rounded-lg min-h-[200px] p-4 flex items-center justify-center">
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
        <div className="frost-glass rounded-lg p-4">
          <h4 className="font-medium text-sm mb-3">{t('compare.summary')}</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {results.map((result) => {
              const wordCount = result.output ? result.output.split(/\s+/).filter(Boolean).length : 0;
              return (
                <div key={result.modelIndex} className="text-center">
                  <div className="font-medium truncate">{result.model.name}</div>
                  <div className="text-muted-foreground text-xs mt-1">
                    {formatTime(result.elapsedTime)} • {wordCount} words
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
