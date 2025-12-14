export interface AIModel {
  id: string;
  name: string;
  provider: string;
  thinking?: boolean; // Enable extended thinking/reasoning mode
}

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
