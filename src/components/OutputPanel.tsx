import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Check, RotateCcw, Sparkles } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChatGPTButton } from "@/components/ChatGPTButton";
import { TooltipProvider } from "@/components/ui/tooltip";

const DEFAULT_HEIGHT = 200;

interface OutputPanelProps {
  content: string;
  isLoading?: boolean;
  onChange?: (value: string) => void;
  onNewPrompt?: () => void;
}

export function OutputPanel({ content, isLoading = false, onChange, onNewPrompt }: OutputPanelProps) {
  const [copied, setCopied] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [isEdited, setIsEdited] = useState(false);
  const { t } = useLanguage();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync editedContent when new content comes from transformation
  useEffect(() => {
    setEditedContent(content);
    setIsEdited(false);
  }, [content]);

  // Clean up stale localStorage height (was causing textarea to not auto-expand)
  useEffect(() => {
    localStorage.removeItem("hyokai-output-height");
  }, []);

  // Auto-resize textarea to fit content (always expand to show full text)
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || !editedContent) return;

    // Reset height to auto to get accurate scrollHeight
    textarea.style.height = 'auto';
    // Set height to scrollHeight (content height)
    const newHeight = Math.max(textarea.scrollHeight, DEFAULT_HEIGHT);
    textarea.style.height = `${newHeight}px`;
  }, [editedContent]);

  const handleCopy = async () => {
    if (!editedContent) return;
    await navigator.clipboard.writeText(editedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleChange = (value: string) => {
    setEditedContent(value);
    setIsEdited(value !== content);
    onChange?.(value);
  };

  const handleReset = () => {
    setEditedContent(content);
    setIsEdited(false);
  };

  // Calculate stats from edited content
  const wordCount = editedContent ? editedContent.split(/\s+/).filter(Boolean).length : 0;
  const charCount = editedContent ? editedContent.length : 0;

  return (
    <div className="relative">
      {isLoading ? (
        <div className="frost-glass rounded-2xl p-5 transition-all duration-300" style={{ minHeight: `${DEFAULT_HEIGHT}px` }}>
          <div className="flex items-center justify-center h-[168px]">
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-primary animate-frost-pulse" />
              <div className="w-2 h-2 rounded-full bg-primary animate-frost-pulse [animation-delay:200ms]" />
              <div className="w-2 h-2 rounded-full bg-primary animate-frost-pulse [animation-delay:400ms]" />
              <span className="ml-2 text-sm">{t('button.generating')}</span>
            </div>
          </div>
        </div>
      ) : editedContent ? (
        <div className="space-y-3">
          {/* Action toolbar - outside textarea for cleaner layout */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3">
            {/* Left side: Reset button (only when edited) */}
            <div className="flex items-center gap-2">
              {isEdited && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="h-9 px-3 text-muted-foreground hover:text-foreground gap-1.5"
                  title={t('output.resetToOriginal')}
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('output.resetToOriginal')}</span>
                </Button>
              )}
            </div>

            {/* Right side: Action buttons */}
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
                    {t('output.copied')}
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    {t('output.copy')}
                  </>
                )}
              </Button>
              <TooltipProvider>
                <ChatGPTButton prompt={editedContent} />
              </TooltipProvider>
              {onNewPrompt && (
                <Button
                  variant="frost"
                  size="sm"
                  onClick={onNewPrompt}
                  className="h-9 gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  {t('output.newPrompt')}
                </Button>
              )}
            </div>
          </div>

          {/* Textarea - clean, no overlapping buttons */}
          <Textarea
            ref={textareaRef}
            value={editedContent}
            onChange={(e) => handleChange(e.target.value)}
            style={{ minHeight: `${DEFAULT_HEIGHT}px` }}
            className="resize-y sm:resize frost-glass rounded-2xl text-sm text-foreground font-mono leading-relaxed focus:border-white/60 focus:ring-cb-blue/20 transition-colors duration-300"
          />
          {/* Stats footer - outside textarea */}
          <div className="flex justify-end text-xs text-muted-foreground/70 gap-3 mt-2">
            <span>{wordCount} {t('output.words')}</span>
            <span>{charCount} {t('output.chars')}</span>
            {isEdited && <span className="text-cb-blue">{t('output.edited')}</span>}
          </div>
        </div>
      ) : (
        <div className="frost-glass rounded-2xl p-5 transition-all duration-300" style={{ minHeight: `${DEFAULT_HEIGHT}px` }}>
          <div className="flex items-center justify-center h-[168px] text-muted-foreground text-sm">
            {t('output.placeholder')}
          </div>
        </div>
      )}
    </div>
  );
}
