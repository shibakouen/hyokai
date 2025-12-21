// Model pricing tiers based on API cost analysis
// Ultra Premium: $0.085+/req (Opus) - 15/month, Business+ only
// Premium: $0.014-$0.02/req (Sonnet, GPT-5) - 50/month
// Standard: <$0.013/req - Plan limit applies
export type ModelTier = 'ultra_premium' | 'premium' | 'standard';
export type RequiredPlan = 'starter' | 'pro' | 'business' | 'max' | null;

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  thinking?: boolean; // Enable extended thinking/reasoning mode
  tier: ModelTier; // Cost tier for rate limiting
  requiredPlan?: RequiredPlan; // Minimum plan required (null = any plan)
}

// Monthly limits per tier (applies per billing cycle)
export const TIER_LIMITS: Record<ModelTier, number> = {
  ultra_premium: 15,  // Opus - very expensive, strict limit
  premium: 50,        // Sonnet, GPT-5 - moderate limit
  standard: -1,       // No additional limit (plan limit applies)
};

// Plan hierarchy for access control
export const PLAN_HIERARCHY: Record<string, number> = {
  starter: 1,
  pro: 2,
  business: 3,
  max: 4,
};

// Provider display order and local icon paths
export const PROVIDER_CONFIG: Record<string, { order: number; icon: string }> = {
  'Google': { order: 1, icon: '/providers/google.svg' },
  'Anthropic': { order: 2, icon: '/providers/anthropic.svg' },
  'xAI': { order: 3, icon: '/providers/xai.svg' },
  'OpenAI': { order: 4, icon: '/providers/openai.svg' },
  'Qwen': { order: 5, icon: '/providers/qwen.svg' },
  'DeepSeek': { order: 6, icon: '/providers/deepseek.svg' },
  'Zhipu': { order: 7, icon: '/providers/zhipu.svg' },
};

export const PROVIDER_ORDER = ['Google', 'Anthropic', 'xAI', 'OpenAI', 'Qwen', 'DeepSeek', 'Zhipu'];

export interface ModelWithIndex extends AIModel {
  originalIndex: number;
}

export const getModelsByProvider = (): Map<string, ModelWithIndex[]> => {
  const grouped = new Map<string, ModelWithIndex[]>();

  AVAILABLE_MODELS.forEach((model, index) => {
    const existing = grouped.get(model.provider) || [];
    existing.push({ ...model, originalIndex: index });
    grouped.set(model.provider, existing);
  });

  return grouped;
};

export const AVAILABLE_MODELS: AIModel[] = [
  // Google - Standard tier (cost-effective)
  {
    id: "google/gemini-3-pro-preview",
    name: "Gemini 3 Pro",
    provider: "Google",
    tier: "standard"
  },
  {
    id: "google/gemini-3-pro-preview",
    name: "Gemini 3 Pro (Thinking)",
    provider: "Google",
    thinking: true,
    tier: "standard"
  },
  // Anthropic - Sonnet is Premium, Opus is Ultra Premium (Business+ only)
  {
    id: "anthropic/claude-sonnet-4.5",
    name: "Claude Sonnet 4.5",
    provider: "Anthropic",
    tier: "premium"
  },
  {
    id: "anthropic/claude-sonnet-4.5",
    name: "Claude Sonnet 4.5 (Thinking)",
    provider: "Anthropic",
    thinking: true,
    tier: "premium"
  },
  {
    id: "anthropic/claude-opus-4.5",
    name: "Claude Opus 4.5",
    provider: "Anthropic",
    tier: "ultra_premium",
    requiredPlan: "business" // Only Business and Max can use Opus
  },
  {
    id: "anthropic/claude-opus-4.5",
    name: "Claude Opus 4.5 (Thinking)",
    provider: "Anthropic",
    thinking: true,
    tier: "ultra_premium",
    requiredPlan: "business"
  },
  // xAI - Standard tier
  {
    id: "x-ai/grok-4-fast",
    name: "Grok 4 Fast",
    provider: "xAI",
    tier: "standard"
  },
  {
    id: "x-ai/grok-4-fast",
    name: "Grok 4 Fast (Thinking)",
    provider: "xAI",
    thinking: true,
    tier: "standard"
  },
  {
    id: "x-ai/grok-4.1-fast",
    name: "Grok 4.1",
    provider: "xAI",
    tier: "standard"
  },
  {
    id: "x-ai/grok-4.1-fast",
    name: "Grok 4.1 (Thinking)",
    provider: "xAI",
    thinking: true,
    tier: "standard"
  },
  {
    id: "x-ai/grok-code-fast-1",
    name: "Grok Code Fast",
    provider: "xAI",
    tier: "standard"
  },
  {
    id: "x-ai/grok-code-fast-1",
    name: "Grok Code Fast (Thinking)",
    provider: "xAI",
    thinking: true,
    tier: "standard"
  },
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "Google",
    tier: "standard"
  },
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash (Thinking)",
    provider: "Google",
    thinking: true,
    tier: "standard"
  },
  // OpenAI - GPT-5 Mini is standard, GPT-5 is Premium
  {
    id: "openai/gpt-5-mini",
    name: "GPT-5 Mini",
    provider: "OpenAI",
    tier: "standard"
  },
  {
    id: "openai/gpt-5-mini",
    name: "GPT-5 Mini (Thinking)",
    provider: "OpenAI",
    thinking: true,
    tier: "standard"
  },
  {
    id: "openai/gpt-5",
    name: "GPT-5",
    provider: "OpenAI",
    tier: "premium"
  },
  {
    id: "openai/gpt-5",
    name: "GPT-5 (Thinking)",
    provider: "OpenAI",
    thinking: true,
    tier: "premium"
  },
  // Qwen - Standard tier
  {
    id: "qwen/qwen3-coder",
    name: "Qwen3 Coder",
    provider: "Qwen",
    tier: "standard"
  },
  {
    id: "qwen/qwen3-coder",
    name: "Qwen3 Coder (Thinking)",
    provider: "Qwen",
    thinking: true,
    tier: "standard"
  },
  // DeepSeek - Standard tier (very cheap)
  {
    id: "deepseek/deepseek-v3.2",
    name: "DeepSeek V3.2",
    provider: "DeepSeek",
    tier: "standard"
  },
  {
    id: "deepseek/deepseek-v3.2",
    name: "DeepSeek V3.2 (Thinking)",
    provider: "DeepSeek",
    thinking: true,
    tier: "standard"
  },
  // Zhipu - Standard tier
  {
    id: "z-ai/glm-4.6",
    name: "GLM 4.6",
    provider: "Zhipu",
    tier: "standard"
  },
  {
    id: "z-ai/glm-4.6",
    name: "GLM 4.6 (Thinking)",
    provider: "Zhipu",
    thinking: true,
    tier: "standard"
  }
];
