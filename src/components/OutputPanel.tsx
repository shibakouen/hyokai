import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Check, RotateCcw } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

const STORAGE_KEY = "hyokai-output-height";
const DEFAULT_HEIGHT = 200;

interface OutputPanelProps {
  content: string;
  isLoading?: boolean;
  onChange?: (value: string) => void;
}

export function OutputPanel({ content, isLoading = false, onChange }: OutputPanelProps) {
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
    const savedHeight = localStorage.getItem(STORAGE_KEY);
    if (savedHeight && textareaRef.current) {
      textareaRef.current.style.height = `${savedHeight}px`;
    }
  }, []);

  // Save height to localStorage on resize
  const handleResize = useCallback(() => {
    if (textareaRef.current) {
      const height = textareaRef.current.offsetHeight;
      localStorage.setItem(STORAGE_KEY, height.toString());
    }
  }, []);

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
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={editedContent}
            onChange={(e) => handleChange(e.target.value)}
            style={{ minHeight: `${DEFAULT_HEIGHT}px` }}
            className="resize-y sm:resize frost-glass rounded-2xl text-sm text-foreground font-mono leading-relaxed focus:border-white/60 focus:ring-cb-blue/20 transition-colors duration-300 pr-24"
          />
          {/* Stats footer */}
          <div className="absolute bottom-3 left-4 text-xs text-muted-foreground/70 pointer-events-none flex gap-3">
            <span>{wordCount} {t('output.words')}</span>
            <span>{charCount} {t('output.chars')}</span>
            {isEdited && <span className="text-cb-blue">{t('output.edited')}</span>}
          </div>
          {/* Action buttons */}
          <div className="absolute top-3 right-3 flex gap-2">
            {isEdited && (
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
            <Button
              variant="frost"
              size="sm"
              onClick={handleCopy}
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
