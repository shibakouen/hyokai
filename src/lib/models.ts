export interface AIModel {
  id: string;
  name: string;
  provider: string;
  thinking?: boolean; // Enable extended thinking/reasoning mode
}

// Provider display order and favicon URLs
export const PROVIDER_CONFIG: Record<string, { order: number; favicon: string }> = {
  'Google': { order: 1, favicon: 'https://www.google.com/favicon.ico' },
  'Anthropic': { order: 2, favicon: 'https://anthropic.com/favicon.ico' },
  'xAI': { order: 3, favicon: 'https://x.ai/favicon.ico' },
  'OpenAI': { order: 4, favicon: 'https://openai.com/favicon.ico' },
  'DeepSeek': { order: 5, favicon: 'https://www.deepseek.com/favicon.ico' },
  'Zhipu': { order: 6, favicon: 'https://www.zhipuai.cn/favicon.ico' },
};

export const PROVIDER_ORDER = ['Google', 'Anthropic', 'xAI', 'OpenAI', 'DeepSeek', 'Zhipu'];

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
  {
    id: "google/gemini-3-pro-preview",
    name: "Gemini 3 Pro",
    provider: "Google"
  },
  {
    id: "google/gemini-3-pro-preview",
    name: "Gemini 3 Pro (Thinking)",
    provider: "Google",
    thinking: true
  },
  {
    id: "anthropic/claude-sonnet-4.5",
    name: "Claude Sonnet 4.5",
    provider: "Anthropic"
  },
  {
    id: "anthropic/claude-sonnet-4.5",
    name: "Claude Sonnet 4.5 (Thinking)",
    provider: "Anthropic",
    thinking: true
  },
  {
    id: "x-ai/grok-4-fast",
    name: "Grok 4 Fast",
    provider: "xAI"
  },
  {
    id: "x-ai/grok-4-fast",
    name: "Grok 4 Fast (Thinking)",
    provider: "xAI",
    thinking: true
  },
  {
    id: "x-ai/grok-4.1-fast",
    name: "Grok 4.1",
    provider: "xAI"
  },
  {
    id: "x-ai/grok-4.1-fast",
    name: "Grok 4.1 (Thinking)",
    provider: "xAI",
    thinking: true
  },
  {
    id: "x-ai/grok-code-fast-1",
    name: "Grok Code Fast",
    provider: "xAI"
  },
  {
    id: "x-ai/grok-code-fast-1",
    name: "Grok Code Fast (Thinking)",
    provider: "xAI",
    thinking: true
  },
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "Google"
  },
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash (Thinking)",
    provider: "Google",
    thinking: true
  },
  {
    id: "openai/gpt-5-mini",
    name: "GPT-5 Mini",
    provider: "OpenAI"
  },
  {
    id: "openai/gpt-5-mini",
    name: "GPT-5 Mini (Thinking)",
    provider: "OpenAI",
    thinking: true
  },
  {
    id: "deepseek/deepseek-v3.2",
    name: "DeepSeek V3.2",
    provider: "DeepSeek"
  },
  {
    id: "deepseek/deepseek-v3.2",
    name: "DeepSeek V3.2 (Thinking)",
    provider: "DeepSeek",
    thinking: true
  },
  {
    id: "z-ai/glm-4.6",
    name: "GLM 4.6",
    provider: "Zhipu"
  },
  {
    id: "z-ai/glm-4.6",
    name: "GLM 4.6 (Thinking)",
    provider: "Zhipu",
    thinking: true
  }
];
