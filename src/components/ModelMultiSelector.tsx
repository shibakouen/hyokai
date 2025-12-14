import { AVAILABLE_MODELS } from "@/lib/models";
import { Check } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ModelMultiSelectorProps {
  selectedIndices: number[];
  onToggle: (index: number) => void;
}

export function ModelMultiSelector({ selectedIndices, onToggle }: ModelMultiSelectorProps) {
  const { t } = useLanguage();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {t('compare.selectModels')} ({selectedIndices.length}/4)
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {AVAILABLE_MODELS.map((model, index) => {
          const isSelected = selectedIndices.includes(index);
          return (
            <button
              key={`${model.id}-${index}`}
              onClick={() => onToggle(index)}
              className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                isSelected
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border/50 bg-muted/30 text-muted-foreground hover:border-primary/50 hover:bg-muted/50"
              }`}
            >
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                  isSelected
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/40"
                }`}
              >
                {isSelected && <Check className="w-3 h-3 text-black" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{model.name}</div>
                <div className="text-xs text-muted-foreground">{model.provider}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
