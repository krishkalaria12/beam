import { Bot, Loader2, User, Sparkles, FileText } from "lucide-react";
import { useCallback, useMemo } from "react";

import { ShimmeringText } from "@/components/ui/shimmering-text";
import { MessageResponse } from "@/modules/ai/components/ai-message";

import type { MessageWithFiles } from "../types";
import { getFileTypeColor, getFileTypeLabel, isImageFile } from "../utils/ai-file-type";
import { extractAiErrorMessage } from "../utils/ai-chat-utils";

interface AiMessageListProps {
  messages: MessageWithFiles[];
  isLoadingHistory: boolean;
  isStreaming: boolean;
  activeAssistantMessageId: string | null;
}

export function AiMessageList({
  messages,
  isLoadingHistory,
  isStreaming,
  activeAssistantMessageId,
}: AiMessageListProps) {
  const scrollAnchorKey = useMemo(() => {
    const lastMessage = messages[messages.length - 1];
    return [
      activeAssistantMessageId ?? "",
      isStreaming ? "streaming" : "idle",
      messages.length,
      lastMessage?.id ?? "",
      lastMessage?.content?.length ?? 0,
    ].join(":");
  }, [activeAssistantMessageId, isStreaming, messages]);
  const setMessagesEndRef = useCallback((node: HTMLDivElement | null) => {
    node?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);

  return (
    <div className="ai-messages-enter flex-1 min-h-0 overflow-y-auto px-3 py-6 scrollbar-hidden-until-hover">
      {isLoadingHistory ? (
        <div className="flex h-full items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-6 animate-spin text-[var(--ring)]/70" />
            <span className="text-launcher-sm tracking-[-0.01em] text-muted-foreground">
              Loading conversation...
            </span>
          </div>
        </div>
      ) : messages.length === 0 ? (
        <div className="flex h-full items-center justify-center">
          <div className="ai-empty-state flex max-w-sm flex-col items-center text-center">
            <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-[var(--launcher-card-bg)] ring-1 ring-[var(--launcher-card-border)] shadow-lg shadow-[var(--ring)]/10">
              <Sparkles className="size-6 text-[var(--ring)]/80" />
            </div>
            <h3 className="text-launcher-xl font-semibold tracking-[-0.02em] text-foreground">
              Start a conversation
            </h3>
            <p className="mx-auto mt-2.5 max-w-[280px] text-launcher-md leading-[1.6] tracking-[-0.01em] text-muted-foreground">
              Ask anything, attach images or documents, and let AI assist you.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {messages.map((message, idx) => {
            const isUser = message.role === "user";
            const isActiveAssistantMessage =
              !isUser && isStreaming && activeAssistantMessageId === message.id;
            const extractedError = !isUser ? extractAiErrorMessage(message.content) : null;

            return (
              <div
                key={message.id}
                className={`ai-message-item flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                style={{ animationDelay: `${idx * 35}ms` }}
              >
                {/* AI Avatar - only show for assistant */}
                {!isUser && (
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[var(--launcher-card-hover-bg)] ring-1 ring-[var(--launcher-card-border)]">
                    <Bot className="size-4 text-muted-foreground" />
                  </div>
                )}

                {/* Message content wrapper - includes files above message */}
                <div className="flex flex-col items-end gap-2 max-w-[80%] min-w-0">
                  {/* Attached files - show above message for user */}
                  {isUser &&
                    message.files &&
                    message.files.length > 0 &&
                    (() => {
                      const imageFiles = message.files.filter(isImageFile);
                      const docFiles = message.files.filter((f) => !isImageFile(f));

                      return (
                        <div className="flex flex-col gap-2 w-full">
                          {/* Images - grid layout */}
                          {imageFiles.length > 0 && (
                            <div
                              className={`
                            grid gap-1.5
                            ${imageFiles.length === 1 ? "grid-cols-1" : ""}
                            ${imageFiles.length === 2 ? "grid-cols-2" : ""}
                            ${imageFiles.length >= 3 ? "grid-cols-2" : ""}
                          `}
                            >
                              {imageFiles.map((file, fileIdx) => (
                                <div
                                  key={file.id}
                                  className={`
                                  relative overflow-hidden rounded-2xl ring-1 ring-[var(--launcher-card-border)]
                                  ${imageFiles.length === 1 ? "max-w-[280px]" : ""}
                                  ${imageFiles.length === 3 && fileIdx === 0 ? "col-span-2" : ""}
                                `}
                                >
                                  <img
                                    src={file.preview || file.data}
                                    alt={file.name}
                                    className="w-full h-auto object-cover"
                                  />
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Documents - stacked cards */}
                          {docFiles.length > 0 && (
                            <div className="flex flex-col gap-1.5">
                              {docFiles.map((file) => (
                                <div
                                  key={file.id}
                                  className="flex items-center gap-3 rounded-xl bg-[var(--launcher-card-hover-bg)] px-3 py-2.5 ring-1 ring-[var(--launcher-card-border)]"
                                >
                                  <div
                                    className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${getFileTypeColor(file)}`}
                                  >
                                    <FileText className="size-4 text-foreground" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-launcher-md font-medium tracking-[-0.01em] text-foreground">
                                      {file.name}
                                    </p>
                                    <p className="text-launcher-xs tracking-[-0.01em] text-muted-foreground">
                                      {getFileTypeLabel(file)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                  {/* Message bubble */}
                  <div
                    className={`
                    group relative min-w-0 rounded-2xl px-4 py-3
                    ${
                      isUser
                        ? "bg-[var(--ring)] shadow-lg shadow-[var(--ring)]/20"
                        : "bg-[var(--launcher-card-hover-bg)] ring-1 ring-[var(--launcher-card-border)]"
                    }
                  `}
                  >
                    {/* Content */}
                    {message.content ? (
                      isUser ? (
                        <p className="whitespace-pre-wrap break-words text-launcher-lg leading-[1.65] tracking-[-0.01em] text-foreground">
                          {message.content}
                        </p>
                      ) : extractedError ? (
                        <p className="whitespace-pre-wrap break-words text-launcher-lg leading-[1.65] tracking-[-0.01em] text-[var(--icon-red-fg)]">
                          {extractedError}
                        </p>
                      ) : (
                        <MessageResponse
                          className="ai-prose prose prose-sm prose-invert max-w-none break-words text-launcher-lg leading-[1.7] tracking-[-0.01em] text-foreground [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                          isAnimating={isActiveAssistantMessage}
                        >
                          {message.content}
                        </MessageResponse>
                      )
                    ) : isActiveAssistantMessage ? (
                      <div className="flex items-center py-0.5">
                        <ShimmeringText
                          text="Thinking..."
                          duration={1.5}
                          repeatDelay={0.3}
                          spread={1.5}
                          color="var(--muted-foreground)"
                          shimmerColor="var(--foreground)"
                          className="text-launcher-md tracking-[-0.01em]"
                          startOnView={false}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* User Avatar - only show for user */}
                {isUser && (
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[var(--ring)]/20 ring-1 ring-[var(--ring)]/30">
                    <User className="size-4 text-[var(--ring)]" />
                  </div>
                )}
              </div>
            );
          })}
          <div key={scrollAnchorKey} ref={setMessagesEndRef} />
        </div>
      )}
    </div>
  );
}
