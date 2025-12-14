import { useState } from "react";
import { PROVIDER_CONFIG } from "@/lib/models";

interface ProviderIconProps {
  provider: string;
  size?: number;
  className?: string;
}

export function ProviderIcon({ provider, size = 16, className = "" }: ProviderIconProps) {
  const [hasError, setHasError] = useState(false);
  const config = PROVIDER_CONFIG[provider];

  if (!config || hasError) {
    // Fallback: colored dot based on provider
    const colors: Record<string, string> = {
      'Google': 'bg-blue-500',
      'Anthropic': 'bg-orange-400',
      'xAI': 'bg-neutral-700 dark:bg-neutral-300',
      'OpenAI': 'bg-emerald-500',
      'DeepSeek': 'bg-indigo-500',
      'Zhipu': 'bg-violet-500',
    };
    const colorClass = colors[provider] || 'bg-muted-foreground';

    return (
      <div
        className={`rounded-full flex-shrink-0 ${colorClass} ${className}`}
        style={{ width: size * 0.75, height: size * 0.75 }}
        aria-hidden="true"
      />
    );
  }

  return (
    <img
      src={config.icon}
      alt={`${provider} icon`}
      width={size}
      height={size}
      className={`object-contain flex-shrink-0 ${className}`}
      onError={() => setHasError(true)}
      loading="eager"
    />
  );
}
