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
    <div className="relative" data-testid="output-panel">
      {isLoading ? (
        <div className="premium-frost-panel rounded-2xl p-5 transition-all duration-300" style={{ minHeight: `${DEFAULT_HEIGHT}px` }}>
          <div className="flex items-center justify-center h-[168px]">
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="w-2.5 h-2.5 rounded-full bg-[#0ea5e9] animate-frost-pulse shadow-sm shadow-[#0ea5e9]/40" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#0ea5e9] animate-frost-pulse shadow-sm shadow-[#0ea5e9]/40 [animation-delay:200ms]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#0ea5e9] animate-frost-pulse shadow-sm shadow-[#0ea5e9]/40 [animation-delay:400ms]" />
              <span className="ml-2 text-sm font-medium">{t('button.generating')}</span>
            </div>
          </div>
        </div>
      ) : editedContent ? (
        <div className="space-y-3">
          {/* Action toolbar - outside textarea for cleaner layout */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3">
            {/* Left side: Reset button (only when edited) - ice-design styling */}
            <div className="flex items-center gap-2">
              {isEdited && (
                <button
                  onClick={handleReset}
                  className="h-9 px-3 flex items-center gap-1.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-white/50 transition-all duration-200"
                  title={t('output.resetToOriginal')}
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('output.resetToOriginal')}</span>
                </button>
              )}
            </div>

            {/* Right side: Action buttons - ice-design styling */}
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <button
                onClick={handleCopy}
                className="h-9 px-4 flex items-center gap-1.5 rounded-xl bg-white/70 backdrop-blur-sm border border-white/50 text-sm font-medium text-gray-700 hover:bg-white hover:border-[#0ea5e9]/30 hover:shadow-sm transition-all duration-200"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-500" />
                    {t('output.copied')}
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    {t('output.copy')}
                  </>
                )}
              </button>
              <TooltipProvider>
                <ChatGPTButton prompt={editedContent} />
              </TooltipProvider>
              {onNewPrompt && (
                <button
                  onClick={onNewPrompt}
                  className="btn-reveal btn-reveal--brand h-9 text-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="font-medium">{t('output.newPrompt')}</span>
                </button>
              )}
            </div>
          </div>

          {/* Textarea - ice-design premium styling */}
          <Textarea
            ref={textareaRef}
            value={editedContent}
            onChange={(e) => handleChange(e.target.value)}
            style={{ minHeight: `${DEFAULT_HEIGHT}px` }}
            className="resize-y sm:resize ice-textarea rounded-2xl text-sm text-foreground font-mono leading-relaxed"
          />
          {/* Stats footer - ice-design styling */}
          <div className="flex justify-end text-xs gap-3 mt-2">
            <span className="px-2 py-0.5 rounded-full bg-white/50 backdrop-blur-sm text-muted-foreground/70">{wordCount} {t('output.words')}</span>
            <span className="px-2 py-0.5 rounded-full bg-white/50 backdrop-blur-sm text-muted-foreground/70">{charCount} {t('output.chars')}</span>
            {isEdited && <span className="px-2 py-0.5 rounded-full bg-[#0ea5e9]/10 text-[#0ea5e9] font-medium">{t('output.edited')}</span>}
          </div>
        </div>
      ) : (
        <div className="premium-frost-panel rounded-2xl p-5 transition-all duration-300" style={{ minHeight: `${DEFAULT_HEIGHT}px` }}>
          <div className="flex items-center justify-center h-[168px] text-muted-foreground/60 text-sm">
            {t('output.placeholder')}
          </div>
        </div>
      )}
    </div>
  );
}
