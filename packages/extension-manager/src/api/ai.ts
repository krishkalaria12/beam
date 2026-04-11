import * as crypto from "crypto";
import { sendRuntimeRpcRequest } from "./rpc";

type Creativity = "none" | "low" | "medium" | "high" | "maximum" | number;

enum Model {
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

interface AskOptions {
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

type AskDataListener = (chunk: string) => void;
type AskEndListener = (fullText: string) => void;
type AskErrorListener = (error: Error) => void;

type PendingAsk = {
  dataListeners: Set<AskDataListener>;
  endListeners: Set<AskEndListener>;
  errorListeners: Set<AskErrorListener>;
  ended: boolean;
};

const pendingAsks = new Map<string, PendingAsk>();
const AI_REQUEST_TIMEOUT_MS = 5 * 60 * 1000;

function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  return new Error(String(error));
}

function getPendingAsk(streamRequestId: string): PendingAsk | undefined {
  return pendingAsks.get(streamRequestId);
}

function emitData(streamRequestId: string, chunk: string): void {
  const pending = getPendingAsk(streamRequestId);
  if (!pending) {
    return;
  }

  for (const listener of pending.dataListeners) {
    listener(chunk);
  }
}

function emitEnd(streamRequestId: string, fullText: string): void {
  const pending = getPendingAsk(streamRequestId);
  if (!pending || pending.ended) {
    return;
  }

  pending.ended = true;
  for (const listener of pending.endListeners) {
    listener(fullText);
  }
}

function emitError(streamRequestId: string, error: Error): void {
  const pending = getPendingAsk(streamRequestId);
  if (!pending) {
    return;
  }

  for (const listener of pending.errorListeners) {
    listener(error);
  }
}

function cleanup(streamRequestId: string): void {
  pendingAsks.delete(streamRequestId);
}

function createAbortError(): Error {
  return new Error("The AI request was aborted.");
}

function withListeners(promise: Promise<string>, pending: PendingAsk): AskResult {
  const result = promise as AskResult;

  result.on = ((event: "data" | "end" | "error", listener: unknown) => {
    if (event === "data") {
      pending.dataListeners.add(listener as AskDataListener);
    } else if (event === "end") {
      pending.endListeners.add(listener as AskEndListener);
    } else {
      pending.errorListeners.add(listener as AskErrorListener);
    }
    return result;
  }) as AskResult["on"];

  result.off = ((event: "data" | "end" | "error", listener: unknown) => {
    if (event === "data") {
      pending.dataListeners.delete(listener as AskDataListener);
    } else if (event === "end") {
      pending.endListeners.delete(listener as AskEndListener);
    } else {
      pending.errorListeners.delete(listener as AskErrorListener);
    }
    return result;
  }) as AskResult["off"];

  return result;
}

export function handleAskStreamChunk(streamRequestId: string, chunk: string): void {
  emitData(streamRequestId, chunk);
}

export function handleAskStreamEnd(streamRequestId: string, fullText: string): void {
  emitEnd(streamRequestId, fullText);
}

export function handleAskStreamError(streamRequestId: string, message: string): void {
  emitError(streamRequestId, new Error(message));
}

function ask(prompt: string, options: AskOptions = {}): AskResult {
  const streamRequestId = crypto.randomUUID();
  const pending: PendingAsk = {
    dataListeners: new Set<AskDataListener>(),
    endListeners: new Set<AskEndListener>(),
    errorListeners: new Set<AskErrorListener>(),
    ended: false,
  };
  pendingAsks.set(streamRequestId, pending);

  const startRequest = async (): Promise<string> => {
    if (options.signal?.aborted) {
      throw createAbortError();
    }

    const { signal, ...requestOptions } = options;
    const abortErrorPromise =
      signal &&
      new Promise<string>((_, reject) => {
        signal.addEventListener(
          "abort",
          () => {
            reject(createAbortError());
          },
          { once: true },
        );
      });

    const requestPromise = sendRuntimeRpcRequest<{ fullText?: string }>(
      {
        aiAsk: {
          requestId: "",
          streamRequestId,
          prompt,
          options: requestOptions,
        },
      },
      "ai-ask",
      { timeoutMs: AI_REQUEST_TIMEOUT_MS },
    ).then((result) => {
      const fullText = typeof result?.fullText === "string" ? result.fullText : "";
      emitEnd(streamRequestId, fullText);
      return fullText;
    });

    if (!abortErrorPromise) {
      return requestPromise;
    }

    return Promise.race([requestPromise, abortErrorPromise]);
  };

  const operation = startRequest()
    .catch((error) => {
      const normalized = normalizeError(error);
      emitError(streamRequestId, normalized);
      throw normalized;
    })
    .finally(() => {
      cleanup(streamRequestId);
    });

  return withListeners(operation, pending);
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
