import { isTauri } from "@tauri-apps/api/core";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { AI_DEFAULT_CONVERSATION_ID, getProviderDefinition } from "@/modules/ai/constants";

import {
  askAiStream,
  clearAiApiKey,
  clearAiChatHistory,
  setAiApiKey,
} from "../api/ai";
import { useAiChatBootstrap } from "../hooks/use-ai-chat-bootstrap";
import { useAiStreamListeners } from "../hooks/use-ai-stream-listeners";
import { useAiWindowSizer } from "../hooks/use-ai-window-sizer";
import { useAiChatStore } from "@/store/use-ai-chat-store";
import type { AttachedFile } from "../types";
import {
  conversationPreviewFromMessages,
  conversationTitleFromMessages,
  createId,
  toAskAttachments,
  toErrorMessage,
} from "../utils/ai-chat-utils";
import { AiChatSidebar } from "./ai-chat-sidebar";
import { AiChatToolbar } from "./ai-chat-toolbar";
import { AiMessageList } from "./ai-message-list";
import { AiSetupView } from "./ai-setup-view";
import { ChatInput } from "./chat-input";

interface AiViewProps {
  onBack: () => void;
}

export function AiView({ onBack }: AiViewProps) {
  const [showSetup, setShowSetup] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const selectedProvider = useAiChatStore((state) => state.selectedProvider);
  const selectedModel = useAiChatStore((state) => state.selectedModel);
  const activeConversationId = useAiChatStore((state) => state.activeConversationId);
  const messages = useAiChatStore((state) => state.messages);
  const conversations = useAiChatStore((state) => state.conversations);
  const isEnabled = useAiChatStore((state) => state.isEnabled);
  const isLoadingConversationList = useAiChatStore((state) => state.isLoadingConversationList);
  const isLoadingHistory = useAiChatStore((state) => state.isLoadingHistory);
  const apiKeyInput = useAiChatStore((state) => state.apiKeyInput);
  const isApiKeySetForProvider = useAiChatStore((state) => state.isApiKeySetForProvider);
  const isCheckingApiKey = useAiChatStore((state) => state.isCheckingApiKey);
  const isSavingApiKey = useAiChatStore((state) => state.isSavingApiKey);
  const isClearingChat = useAiChatStore((state) => state.isClearingChat);
  const isStreaming = useAiChatStore((state) => state.isStreaming);
  const activeRequest = useAiChatStore((state) => state.activeRequest);

  const selectProvider = useAiChatStore((state) => state.selectProvider);
  const setSelectedModel = useAiChatStore((state) => state.setSelectedModel);
  const startNewChat = useAiChatStore((state) => state.startNewChat);
  const setActiveConversationId = useAiChatStore((state) => state.setActiveConversationId);
  const setMessages = useAiChatStore((state) => state.setMessages);
  const updateMessages = useAiChatStore((state) => state.updateMessages);
  const setApiKeyInput = useAiChatStore((state) => state.setApiKeyInput);
  const setIsSavingApiKey = useAiChatStore((state) => state.setIsSavingApiKey);
  const setIsClearingChat = useAiChatStore((state) => state.setIsClearingChat);
  const startStreaming = useAiChatStore((state) => state.startStreaming);
  const stopStreaming = useAiChatStore((state) => state.stopStreaming);

  const providerDefinition = useMemo(
    () => getProviderDefinition(selectedProvider),
    [selectedProvider],
  );

  const supportsFiles = useMemo(() => {
    return providerDefinition.models.some(
      (model) => model.id === selectedModel && model.supportsVision,
    );
  }, [providerDefinition.models, selectedModel]);

  const conversationItems = useMemo(() => {
    if (conversations.some((item) => item.id === activeConversationId)) {
      return conversations;
    }

    if (messages.length === 0) {
      return conversations;
    }

    return [
      {
        id: activeConversationId,
        title: conversationTitleFromMessages(messages),
        lastMessagePreview: conversationPreviewFromMessages(messages),
        updatedAt: messages[messages.length - 1]?.createdAt.getTime() ?? Date.now(),
        messageCount: messages.length,
      },
      ...conversations,
    ];
  }, [activeConversationId, conversations, messages]);

  const { refreshApiKeyStatus, refreshConversations } = useAiChatBootstrap();
  useAiStreamListeners({ refreshConversations });
  useAiWindowSizer(); // Window stays at 1100×750

  const handleSaveApiKey = useCallback(async () => {
    const normalizedApiKey = apiKeyInput.trim();
    if (!normalizedApiKey) {
      toast.error("API key cannot be empty.");
      return;
    }

    setIsSavingApiKey(true);
    try {
      await setAiApiKey(selectedProvider, normalizedApiKey);
      setApiKeyInput("");
      const isSet = await refreshApiKeyStatus(false);
      if (!isSet) {
        throw new Error(`Saved ${providerDefinition.label} API key could not be verified.`);
      }
      toast.success(`Saved ${providerDefinition.label} API key.`);
    } catch (error) {
      toast.error(toErrorMessage(error, "Failed to save API key."));
    } finally {
      setIsSavingApiKey(false);
    }
  }, [
    apiKeyInput,
    providerDefinition.label,
    refreshApiKeyStatus,
    selectedProvider,
    setApiKeyInput,
    setIsSavingApiKey,
  ]);

  const handleClearApiKey = useCallback(async () => {
    setIsSavingApiKey(true);
    try {
      await clearAiApiKey(selectedProvider);
      setApiKeyInput("");
      await refreshApiKeyStatus(false);
      toast.success(`Cleared ${providerDefinition.label} API key.`);
    } catch (error) {
      toast.error(toErrorMessage(error, "Failed to clear API key."));
    } finally {
      setIsSavingApiKey(false);
    }
  }, [
    providerDefinition.label,
    refreshApiKeyStatus,
    selectedProvider,
    setApiKeyInput,
    setIsSavingApiKey,
  ]);

  const handleClearChat = useCallback(async () => {
    setIsClearingChat(true);
    try {
      await clearAiChatHistory(activeConversationId);
      setMessages([]);
      await refreshConversations(false);
      toast.success("Cleared chat history.");
    } catch (error) {
      toast.error(toErrorMessage(error, "Failed to clear AI chat history."));
    } finally {
      setIsClearingChat(false);
    }
  }, [activeConversationId, refreshConversations, setIsClearingChat, setMessages]);

  const handleSubmit = useCallback(
    async (messageText: string, files?: AttachedFile[]) => {
      const prompt = messageText.trim();
      if (!prompt || isStreaming) {
        return;
      }

      if (!isTauri()) {
        toast.error("AI chat requires desktop runtime.");
        return;
      }

      if (!isEnabled) {
        toast.error("AI chat is disabled in settings.");
        return;
      }

      let hasApiKey = false;
      try {
        hasApiKey = await refreshApiKeyStatus(false);
      } catch (error) {
        toast.error(toErrorMessage(error, "Failed to read API key status."));
        return;
      }

      if (!hasApiKey) {
        toast.error(`Set your ${providerDefinition.label} API key before chatting.`);
        setShowSetup(true);
        return;
      }

      const userMessageId = createId();
      const assistantMessageId = createId();
      const requestId = createId();

      updateMessages((previous) => [
        ...previous,
        {
          id: userMessageId,
          role: "user",
          content: prompt,
          createdAt: new Date(),
          files,
        },
        {
          id: assistantMessageId,
          role: "assistant",
          content: "",
          createdAt: new Date(),
        },
      ]);

      startStreaming(requestId, assistantMessageId);

      try {
        await askAiStream({
          requestId,
          prompt,
          options: {
            conversationId: activeConversationId || AI_DEFAULT_CONVERSATION_ID,
            provider: selectedProvider,
            model: selectedModel,
            attachments: toAskAttachments(files),
          },
        });
      } catch (error) {
        const errorMessage = toErrorMessage(error, "Failed to send AI request.");
        updateMessages((previous) =>
          previous.map((item) =>
            item.id === assistantMessageId
              ? {
                  ...item,
                  content: `Error: ${errorMessage}`,
                }
              : item,
          ),
        );
        stopStreaming();
        toast.error(errorMessage);
      }
    },
    [
      activeConversationId,
      isEnabled,
      isStreaming,
      providerDefinition.label,
      refreshApiKeyStatus,
      selectedModel,
      selectedProvider,
      startStreaming,
      stopStreaming,
      updateMessages,
    ],
  );

  // Show setup view if API key is not set or user requested it
  if (showSetup || (!isCheckingApiKey && !isApiKeySetForProvider)) {
    return (
      <AiSetupView
        selectedProvider={selectedProvider}
        providerDefinition={providerDefinition}
        apiKeyInput={apiKeyInput}
        isCheckingApiKey={isCheckingApiKey}
        isApiKeySetForProvider={isApiKeySetForProvider}
        isSavingApiKey={isSavingApiKey}
        onProviderChange={selectProvider}
        onApiKeyInputChange={setApiKeyInput}
        onSaveApiKey={handleSaveApiKey}
        onClearApiKey={handleClearApiKey}
        onBack={onBack}
        onContinue={() => setShowSetup(false)}
      />
    );
  }

  return (
    <div className="ai-view-enter flex h-full w-full overflow-hidden text-foreground">
      {/* Sidebar */}
      <AiChatSidebar
        activeConversationId={activeConversationId}
        conversations={conversationItems}
        isLoadingConversationList={isLoadingConversationList}
        isStreaming={isStreaming}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen((prev) => !prev)}
        onStartNewChat={startNewChat}
        onSelectConversation={setActiveConversationId}
        onOpenSettings={() => setShowSetup(true)}
      />

      {/* Main content */}
      <main className="flex flex-1 flex-col min-w-0">
        {/* Toolbar */}
        <AiChatToolbar
          selectedProvider={selectedProvider}
          selectedModel={selectedModel}
          providerDefinition={providerDefinition}
          isClearingChat={isClearingChat}
          isStreaming={isStreaming}
          onProviderChange={selectProvider}
          onModelChange={setSelectedModel}
          onClearChat={handleClearChat}
        />

        {/* Messages */}
        <AiMessageList
          messages={messages}
          isLoadingHistory={isLoadingHistory}
          isStreaming={isStreaming}
          activeAssistantMessageId={activeRequest?.assistantMessageId ?? null}
        />

        {/* Input */}
        <ChatInput onSubmit={handleSubmit} isLoading={isStreaming} supportsFiles={supportsFiles} />
      </main>
    </div>
  );
}
