import { isTauri } from "@tauri-apps/api/core";
import { useCallback, useEffect } from "react";
import { toast } from "sonner";

import {
  getAiChatHistory,
  getAiConversations,
  getAiSettings,
  isAiApiKeySet,
  type AiPersistedMessage,
} from "../api/ai";
import { AI_CONVERSATION_LIST_LIMIT, AI_HISTORY_DEFAULT_LIMIT } from "../constants";
import { useAiChatStore } from "@/store/use-ai-chat-store";
import type { AttachedFile, MessageWithFiles } from "../types";
import { isImageMimeType } from "../utils/ai-file-type";
import { toErrorMessage } from "../utils/ai-chat-utils";

function parseStructuredAttachments(message: AiPersistedMessage): AttachedFile[] | undefined {
  if (!Array.isArray(message.attachments) || message.attachments.length === 0) {
    return undefined;
  }

  const files = message.attachments
    .map((attachment, index): AttachedFile | null => {
      if (!attachment || typeof attachment !== "object") {
        return null;
      }

      const data = typeof attachment.data === "string" ? attachment.data.trim() : "";
      if (!data) {
        return null;
      }

      const type =
        typeof attachment.type === "string" && attachment.type.trim().length > 0
          ? attachment.type.trim()
          : "application/octet-stream";
      const name =
        typeof attachment.name === "string" && attachment.name.trim().length > 0
          ? attachment.name.trim()
          : `attachment-${index + 1}`;
      const size =
        typeof attachment.size === "number" && Number.isFinite(attachment.size)
          ? Math.max(0, Math.floor(attachment.size))
          : data.length;
      const id =
        typeof attachment.id === "string" && attachment.id.trim().length > 0
          ? attachment.id
          : `${name}-${index}`;

      return {
        id,
        name,
        type,
        size,
        data,
        preview: isImageMimeType(type) ? data : undefined,
      };
    })
    .filter((file): file is AttachedFile => file !== null);

  return files.length > 0 ? files : undefined;
}

function parsePersistedAttachments(rawJson: string | null | undefined): AttachedFile[] | undefined {
  if (!rawJson || rawJson.trim().length === 0) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(rawJson);
    if (!Array.isArray(parsed)) {
      return undefined;
    }

    const files = parsed
      .map((attachment, index): AttachedFile | null => {
        if (!attachment || typeof attachment !== "object") {
          return null;
        }

        const entry = attachment as {
          id?: unknown;
          name?: unknown;
          type?: unknown;
          mimeType?: unknown;
          mime_type?: unknown;
          size?: unknown;
          data?: unknown;
        };

        const data = typeof entry.data === "string" ? entry.data.trim() : "";
        if (!data) {
          return null;
        }

        const typeCandidate =
          typeof entry.type === "string"
            ? entry.type
            : typeof entry.mimeType === "string"
              ? entry.mimeType
              : typeof entry.mime_type === "string"
                ? entry.mime_type
                : "application/octet-stream";
        const normalizedType = typeCandidate.trim() || "application/octet-stream";

        const name =
          typeof entry.name === "string" && entry.name.trim().length > 0
            ? entry.name.trim()
            : `attachment-${index + 1}`;

        const explicitSize =
          typeof entry.size === "number" && Number.isFinite(entry.size)
            ? Math.max(0, Math.floor(entry.size))
            : undefined;

        return {
          id:
            typeof entry.id === "string" && entry.id.trim().length > 0
              ? entry.id
              : `${name}-${index}`,
          name,
          type: normalizedType,
          size: explicitSize ?? data.length,
          data,
          preview: isImageMimeType(normalizedType) ? data : undefined,
        };
      })
      .filter((file): file is AttachedFile => file !== null);

    return files.length > 0 ? files : undefined;
  } catch {
    return undefined;
  }
}

