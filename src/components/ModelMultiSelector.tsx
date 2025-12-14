import { useMemo } from "react";
import { PROVIDER_ORDER, getModelsByProvider, ModelWithIndex } from "@/lib/models";
import { Check } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ProviderIcon } from "@/components/ProviderIcon";

interface ModelMultiSelectorProps {
  selectedIndices: number[];
  onToggle: (index: number) => void;
}

interface ModelButtonProps {
  model: ModelWithIndex;
  isSelected: boolean;
  onToggle: () => void;
}

function ModelButton({ model, isSelected, onToggle }: ModelButtonProps) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
        isSelected
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border/50 bg-muted/30 text-muted-foreground hover:border-primary/50 hover:bg-muted/50"
      }`}
    >
      <div
        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
          isSelected
            ? "border-primary bg-primary"
            : "border-muted-foreground/40"
        }`}
      >
        {isSelected && <Check className="w-3 h-3 text-black" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">
            {model.name.replace(' (Thinking)', '')}
          </span>
          {model.thinking && (
            <span className="text-[10px] bg-primary/15 text-primary font-medium px-1.5 py-0.5 rounded-full flex-shrink-0">
              Extended
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export function ModelMultiSelector({ selectedIndices, onToggle }: ModelMultiSelectorProps) {
  const { t } = useLanguage();
  const modelsByProvider = useMemo(() => getModelsByProvider(), []);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {t('compare.selectModels')} ({selectedIndices.length}/4)
        </span>
      </div>
      <div className="space-y-4">
        {PROVIDER_ORDER.map((provider) => {
          const models = modelsByProvider.get(provider);
          if (!models?.length) return null;

          return (
            <div key={provider} className="space-y-2">
              <h4 className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground/70">
                <ProviderIcon provider={provider} size={14} />
                <span>{provider}</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {models.map((model) => {
                  const isSelected = selectedIndices.includes(model.originalIndex);
                  return (
                    <ModelButton
                      key={model.originalIndex}
                      model={model}
                      isSelected={isSelected}
                      onToggle={() => onToggle(model.originalIndex)}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
