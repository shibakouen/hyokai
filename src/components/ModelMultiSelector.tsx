import { useMemo } from "react";
import { PROVIDER_ORDER, getModelsByProvider, ModelWithIndex, PLAN_HIERARCHY, type ModelTier } from "@/lib/models";
import { Check, Lock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ProviderIcon } from "@/components/ProviderIcon";
import { useSubscription } from "@/contexts/SubscriptionContext";

// Tier badge styling
const TIER_BADGES: Record<ModelTier, { label: string; className: string } | null> = {
  standard: null, // No badge for standard models
  premium: { label: "Pro", className: "bg-blue-500/15 text-blue-500" },
  ultra_premium: { label: "Business+", className: "bg-amber-500/15 text-amber-500" },
};

interface ModelMultiSelectorProps {
  selectedIndices: number[];
  onToggle: (index: number) => void;
}

interface ModelButtonProps {
  model: ModelWithIndex;
  isSelected: boolean;
  isLocked: boolean;
  onToggle: () => void;
}

function ModelButton({ model, isSelected, isLocked, onToggle }: ModelButtonProps) {
  const tierBadge = TIER_BADGES[model.tier];

  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
        isSelected
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border/50 bg-muted/30 text-muted-foreground hover:border-primary/50 hover:bg-muted/50"
      } ${isLocked ? "opacity-60" : ""}`}
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
          {tierBadge && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${tierBadge.className}`}>
              {tierBadge.label}
            </span>
          )}
          {isLocked && (
            <Lock className="w-3 h-3 text-muted-foreground ml-auto flex-shrink-0" />
          )}
        </div>
      </div>
    </button>
  );
}

export function ModelMultiSelector({ selectedIndices, onToggle }: ModelMultiSelectorProps) {
  const { t } = useLanguage();
  const modelsByProvider = useMemo(() => getModelsByProvider(), []);
  const { subscription } = useSubscription();

  // Check if user has access to a model based on their plan
  const userPlanLevel = subscription?.planId ? PLAN_HIERARCHY[subscription.planId] || 0 : 0;

  const canAccessModel = (requiredPlan: string | null | undefined): boolean => {
    if (!requiredPlan) return true; // No plan required
    const requiredLevel = PLAN_HIERARCHY[requiredPlan] || 0;
    return userPlanLevel >= requiredLevel;
  };

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
                  const isLocked = model.requiredPlan ? !canAccessModel(model.requiredPlan) : false;
                  return (
                    <ModelButton
                      key={model.originalIndex}
                      model={model}
                      isSelected={isSelected}
                      isLocked={isLocked}
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
