import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

import type { AttachedFile } from "@/modules/ai/types";

import { assertAiDesktopRuntime, getInvokeErrorMessage } from "./runtime";

interface AiSettings {
  enabled: boolean;
  modelAssociations: Record<string, string>;
}

interface AskAiStreamOptions {
  model?: string;
  provider?: string;
  conversationId?: string;
  creativity?: string;
  modelMappings?: Record<string, string>;
  attachments?: AttachedFile[];
}

interface AiStreamChunkPayload {
  requestId: string;
  text: string;
}

interface AiStreamEndPayload {
  requestId: string;
  fullText: string;
}

interface AiStreamErrorPayload {
  requestId: string;
  error: string;
}

export interface AiPersistedMessage {
  id: string;
  requestId: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  provider: string;
  model: string;
  content: string;
  attachmentsJson?: string | null;
  attachments?: Array<{
    id?: string;
    name?: string;
    type?: string;
    size?: number;
    data: string;
  }>;
  createdAt: number;
}

interface AiTokenUsageSummary {
  requestCount: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedInputTokens: number;
}

export interface AiConversationSummary {
  id: string;
  title: string;
  lastMessagePreview: string;
  updatedAt: number;
  messageCount: number;
}

function conversationArgs(conversationId?: string): {
  conversationId?: string;
  conversation_id?: string;
} {
  return { conversationId, conversation_id: conversationId };
}

function providerArgs(providerId: string): { providerId: string; provider_id: string } {
  return { providerId, provider_id: providerId };
}

export async function getAiSettings(): Promise<AiSettings> {
  assertAiDesktopRuntime();

  try {
    return await invoke<AiSettings>("get_ai_settings");
  } catch (error) {
    throw new Error(getInvokeErrorMessage(error, "Failed to load AI settings."));
  }
}

async function setAiSettings(settings: AiSettings): Promise<void> {
  assertAiDesktopRuntime();

  try {
    await invoke("set_ai_settings", { settings });
  } catch (error) {
    throw new Error(getInvokeErrorMessage(error, "Failed to save AI settings."));
  }
}

export async function getAiChatHistory(
  conversationId?: string,
  limit?: number,
): Promise<AiPersistedMessage[]> {
  assertAiDesktopRuntime();

  try {
    return await invoke<AiPersistedMessage[]>("get_ai_chat_history", {
      ...conversationArgs(conversationId),
      limit,
    });
  } catch (error) {
    throw new Error(getInvokeErrorMessage(error, "Failed to load AI chat history."));
  }
}

export async function getAiConversations(limit?: number): Promise<AiConversationSummary[]> {
  assertAiDesktopRuntime();

  try {
    return await invoke<AiConversationSummary[]>("get_ai_conversations", { limit });
  } catch (error) {
    throw new Error(getInvokeErrorMessage(error, "Failed to load AI conversations."));
  }
}

export async function clearAiChatHistory(conversationId?: string): Promise<void> {
  assertAiDesktopRuntime();

  try {
    await invoke("clear_ai_chat_history", conversationArgs(conversationId));
  } catch (error) {
    throw new Error(getInvokeErrorMessage(error, "Failed to clear AI chat history."));
  }
}

async function getAiTokenUsageSummary(
  conversationId?: string,
): Promise<AiTokenUsageSummary> {
  assertAiDesktopRuntime();

  try {
    return await invoke<AiTokenUsageSummary>(
      "get_ai_token_usage_summary",
      conversationArgs(conversationId),
    );
  } catch (error) {
    throw new Error(getInvokeErrorMessage(error, "Failed to load AI token usage."));
  }
}

export async function setAiApiKey(providerId: string, key: string): Promise<void> {
  assertAiDesktopRuntime();

  try {
    await invoke("set_ai_api_key", { ...providerArgs(providerId), key });
  } catch (error) {
    throw new Error(getInvokeErrorMessage(error, "Failed to save API key."));
  }
}

export async function isAiApiKeySet(providerId: string): Promise<boolean> {
  assertAiDesktopRuntime();

  try {
    return await invoke<boolean>("is_ai_api_key_set", providerArgs(providerId));
  } catch (error) {
    throw new Error(getInvokeErrorMessage(error, "Failed to read API key status."));
  }
}

export async function clearAiApiKey(providerId: string): Promise<void> {
  assertAiDesktopRuntime();

  try {
    await invoke("clear_ai_api_key", providerArgs(providerId));
  } catch (error) {
    throw new Error(getInvokeErrorMessage(error, "Failed to clear API key."));
  }
}

export async function askAiStream(input: {
  requestId: string;
  prompt: string;
  options: AskAiStreamOptions;
}): Promise<void> {
  assertAiDesktopRuntime();

  try {
    await invoke("ai_ask_stream", {
      requestId: input.requestId,
      prompt: input.prompt,
      options: input.options,
    });
  } catch (error) {
    throw new Error(getInvokeErrorMessage(error, "Failed to start AI stream."));
  }
}

export async function listenAiStreamChunk(
  handler: (payload: AiStreamChunkPayload) => void,
): Promise<UnlistenFn> {
  assertAiDesktopRuntime();

  return listen<AiStreamChunkPayload>("ai-stream-chunk", (event) => {
    handler(event.payload);
  });
}

export async function listenAiStreamEnd(
  handler: (payload: AiStreamEndPayload) => void,
): Promise<UnlistenFn> {
  assertAiDesktopRuntime();

  return listen<AiStreamEndPayload>("ai-stream-end", (event) => {
    handler(event.payload);
  });
}

export async function listenAiStreamError(
  handler: (payload: AiStreamErrorPayload) => void,
): Promise<UnlistenFn> {
  assertAiDesktopRuntime();

  return listen<AiStreamErrorPayload>("ai-stream-error", (event) => {
    handler(event.payload);
  });
}
