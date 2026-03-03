export type AiProviderId = "openrouter" | "openai" | "anthropic" | "gemini";

export interface AiModelDefinition {
  id: string;
  label: string;
  supportsVision: boolean;
}

export interface AiProviderDefinition {
  id: AiProviderId;
  label: string;
  models: AiModelDefinition[];
}

export const AI_PROVIDERS: readonly AiProviderDefinition[] = [
  {
    id: "openrouter",
    label: "OpenRouter",
    models: [
      {
        id: "moonshotai/kimi-k2.5",
        label: "moonshotai/kimi-k2.5",
        supportsVision: true,
      },
    ],
  },
  {
    id: "openai",
    label: "OpenAI",
    models: [
      {
        id: "gpt-5.2-2025-12-11",
        label: "gpt-5.2-2025-12-11",
        supportsVision: true,
      },
    ],
  },
  {
    id: "anthropic",
    label: "Anthropic",
    models: [
      {
        id: "claude-sonnet-4-6",
        label: "claude-sonnet-4-6",
        supportsVision: true,
      },
    ],
  },
  {
    id: "gemini",
    label: "Gemini",
    models: [
      {
        id: "gemini-3-flash-preview",
        label: "gemini-3-flash-preview",
        supportsVision: true,
      },
    ],
  },
];

export const DEFAULT_AI_PROVIDER_ID: AiProviderId = "openrouter";
export const AI_DEFAULT_CONVERSATION_ID = "default";
export const AI_HISTORY_DEFAULT_LIMIT = 200;
export const AI_CONVERSATION_LIST_LIMIT = 100;

export const AI_SELECTED_PROVIDER_STORAGE_KEY = "beam.ai.selectedProvider";
export const AI_SELECTED_MODEL_STORAGE_KEY = "beam.ai.selectedModel";

export function getProviderDefinition(providerId: AiProviderId): AiProviderDefinition {
  return AI_PROVIDERS.find((provider) => provider.id === providerId) ?? AI_PROVIDERS[0];
}

export function getDefaultModelId(providerId: AiProviderId): string {
  return getProviderDefinition(providerId).models[0]?.id ?? "";
}
