import { create } from "zustand";

import type { AiConversationSummary } from "@/modules/ai/api/ai";
import {
  AI_DEFAULT_CONVERSATION_ID,
  getProviderDefinition,
  type AiProviderId,
} from "@/modules/ai/constants";
import type { MessageWithFiles } from "@/modules/ai/types";
import {
  createId,
  getSavedModel,
  getSavedProvider,
  saveSelectedModel,
  saveSelectedProvider,
} from "@/modules/ai/utils/ai-chat-utils";

export interface ActiveRequest {
  requestId: string;
  assistantMessageId: string;
}

interface AiChatStoreState {
  selectedProvider: AiProviderId;
  selectedModel: string;
  activeConversationId: string;
  isSidebarOpen: boolean;
  messages: MessageWithFiles[];
  conversations: AiConversationSummary[];
  isEnabled: boolean;
  isLoadingSettings: boolean;
  isSavingEnabled: boolean;
  isLoadingConversationList: boolean;
  isLoadingHistory: boolean;
  apiKeyInput: string;
  isApiKeySetForProvider: boolean;
  isCheckingApiKey: boolean;
  isSavingApiKey: boolean;
  isClearingChat: boolean;
  isStreaming: boolean;
  activeRequest: ActiveRequest | null;
  selectProvider: (providerId: AiProviderId) => void;
  setSelectedModel: (modelId: string) => void;
  startNewChat: () => void;
  setActiveConversationId: (conversationId: string) => void;
  setSidebarOpen: (isOpen: boolean) => void;
  setMessages: (messages: MessageWithFiles[]) => void;
  updateMessages: (updater: (messages: MessageWithFiles[]) => MessageWithFiles[]) => void;
  setConversations: (conversations: AiConversationSummary[]) => void;
  setEnabled: (enabled: boolean) => void;
  setIsLoadingSettings: (isLoading: boolean) => void;
  setIsSavingEnabled: (isSaving: boolean) => void;
  setIsLoadingConversationList: (isLoading: boolean) => void;
  setIsLoadingHistory: (isLoading: boolean) => void;
  setApiKeyInput: (value: string) => void;
  setIsApiKeySetForProvider: (isSet: boolean) => void;
  setIsCheckingApiKey: (isChecking: boolean) => void;
  setIsSavingApiKey: (isSaving: boolean) => void;
  setIsClearingChat: (isClearing: boolean) => void;
  startStreaming: (requestId: string, assistantMessageId: string) => void;
  stopStreaming: () => void;
  appendStreamChunk: (requestId: string, text: string) => boolean;
  completeStream: (requestId: string, fullText: string) => boolean;
  failStream: (requestId: string, error: string) => boolean;
}

const initialProvider = getSavedProvider();
const initialModel = getSavedModel(getProviderDefinition(initialProvider));

export const useAiChatStore = create<AiChatStoreState>((set, get) => ({
  selectedProvider: initialProvider,
  selectedModel: initialModel,
  activeConversationId: AI_DEFAULT_CONVERSATION_ID,
  isSidebarOpen: true,
  messages: [],
  conversations: [],
  isEnabled: true,
  isLoadingSettings: true,
  isSavingEnabled: false,
  isLoadingConversationList: false,
  isLoadingHistory: false,
  apiKeyInput: "",
  isApiKeySetForProvider: false,
  isCheckingApiKey: false,
  isSavingApiKey: false,
  isClearingChat: false,
  isStreaming: false,
  activeRequest: null,
  selectProvider: (providerId) => {
    const defaultModel = getProviderDefinition(providerId).models[0]?.id ?? "";
    saveSelectedProvider(providerId);
    saveSelectedModel(defaultModel);
    set({
      selectedProvider: providerId,
      selectedModel: defaultModel,
    });
  },
  setSelectedModel: (modelId) => {
    saveSelectedModel(modelId);
    set({ selectedModel: modelId });
  },
  startNewChat: () => {
    if (get().isStreaming) {
      return;
    }

    set({
      activeConversationId: createId(),
      messages: [],
    });
  },
  setActiveConversationId: (conversationId) => {
    if (get().isStreaming) {
      return;
    }
    set({ activeConversationId: conversationId });
  },
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
  setMessages: (messages) => set({ messages }),
  updateMessages: (updater) => set((state) => ({ messages: updater(state.messages) })),
  setConversations: (conversations) => set({ conversations }),
  setEnabled: (enabled) => set({ isEnabled: enabled }),
  setIsLoadingSettings: (isLoading) => set({ isLoadingSettings: isLoading }),
  setIsSavingEnabled: (isSaving) => set({ isSavingEnabled: isSaving }),
  setIsLoadingConversationList: (isLoading) => set({ isLoadingConversationList: isLoading }),
  setIsLoadingHistory: (isLoading) => set({ isLoadingHistory: isLoading }),
  setApiKeyInput: (value) => set({ apiKeyInput: value }),
  setIsApiKeySetForProvider: (isSet) => set({ isApiKeySetForProvider: isSet }),
  setIsCheckingApiKey: (isChecking) => set({ isCheckingApiKey: isChecking }),
  setIsSavingApiKey: (isSaving) => set({ isSavingApiKey: isSaving }),
  setIsClearingChat: (isClearing) => set({ isClearingChat: isClearing }),
  startStreaming: (requestId, assistantMessageId) =>
    set({
      activeRequest: { requestId, assistantMessageId },
      isStreaming: true,
    }),
  stopStreaming: () =>
    set({
      activeRequest: null,
      isStreaming: false,
    }),
  appendStreamChunk: (requestId, text) => {
    const activeRequest = get().activeRequest;
    if (!activeRequest || requestId !== activeRequest.requestId) {
      return false;
    }

    set((state) => ({
      messages: state.messages.map((message) =>
        message.id === activeRequest.assistantMessageId
          ? {
              ...message,
              content: `${message.content}${text}`,
            }
          : message,
      ),
    }));

    return true;
  },
  completeStream: (requestId, fullText) => {
    const activeRequest = get().activeRequest;
    if (!activeRequest || requestId !== activeRequest.requestId) {
      return false;
    }

    set((state) => ({
      messages: state.messages.map((message) =>
        message.id === activeRequest.assistantMessageId && message.content.trim().length === 0
          ? {
              ...message,
              content: fullText,
            }
          : message,
      ),
      activeRequest: null,
      isStreaming: false,
    }));

    return true;
  },
  failStream: (requestId, error) => {
    const activeRequest = get().activeRequest;
    if (!activeRequest || requestId !== activeRequest.requestId) {
      return false;
    }

    set((state) => ({
      messages: state.messages.map((message) =>
        message.id === activeRequest.assistantMessageId
          ? {
              ...message,
              content: message.content.trim().length > 0 ? message.content : `Error: ${error}`,
            }
          : message,
      ),
      activeRequest: null,
      isStreaming: false,
    }));

    return true;
  },
}));
