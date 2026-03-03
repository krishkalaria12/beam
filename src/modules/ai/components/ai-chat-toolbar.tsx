import { ChevronDown, Trash2, Loader2, Sparkles, Cpu } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AI_PROVIDERS, type AiProviderDefinition, type AiProviderId } from "@/modules/ai/constants";
import { isAiProviderId } from "@/modules/ai/utils/ai-chat-utils";

interface AiChatToolbarProps {
  selectedProvider: AiProviderId;
  selectedModel: string;
  providerDefinition: AiProviderDefinition;
  isClearingChat: boolean;
  isStreaming: boolean;
  onProviderChange: (providerId: AiProviderId) => void;
  onModelChange: (modelId: string) => void;
  onClearChat: () => void;
}

export function AiChatToolbar({
  selectedProvider,
  selectedModel,
  providerDefinition,
  isClearingChat,
  isStreaming,
  onProviderChange,
  onModelChange,
  onClearChat,
}: AiChatToolbarProps) {
  // Find current model label
  const currentModelLabel =
    providerDefinition.models.find((m) => m.id === selectedModel)?.label || selectedModel;

  return (
    <div className="ai-toolbar-enter flex h-11 shrink-0 items-center justify-between border-b border-[var(--launcher-card-border)] px-4">
      {/* Left: Model selector */}
      <div className="flex items-center gap-2">
        {/* Provider dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-7 items-center gap-1.5 rounded-lg bg-[var(--launcher-card-hover-bg)] px-2.5 text-[11px] font-medium tracking-[-0.01em] text-foreground/70 ring-1 ring-[var(--launcher-card-border)] transition-all duration-200 hover:bg-[var(--launcher-card-hover-bg)] hover:text-foreground/90 hover:ring-[var(--launcher-card-border)] focus:outline-none">
            <Sparkles className="size-3 text-[var(--ring)]" />
            <span>{providerDefinition.label}</span>
            <ChevronDown className="size-2.5 text-foreground/40" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-[140px] rounded-xl border-[var(--launcher-card-border)] bg-[var(--popover)] p-1 shadow-xl shadow-black/40">
            {AI_PROVIDERS.map((provider) => (
              <DropdownMenuItem
                key={provider.id}
                onClick={() => {
                  if (isAiProviderId(provider.id)) {
                    onProviderChange(provider.id);
                  }
                }}
                className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium tracking-[-0.01em] transition-colors ${
                  provider.id === selectedProvider
                    ? "bg-[var(--launcher-card-hover-bg)] text-foreground"
                    : "text-foreground/60 hover:bg-[var(--launcher-card-hover-bg)] hover:text-foreground/90"
                }`}
              >
                {provider.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Separator dot */}
        <div className="size-1 rounded-full bg-[var(--launcher-card-hover-bg)]" />

        {/* Model dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-7 items-center gap-1.5 rounded-lg bg-[var(--launcher-card-hover-bg)] px-2.5 text-[11px] tracking-[-0.01em] text-foreground/50 ring-1 ring-[var(--launcher-card-border)] transition-all duration-200 hover:bg-[var(--launcher-card-hover-bg)] hover:text-foreground/70 hover:ring-[var(--launcher-card-border)] focus:outline-none">
            <Cpu className="size-3 text-foreground/40" />
            <span className="max-w-[140px] truncate">{currentModelLabel}</span>
            <ChevronDown className="size-2.5 text-foreground/30" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-h-[280px] min-w-[200px] overflow-y-auto rounded-xl border-[var(--launcher-card-border)] bg-[var(--popover)] p-1 shadow-xl shadow-black/40">
            {providerDefinition.models.map((model) => (
              <DropdownMenuItem
                key={model.id}
                onClick={() => onModelChange(model.id)}
                className={`rounded-lg px-2.5 py-1.5 text-[11px] tracking-[-0.01em] transition-colors ${
                  model.id === selectedModel
                    ? "bg-[var(--launcher-card-hover-bg)] font-medium text-foreground"
                    : "text-foreground/60 hover:bg-[var(--launcher-card-hover-bg)] hover:text-foreground/90"
                }`}
              >
                {model.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onClearChat}
          disabled={isClearingChat || isStreaming}
          className="flex h-7 items-center gap-1.5 rounded-lg px-2 text-[10px] font-medium uppercase tracking-[0.05em] text-foreground/35 transition-all duration-200 hover:bg-[var(--launcher-card-hover-bg)] hover:text-foreground/55 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isClearingChat ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Trash2 className="size-3" />
          )}
          Clear
        </button>
      </div>
    </div>
  );
}