function mapPersistedMessages(history: AiPersistedMessage[]): MessageWithFiles[] {
  return history
    .filter((item) => item.role === "user" || item.role === "assistant")
    .map((item) => ({
      id: item.id,
      role: item.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: item.content,
      createdAt: new Date(item.createdAt),
      files: parseStructuredAttachments(item) ?? parsePersistedAttachments(item.attachmentsJson),
    }));
}

export function useAiChatBootstrap() {
  const selectedProvider = useAiChatStore((state) => state.selectedProvider);
  const activeConversationId = useAiChatStore((state) => state.activeConversationId);
  const setConversations = useAiChatStore((state) => state.setConversations);
  const setMessages = useAiChatStore((state) => state.setMessages);
  const setEnabled = useAiChatStore((state) => state.setEnabled);
  const setIsLoadingSettings = useAiChatStore((state) => state.setIsLoadingSettings);
  const setIsLoadingConversationList = useAiChatStore(
    (state) => state.setIsLoadingConversationList,
  );
  const setIsLoadingHistory = useAiChatStore((state) => state.setIsLoadingHistory);
  const setIsCheckingApiKey = useAiChatStore((state) => state.setIsCheckingApiKey);
  const setIsApiKeySetForProvider = useAiChatStore((state) => state.setIsApiKeySetForProvider);

  const refreshApiKeyStatus = useCallback(
    async (showToast = true): Promise<boolean> => {
      if (!isTauri()) {
        setIsApiKeySetForProvider(false);
        return false;
      }

      setIsCheckingApiKey(true);
      try {
        const isSet = await isAiApiKeySet(selectedProvider);
        setIsApiKeySetForProvider(isSet);
        return isSet;
      } catch (error) {
        setIsApiKeySetForProvider(false);
        if (showToast) {
          toast.error(toErrorMessage(error, "Failed to read API key status."));
        }
        throw error;
      } finally {
        setIsCheckingApiKey(false);
      }
    },
    [selectedProvider, setIsApiKeySetForProvider, setIsCheckingApiKey],
  );

  const refreshConversations = useCallback(
    async (showToast = true): Promise<void> => {
      if (!isTauri()) {
        setConversations([]);
        return;
      }

      setIsLoadingConversationList(true);
      try {
        const entries = await getAiConversations(AI_CONVERSATION_LIST_LIMIT);
        setConversations(entries);
      } catch (error) {
        if (showToast) {
          toast.error(toErrorMessage(error, "Failed to load chats."));
        }
      } finally {
        setIsLoadingConversationList(false);
      }
    },
    [setConversations, setIsLoadingConversationList],
  );

  const loadConversationHistory = useCallback(
    async (conversationId: string, showToast = true): Promise<void> => {
      if (!isTauri()) {
        setMessages([]);
        return;
      }

      setIsLoadingHistory(true);
      try {
        const history = await getAiChatHistory(conversationId, AI_HISTORY_DEFAULT_LIMIT);
        setMessages(mapPersistedMessages(history));
      } catch (error) {
        if (showToast) {
          toast.error(toErrorMessage(error, "Failed to load AI chat history."));
        }
      } finally {
        setIsLoadingHistory(false);
      }
    },
    [setIsLoadingHistory, setMessages],
  );

  useEffect(() => {
    void refreshApiKeyStatus().catch(() => undefined);
  }, [refreshApiKeyStatus]);

  useEffect(() => {
    if (!isTauri()) {
      setIsLoadingSettings(false);
      return;
    }

    let cancelled = false;

    const loadSettings = async () => {
      setIsLoadingSettings(true);
      try {
        const settings = await getAiSettings();
        if (!cancelled) {
          setEnabled(Boolean(settings.enabled));
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(toErrorMessage(error, "Failed to load AI settings."));
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSettings(false);
        }
      }
    };

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, [setEnabled, setIsLoadingSettings]);

  useEffect(() => {
    void refreshConversations(false);
  }, [refreshConversations]);

  useEffect(() => {
    void loadConversationHistory(activeConversationId, false);
  }, [activeConversationId, loadConversationHistory]);

  return {
    refreshApiKeyStatus,
    refreshConversations,
  };
}
