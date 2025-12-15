import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect, useRef, useCallback } from "react";

const STORAGE_KEY = "hyokai-input-height";
const DEFAULT_HEIGHT = 200;

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function PromptInput({
  value,
  onChange,
  placeholder,
  disabled = false,
}: PromptInputProps) {
  const { t } = useLanguage();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || t('input.placeholder')}
        disabled={disabled}
        style={{ minHeight: `${DEFAULT_HEIGHT}px` }}
        className="resize-y sm:resize frost-glass rounded-2xl text-foreground placeholder:text-muted-foreground/60 focus:border-white/60 focus:ring-cb-blue/20 transition-colors duration-300"
      />
      <div className="absolute bottom-3 right-3 text-xs text-muted-foreground pointer-events-none">
        {value.length} chars
      </div>
    </div>
  );
}
