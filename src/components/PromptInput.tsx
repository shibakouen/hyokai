import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";

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

  return (
    <div className="relative">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || t('input.placeholder')}
        disabled={disabled}
        className="min-h-[160px] resize-none frost-glass text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/20 transition-all duration-300"
      />
      <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
        {value.length} chars
      </div>
    </div>
  );
}
