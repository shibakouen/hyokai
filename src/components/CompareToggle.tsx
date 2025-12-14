import { GitCompare, Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface CompareToggleProps {
  isCompareMode: boolean;
  onToggle: (value: boolean) => void;
}

export function CompareToggle({ isCompareMode, onToggle }: CompareToggleProps) {
  const { t } = useLanguage();

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onToggle(false)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          !isCompareMode
            ? "bg-primary text-black"
            : "bg-muted/50 text-muted-foreground hover:bg-muted"
        }`}
      >
        <Sparkles className="w-4 h-4" />
        {t('compare.single')}
      </button>
      <button
        onClick={() => onToggle(true)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          isCompareMode
            ? "bg-primary text-black"
            : "bg-muted/50 text-muted-foreground hover:bg-muted"
        }`}
      >
        <GitCompare className="w-4 h-4" />
        {t('compare.models')}
      </button>
    </div>
  );
}
