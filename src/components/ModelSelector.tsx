import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AVAILABLE_MODELS } from "@/lib/models";

interface ModelSelectorProps {
  value: number; // Index of selected model
  onChange: (value: number) => void;
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const selectedModel = AVAILABLE_MODELS[value];

  return (
    <Select
      value={value.toString()}
      onValueChange={(v) => onChange(parseInt(v, 10))}
    >
      <SelectTrigger className="w-full frost-glass h-11">
        <SelectValue placeholder="Select a model">
          {selectedModel && (
            <span className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {selectedModel.provider}
              </span>
              <span className="text-foreground">{selectedModel.name}</span>
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="frost-glass max-h-[300px]">
        {AVAILABLE_MODELS.map((model, index) => (
          <SelectItem
            key={index}
            value={index.toString()}
            className="cursor-pointer hover:bg-accent/50"
          >
            <div className="flex items-center gap-3 w-full">
              <span className="text-xs text-muted-foreground min-w-[70px]">
                {model.provider}
              </span>
              <span>{model.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
