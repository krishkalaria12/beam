import type { AttachedFile, MessageWithFiles } from "@/modules/ai/types";

import {
  AI_SELECTED_MODEL_STORAGE_KEY,
  AI_SELECTED_PROVIDER_STORAGE_KEY,
  DEFAULT_AI_PROVIDER_ID,
  getProviderDefinition,
  type AiProviderDefinition,
  type AiProviderId,
} from "../constants";

export function isAiProviderId(value: string): value is AiProviderId {
  return (
    value === "openrouter" || value === "openai" || value === "anthropic" || value === "gemini"
  );
}

export function getSavedProvider(): AiProviderId {
  if (typeof window === "undefined") {
    return DEFAULT_AI_PROVIDER_ID;
  }

  const savedProvider = localStorage.getItem(AI_SELECTED_PROVIDER_STORAGE_KEY)?.trim();
  if (!savedProvider || !isAiProviderId(savedProvider)) {
    return DEFAULT_AI_PROVIDER_ID;
  }

  return savedProvider;
}

export function getSavedModel(provider: AiProviderDefinition): string {
  if (typeof window === "undefined") {
    return provider.models[0]?.id ?? "";
  }

  const savedModel = localStorage.getItem(AI_SELECTED_MODEL_STORAGE_KEY)?.trim();
  if (!savedModel) {
    return provider.models[0]?.id ?? "";
  }

  if (provider.models.some((model) => model.id === savedModel)) {
    return savedModel;
  }

  return provider.models[0]?.id ?? "";
}

export function saveSelectedProvider(providerId: AiProviderId): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(AI_SELECTED_PROVIDER_STORAGE_KEY, providerId);
}

export function saveSelectedModel(modelId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(AI_SELECTED_MODEL_STORAGE_KEY, modelId);
}

export function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return fallback;
}

function tryExtractJsonMessage(raw: string): string | null {
  const jsonStart = raw.indexOf("{");
  if (jsonStart < 0) {
    return null;
  }

  const maybeJson = raw.slice(jsonStart).trim();
  try {
    const parsed = JSON.parse(maybeJson) as {
      message?: unknown;
      error?: { message?: unknown };
    };

    const nestedMessage =
      typeof parsed.error?.message === "string"
        ? parsed.error.message
        : typeof parsed.message === "string"
          ? parsed.message
          : null;

    return nestedMessage?.trim() || null;
  } catch {
    return null;
  }
}

export function extractAiErrorMessage(rawMessage: string): string | null {
  const trimmed = rawMessage.trim();
  if (!trimmed.toLowerCase().startsWith("error:")) {
    return null;
  }

  let normalized = trimmed.replace(/^error:\s*/i, "");
  const jsonMessage = tryExtractJsonMessage(normalized);
  if (jsonMessage) {
    return jsonMessage;
  }

  normalized = normalized
    .replace(/^ai provider request failed:\s*/i, "")
    .replace(/^providererror:\s*/i, "")
    .replace(/^invalid status code\s+\d{3}\s+[a-z ]+\s+with message:\s*/i, "")
    .trim();

  return normalized || "Unknown AI error";
}

export function createId(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function toAskAttachments(files?: AttachedFile[]) {
  return files?.map((file) => ({
    id: file.id,
    name: file.name,
    type: file.type,
    size: file.size,
    data: file.data,
  }));
}

export function conversationTitleFromMessages(messages: MessageWithFiles[]): string {
  const firstUser = messages.find(
    (message) => message.role === "user" && message.content.trim().length > 0,
  );
  return firstUser?.content.trim().slice(0, 80) || "New Chat";
}

export function conversationPreviewFromMessages(messages: MessageWithFiles[]): string {
  const lastMessage = messages[messages.length - 1];
  return lastMessage?.content.trim().slice(0, 120) || "";
}

export function formatConversationTimestamp(value: number): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();
  const isSameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isSameDay) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function defaultModelForProvider(providerId: AiProviderId): string {
  return getProviderDefinition(providerId).models[0]?.id ?? "";
}
