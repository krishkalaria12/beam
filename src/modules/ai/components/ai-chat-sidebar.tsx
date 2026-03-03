import { Loader2, MessageSquarePlus, MessageCircle, Settings, PanelLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AiConversationSummary } from "../api/ai";
import { formatConversationTimestamp } from "../utils/ai-chat-utils";

interface AiChatSidebarProps {
  activeConversationId: string;
  conversations: AiConversationSummary[];
  isLoadingConversationList: boolean;
  isStreaming: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onStartNewChat: () => void;
  onSelectConversation: (conversationId: string) => void;
  onOpenSettings?: () => void;
}

export function AiChatSidebar({
  activeConversationId,
  conversations,
  isLoadingConversationList,
  isStreaming,
  isOpen,
  onToggle,
  onStartNewChat,
  onSelectConversation,
  onOpenSettings,
}: AiChatSidebarProps) {
  // Collapsed state - simple icon column
  if (!isOpen) {
    return (
      <aside className="ai-sidebar-enter flex h-full w-[52px] shrink-0 flex-col items-center border-r border-[var(--launcher-card-border)] bg-[var(--launcher-card-hover-bg)] py-3 gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onToggle}
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-all duration-200 hover:bg-[var(--launcher-card-hover-bg)] hover:text-muted-foreground"
          title="Expand sidebar"
        >
          <PanelLeft className="size-4 rotate-180" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onStartNewChat}
          disabled={isStreaming}
          className="flex size-8 items-center justify-center rounded-lg bg-[var(--ring)]/15 text-[var(--ring)] ring-1 ring-[var(--ring)]/20 transition-all duration-200 hover:bg-[var(--ring)]/25 disabled:opacity-40 disabled:cursor-not-allowed"
          title="New Chat"
        >
          <MessageSquarePlus className="size-4" />
        </Button>
        <div className="flex-1" />
        {onOpenSettings && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onOpenSettings}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-all duration-200 hover:bg-[var(--launcher-card-hover-bg)] hover:text-muted-foreground"
            title="Settings"
          >
            <Settings className="size-4" />
          </Button>
        )}
      </aside>
    );
  }

  // Expanded state
  return (
    <aside className="ai-sidebar-enter flex h-full w-[240px] shrink-0 flex-col border-r border-[var(--launcher-card-border)] bg-[var(--launcher-card-hover-bg)]">
      {/* Header - refined typography */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--launcher-card-border)] px-4">
        <span className="text-[12px] font-semibold tracking-[-0.01em] text-muted-foreground">
          Conversations
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onToggle}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-all duration-200 hover:bg-[var(--launcher-card-hover-bg)] hover:text-muted-foreground"
            title="Collapse sidebar"
          >
            <PanelLeft className="size-4" />
          </Button>
          {onOpenSettings && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onOpenSettings}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-all duration-200 hover:bg-[var(--launcher-card-hover-bg)] hover:text-muted-foreground"
              title="Settings"
            >
              <Settings className="size-4" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onStartNewChat}
            disabled={isStreaming}
            className="flex size-8 items-center justify-center rounded-lg bg-[var(--ring)]/15 text-[var(--ring)] ring-1 ring-[var(--ring)]/20 transition-all duration-200 hover:bg-[var(--ring)]/25 disabled:opacity-40 disabled:cursor-not-allowed"
            title="New Chat"
          >
            <MessageSquarePlus className="size-4" />
          </Button>
        </div>
      </header>

      {/* Conversation list - improved spacing and typography */}
      <div className="flex-1 overflow-y-auto py-2.5 scrollbar-hidden-until-hover">
        {isLoadingConversationList ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
            <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-[var(--launcher-card-hover-bg)] ring-1 ring-[var(--launcher-card-border)]">
              <MessageCircle className="size-5 text-muted-foreground" />
            </div>
            <p className="text-[12px] font-medium tracking-[-0.01em] text-muted-foreground">
              No conversations yet
            </p>
            <p className="mt-1.5 text-[11px] tracking-[-0.01em] text-muted-foreground">
              Start a new chat to begin
            </p>
          </div>
        ) : (
          <div className="space-y-1 px-2">
            {conversations.map((conversation, idx) => {
              const isActive = conversation.id === activeConversationId;
              return (
                <Button
                  key={conversation.id}
                  type="button"
                  variant="ghost"
                  onClick={() => onSelectConversation(conversation.id)}
                  className={`
                    ai-chat-item group relative h-auto w-full items-start justify-start rounded-xl px-3 py-3 text-left transition-all duration-150
                    ${
                      isActive
                        ? "bg-[var(--launcher-card-hover-bg)] ring-1 ring-[var(--launcher-card-border)]"
                      : "hover:bg-[var(--launcher-card-hover-bg)]"
                    }
                  `}
                  style={{ animationDelay: `${idx * 25}ms` }}
                >
                  {/* Left accent bar */}
                  <div
                    className={`
                    absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-full transition-all duration-200
                    ${isActive ? "bg-[var(--ring)] opacity-100" : "bg-[var(--launcher-card-hover-bg)] opacity-0 group-hover:opacity-40"}
                  `}
                  />

                  {/* Title row - improved typography */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex-1 truncate text-[12px] font-medium tracking-[-0.01em] ${isActive ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      {conversation.title || "New Chat"}
                    </span>
                    <span className="shrink-0 text-[10px] tabular-nums tracking-tight text-muted-foreground">
                      {formatConversationTimestamp(conversation.updatedAt)}
                    </span>
                  </div>

                  {/* Preview - refined */}
                  <p
                    className={`truncate text-[11px] tracking-[-0.01em] ${isActive ? "text-muted-foreground" : "text-muted-foreground"}`}
                  >
                    {conversation.lastMessagePreview || "No messages yet"}
                  </p>
                </Button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
