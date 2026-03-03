export type Creativity = "none" | "low" | "medium" | "high" | "maximum" | number;

export enum Model {
  "OpenAI_GPT4.1" = "OpenAI_GPT4.1",
  "OpenAI_GPT4.1-mini" = "OpenAI_GPT4.1-mini",
  "OpenAI_GPT4.1-nano" = "OpenAI_GPT4.1-nano",
  OpenAI_GPT4 = "OpenAI_GPT4",
  "OpenAI_GPT4-turbo" = "OpenAI_GPT4-turbo",
  OpenAI_GPT4o = "OpenAI_GPT4o",
  "OpenAI_GPT4o-mini" = "OpenAI_GPT4o-mini",
  OpenAI_o3 = "OpenAI_o3",
  "OpenAI_o4-mini" = "OpenAI_o4-mini",
  OpenAI_o1 = "OpenAI_o1",
  "OpenAI_o3-mini" = "OpenAI_o3-mini",
  Anthropic_Claude_Haiku = "Anthropic_Claude_Haiku",
  Anthropic_Claude_Sonnet = "Anthropic_Claude_Sonnet",
  "Anthropic_Claude_Sonnet_3.7" = "Anthropic_Claude_Sonnet_3.7",
  Anthropic_Claude_Opus = "Anthropic_Claude_Opus",
  Anthropic_Claude_4_Sonnet = "Anthropic_Claude_4_Sonnet",
  Anthropic_Claude_4_Opus = "Anthropic_Claude_4_Opus",
  Perplexity_Sonar = "Perplexity_Sonar",
  Perplexity_Sonar_Pro = "Perplexity_Sonar_Pro",
  Perplexity_Sonar_Reasoning = "Perplexity_Sonar_Reasoning",
  Perplexity_Sonar_Reasoning_Pro = "Perplexity_Sonar_Reasoning_Pro",
  Llama4_Scout = "Llama4_Scout",
  "Llama3.3_70B" = "Llama3.3_70B",
  "Llama3.1_8B" = "Llama3.1_8B",
  "Llama3.1_405B" = "Llama3.1_405B",
  Mistral_Nemo = "Mistral_Nemo",
  Mistral_Large = "Mistral_Large",
  Mistral_Medium = "Mistral_Medium",
  Mistral_Small = "Mistral_Small",
  Mistral_Codestral = "Mistral_Codestral",
  "DeepSeek_R1_Distill_Llama_3.3_70B" = "DeepSeek_R1_Distill_Llama_3.3_70B",
  DeepSeek_R1 = "DeepSeek_R1",
  DeepSeek_V3 = "DeepSeek_V3",
  "Google_Gemini_2.5_Pro" = "Google_Gemini_2.5_Pro",
  "Google_Gemini_2.5_Flash" = "Google_Gemini_2.5_Flash",
  "Google_Gemini_2.0_Flash" = "Google_Gemini_2.0_Flash",
  xAI_Grok_3 = "xAI_Grok_3",
  xAI_Grok_3_Mini = "xAI_Grok_3_Mini",
  xAI_Grok_2 = "xAI_Grok_2",
}

export interface AskOptions {
  creativity?: Creativity;
  model?: string;
  provider?: "openrouter" | "openai" | "anthropic" | "gemini";
  modelMappings?: Record<string, string>;
  signal?: AbortSignal;
}

interface AskResult extends Promise<string> {
  on(event: "data", listener: (chunk: string) => void): this;
  on(event: "end", listener: (fullText: string) => void): this;
  on(event: "error", listener: (error: Error) => void): this;
  off(event: "data", listener: (chunk: string) => void): this;
  off(event: "end", listener: (fullText: string) => void): this;
  off(event: "error", listener: (error: Error) => void): this;
}

function unsupportedError(): Error {
  return new Error(
    "AI is a native Beam feature and is not available through the extension sidecar runtime.",
  );
}

export function ask(_prompt: string, _options: AskOptions = {}): AskResult {
  const promise = Promise.reject(unsupportedError()) as AskResult;
  promise.on = (() => promise) as AskResult["on"];
  promise.off = (() => promise) as AskResult["off"];
  return promise;
}

export const AI = {
  ask,
  Model,
  Creativity: {
    none: "none" as const,
    low: "low" as const,
    medium: "medium" as const,
    high: "high" as const,
    maximum: "maximum" as const,
  },
};
