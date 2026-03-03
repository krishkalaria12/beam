import { isTauri } from "@tauri-apps/api/core";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { useEffect } from "react";
import { toast } from "sonner";

import { listenAiStreamChunk, listenAiStreamEnd, listenAiStreamError } from "../api/ai";
import { useAiChatStore } from "@/store/use-ai-chat-store";

interface UseAiStreamListenersOptions {
  refreshConversations: (showToast?: boolean) => Promise<void>;
}

export function useAiStreamListeners({ refreshConversations }: UseAiStreamListenersOptions) {
  const appendStreamChunk = useAiChatStore((state) => state.appendStreamChunk);
  const completeStream = useAiChatStore((state) => state.completeStream);
  const failStream = useAiChatStore((state) => state.failStream);

  useEffect(() => {
    if (!isTauri()) {
      return;
    }

    let disposed = false;
    const unlistenFns: UnlistenFn[] = [];

    const setupListeners = async () => {
      try {
        const [unlistenChunk, unlistenEnd, unlistenError] = await Promise.all([
          listenAiStreamChunk((payload) => {
            appendStreamChunk(payload.requestId, payload.text);
          }),
          listenAiStreamEnd((payload) => {
            const completed = completeStream(payload.requestId, payload.fullText);
            if (completed) {
              void refreshConversations(false);
            }
          }),
          listenAiStreamError((payload) => {
            const errorMessage = payload.error || "AI request failed.";
            const failed = failStream(payload.requestId, errorMessage);
            if (failed) {
              toast.error(errorMessage);
            }
          }),
        ]);

        if (disposed) {
          unlistenChunk();
          unlistenEnd();
          unlistenError();
          return;
        }

        unlistenFns.push(unlistenChunk, unlistenEnd, unlistenError);
      } catch (error) {
        if (!disposed) {
          toast.error(
            error instanceof Error ? error.message : "Failed to initialize AI stream listeners.",
          );
        }
      }
    };

    void setupListeners();

    return () => {
      disposed = true;
      for (const unlisten of unlistenFns) {
        unlisten();
      }
    };
  }, [appendStreamChunk, completeStream, failStream, refreshConversations]);
}
