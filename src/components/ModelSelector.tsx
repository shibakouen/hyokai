import { useMemo } from "react";
import { Lock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AVAILABLE_MODELS, PROVIDER_ORDER, getModelsByProvider, PLAN_HIERARCHY, type ModelTier } from "@/lib/models";
import { ProviderIcon } from "@/components/ProviderIcon";
import { useSubscription } from "@/contexts/SubscriptionContext";

// Tier badge styling
const TIER_BADGES: Record<ModelTier, { label: string; className: string } | null> = {
  standard: null, // No badge for standard models
  premium: { label: "Pro", className: "bg-blue-500/15 text-blue-500" },
  ultra_premium: { label: "Business+", className: "bg-amber-500/15 text-amber-500" },
};

interface ModelSelectorProps {
  value: number; // Index of selected model
  onChange: (value: number) => void;
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const selectedModel = AVAILABLE_MODELS[value];
  const modelsByProvider = useMemo(() => getModelsByProvider(), []);
  const { subscription } = useSubscription();

  // Check if user has access to a model based on their plan
  const userPlanLevel = subscription?.planId ? PLAN_HIERARCHY[subscription.planId] || 0 : 0;

  const canAccessModel = (requiredPlan: string | null | undefined): boolean => {
    if (!requiredPlan) return true; // No plan required
    const requiredLevel = PLAN_HIERARCHY[requiredPlan] || 0;
    return userPlanLevel >= requiredLevel;
  };

  const tierBadge = selectedModel?.tier ? TIER_BADGES[selectedModel.tier] : null;
  const isLocked = selectedModel?.requiredPlan && !canAccessModel(selectedModel.requiredPlan);

  return (
    <Select
      value={value.toString()}
      onValueChange={(v) => onChange(parseInt(v, 10))}
    >
      <SelectTrigger className="w-full frost-glass h-11">
        <SelectValue placeholder="Select a model">
          {selectedModel && (
            <span className="flex items-center gap-2">
              <ProviderIcon provider={selectedModel.provider} size={16} />
              <span className="text-foreground">{selectedModel.name}</span>
              {selectedModel.thinking && (
                <span className="text-[10px] bg-primary/15 text-primary font-medium px-1.5 py-0.5 rounded-full">
                  Extended
                </span>
              )}
              {tierBadge && (
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${tierBadge.className}`}>
                  {tierBadge.label}
                </span>
              )}
              {isLocked && (
                <Lock className="w-3 h-3 text-muted-foreground" />
              )}
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="frost-glass max-h-[400px]">
        {PROVIDER_ORDER.map((provider) => {
          const models = modelsByProvider.get(provider);
          if (!models?.length) return null;

          return (
            <SelectGroup key={provider}>
              <SelectLabel className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground/70 px-2 py-2 sticky top-0 bg-card/95 backdrop-blur-sm">
                <ProviderIcon provider={provider} size={14} />
                <span>{provider}</span>
              </SelectLabel>
              {models.map((model) => {
                const modelTierBadge = TIER_BADGES[model.tier];
                const modelLocked = model.requiredPlan && !canAccessModel(model.requiredPlan);

                return (
                  <SelectItem
                    key={model.originalIndex}
                    value={model.originalIndex.toString()}
                    className={`cursor-pointer hover:bg-accent/50 pl-6 ${modelLocked ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <span>{model.name.replace(' (Thinking)', '')}</span>
                      {model.thinking && (
                        <span className="text-[10px] bg-primary/15 text-primary font-medium px-1.5 py-0.5 rounded-full">
                          Extended
                        </span>
                      )}
                      {modelTierBadge && (
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${modelTierBadge.className}`}>
                          {modelTierBadge.label}
                        </span>
                      )}
                      {modelLocked && (
                        <Lock className="w-3 h-3 text-muted-foreground ml-auto" />
                      )}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectGroup>
          );
        })}
      </SelectContent>
    </Select>
  );
}
