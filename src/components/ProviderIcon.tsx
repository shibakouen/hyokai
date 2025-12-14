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
      'Anthropic': 'bg-orange-500',
      'xAI': 'bg-neutral-800 dark:bg-neutral-200',
      'OpenAI': 'bg-green-600',
      'DeepSeek': 'bg-indigo-500',
      'Zhipu': 'bg-purple-500',
    };
    const colorClass = colors[provider] || 'bg-muted-foreground';

    return (
      <div
        className={`rounded-full ${colorClass} ${className}`}
        style={{ width: size * 0.75, height: size * 0.75 }}
        aria-hidden="true"
      />
    );
  }

  return (
    <img
      src={config.favicon}
      alt={`${provider} icon`}
      width={size}
      height={size}
      className={`object-contain ${className}`}
      onError={() => setHasError(true)}
      loading="lazy"
    />
  );
}
