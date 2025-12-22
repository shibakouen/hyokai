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
    <div className="relative group">
      <Textarea
        ref={textareaRef}
        data-testid="prompt-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || t('input.placeholder')}
        disabled={disabled}
        style={{ minHeight: `${DEFAULT_HEIGHT}px` }}
        className="ice-textarea resize-y sm:resize rounded-2xl text-foreground placeholder:text-muted-foreground/50 transition-all duration-300"
      />
      {/* Character count badge - ice-design styling */}
      <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-full bg-white/60 backdrop-blur-sm border border-white/40 text-xs text-muted-foreground/70 pointer-events-none transition-all duration-200 group-focus-within:border-[#0ea5e9]/30 group-focus-within:bg-white/80">
        {value.length} chars
      </div>
    </div>
  );
}
