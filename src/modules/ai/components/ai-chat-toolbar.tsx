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
    <div className="ai-toolbar-enter flex h-11 shrink-0 items-center justify-between border-b border-white/[0.06] px-4">
      {/* Left: Model selector */}
      <div className="flex items-center gap-2">
        {/* Provider dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-7 items-center gap-1.5 rounded-lg bg-white/[0.04] px-2.5 text-[11px] font-medium tracking-[-0.01em] text-white/70 ring-1 ring-white/[0.06] transition-all duration-200 hover:bg-white/[0.07] hover:text-white/90 hover:ring-white/[0.1] focus:outline-none">
            <Sparkles className="size-3 text-[var(--solid-accent,#4ea2ff)]" />
            <span>{providerDefinition.label}</span>
            <ChevronDown className="size-2.5 text-white/40" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-[140px] rounded-xl border-white/[0.08] bg-[#2c2c2c] p-1 shadow-xl shadow-black/40">
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
                    ? "bg-white/[0.08] text-white"
                    : "text-white/60 hover:bg-white/[0.05] hover:text-white/90"
                }`}
              >
                {provider.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Separator dot */}
        <div className="size-1 rounded-full bg-white/[0.15]" />

        {/* Model dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-7 items-center gap-1.5 rounded-lg bg-white/[0.03] px-2.5 text-[11px] tracking-[-0.01em] text-white/50 ring-1 ring-white/[0.05] transition-all duration-200 hover:bg-white/[0.06] hover:text-white/70 hover:ring-white/[0.08] focus:outline-none">
            <Cpu className="size-3 text-white/40" />
            <span className="max-w-[140px] truncate">{currentModelLabel}</span>
            <ChevronDown className="size-2.5 text-white/30" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-h-[280px] min-w-[200px] overflow-y-auto rounded-xl border-white/[0.08] bg-[#2c2c2c] p-1 shadow-xl shadow-black/40">
            {providerDefinition.models.map((model) => (
              <DropdownMenuItem
                key={model.id}
                onClick={() => onModelChange(model.id)}
                className={`rounded-lg px-2.5 py-1.5 text-[11px] tracking-[-0.01em] transition-colors ${
                  model.id === selectedModel
                    ? "bg-white/[0.08] font-medium text-white"
                    : "text-white/60 hover:bg-white/[0.05] hover:text-white/90"
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
          className="flex h-7 items-center gap-1.5 rounded-lg px-2 text-[10px] font-medium uppercase tracking-[0.05em] text-white/35 transition-all duration-200 hover:bg-white/[0.04] hover:text-white/55 disabled:cursor-not-allowed disabled:opacity-40"
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
