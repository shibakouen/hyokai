import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

interface OutputPanelProps {
  content: string;
  isLoading?: boolean;
}

export function OutputPanel({ content, isLoading = false }: OutputPanelProps) {
  const [copied, setCopied] = useState(false);
  const { t } = useLanguage();

  const handleCopy = async () => {
    if (!content) return;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <div className="frost-glass rounded-lg min-h-[200px] p-4 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-[168px]">
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-primary animate-frost-pulse" />
              <div className="w-2 h-2 rounded-full bg-primary animate-frost-pulse [animation-delay:200ms]" />
              <div className="w-2 h-2 rounded-full bg-primary animate-frost-pulse [animation-delay:400ms]" />
              <span className="ml-2 text-sm">{t('button.generating')}</span>
            </div>
          </div>
        ) : content ? (
          <pre className="whitespace-pre-wrap text-sm text-foreground font-mono leading-relaxed">
            {content}
          </pre>
        ) : (
          <div className="flex items-center justify-center h-[168px] text-muted-foreground text-sm">
            {t('output.placeholder')}
          </div>
        )}
      </div>

      {content && !isLoading && (
        <Button
          variant="frost"
          size="sm"
          onClick={handleCopy}
          className="absolute top-3 right-3"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              {t('output.copied')}
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              {t('output.copy')}
            </>
          )}
        </Button>
      )}
    </div>
  );
}
