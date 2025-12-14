import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AVAILABLE_MODELS, PROVIDER_ORDER, getModelsByProvider } from "@/lib/models";
import { ProviderIcon } from "@/components/ProviderIcon";

interface ModelSelectorProps {
  value: number; // Index of selected model
  onChange: (value: number) => void;
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const selectedModel = AVAILABLE_MODELS[value];
  const modelsByProvider = useMemo(() => getModelsByProvider(), []);

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
              {models.map((model) => (
                <SelectItem
                  key={model.originalIndex}
                  value={model.originalIndex.toString()}
                  className="cursor-pointer hover:bg-accent/50 pl-6"
                >
                  <div className="flex items-center gap-2 w-full">
                    <span>{model.name.replace(' (Thinking)', '')}</span>
                    {model.thinking && (
                      <span className="text-[10px] bg-primary/15 text-primary font-medium px-1.5 py-0.5 rounded-full">
                        Extended
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          );
        })}
      </SelectContent>
    </Select>
  );
}
