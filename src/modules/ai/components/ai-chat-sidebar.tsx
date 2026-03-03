import { Loader2, MessageSquarePlus, MessageCircle, Settings, PanelLeft } from "lucide-react";

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
      <aside className="ai-sidebar-enter flex h-full w-[52px] shrink-0 flex-col items-center border-r border-white/[0.06] bg-white/[0.015] py-3 gap-2">
        <button
          type="button"
          onClick={onToggle}
          className="flex size-8 items-center justify-center rounded-lg text-white/35 transition-all duration-200 hover:bg-white/[0.06] hover:text-white/60"
          title="Expand sidebar"
        >
          <PanelLeft className="size-4 rotate-180" />
        </button>
        <button
          type="button"
          onClick={onStartNewChat}
          disabled={isStreaming}
          className="flex size-8 items-center justify-center rounded-lg bg-[var(--solid-accent,#4ea2ff)]/15 text-[var(--solid-accent,#4ea2ff)] ring-1 ring-[var(--solid-accent,#4ea2ff)]/20 transition-all duration-200 hover:bg-[var(--solid-accent,#4ea2ff)]/25 disabled:opacity-40 disabled:cursor-not-allowed"
          title="New Chat"
        >
          <MessageSquarePlus className="size-4" />
        </button>
        <div className="flex-1" />
        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex size-8 items-center justify-center rounded-lg text-white/35 transition-all duration-200 hover:bg-white/[0.06] hover:text-white/60"
            title="Settings"
          >
            <Settings className="size-4" />
          </button>
        )}
      </aside>
    );
  }

  // Expanded state
  return (
    <aside className="ai-sidebar-enter flex h-full w-[240px] shrink-0 flex-col border-r border-white/[0.06] bg-white/[0.015]">
      {/* Header - refined typography */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.06] px-4">
        <span className="text-[12px] font-semibold tracking-[-0.01em] text-white/60">
          Conversations
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggle}
            className="flex size-8 items-center justify-center rounded-lg text-white/35 transition-all duration-200 hover:bg-white/[0.06] hover:text-white/60"
            title="Collapse sidebar"
          >
            <PanelLeft className="size-4" />
          </button>
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex size-8 items-center justify-center rounded-lg text-white/35 transition-all duration-200 hover:bg-white/[0.06] hover:text-white/60"
              title="Settings"
            >
              <Settings className="size-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onStartNewChat}
            disabled={isStreaming}
            className="flex size-8 items-center justify-center rounded-lg bg-[var(--solid-accent,#4ea2ff)]/15 text-[var(--solid-accent,#4ea2ff)] ring-1 ring-[var(--solid-accent,#4ea2ff)]/20 transition-all duration-200 hover:bg-[var(--solid-accent,#4ea2ff)]/25 disabled:opacity-40 disabled:cursor-not-allowed"
            title="New Chat"
          >
            <MessageSquarePlus className="size-4" />
          </button>
        </div>
      </header>

      {/* Conversation list - improved spacing and typography */}
      <div className="flex-1 overflow-y-auto py-2.5 scrollbar-hidden-until-hover">
        {isLoadingConversationList ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin text-white/25" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
            <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-white/[0.04] ring-1 ring-white/[0.06]">
              <MessageCircle className="size-5 text-white/25" />
            </div>
            <p className="text-[12px] font-medium tracking-[-0.01em] text-white/40">
              No conversations yet
            </p>
            <p className="mt-1.5 text-[11px] tracking-[-0.01em] text-white/25">
              Start a new chat to begin
            </p>
          </div>
        ) : (
          <div className="space-y-1 px-2">
            {conversations.map((conversation, idx) => {
              const isActive = conversation.id === activeConversationId;
              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => onSelectConversation(conversation.id)}
                  className={`
                    ai-chat-item group relative flex w-full flex-col gap-1 rounded-xl px-3 py-3 text-left transition-all duration-150
                    ${
                      isActive ? "bg-white/[0.07] ring-1 ring-white/[0.1]" : "hover:bg-white/[0.04]"
                    }
                  `}
                  style={{ animationDelay: `${idx * 25}ms` }}
                >
                  {/* Left accent bar */}
                  <div
                    className={`
                    absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-full transition-all duration-200
                    ${isActive ? "bg-[var(--solid-accent,#4ea2ff)] opacity-100" : "bg-white/20 opacity-0 group-hover:opacity-40"}
                  `}
                  />

                  {/* Title row - improved typography */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex-1 truncate text-[12px] font-medium tracking-[-0.01em] ${isActive ? "text-white" : "text-white/75"}`}
                    >
                      {conversation.title || "New Chat"}
                    </span>
                    <span className="shrink-0 text-[10px] tabular-nums tracking-tight text-white/30">
                      {formatConversationTimestamp(conversation.updatedAt)}
                    </span>
                  </div>

                  {/* Preview - refined */}
                  <p
                    className={`truncate text-[11px] tracking-[-0.01em] ${isActive ? "text-white/45" : "text-white/35"}`}
                  >
                    {conversation.lastMessagePreview || "No messages yet"}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
