import { ChevronLeft, Key, Loader2, Check, ExternalLink, Sparkles } from "lucide-react";
import { AI_PROVIDERS, type AiProviderDefinition, type AiProviderId } from "@/modules/ai/constants";

interface AiSetupViewProps {
  selectedProvider: AiProviderId;
  providerDefinition: AiProviderDefinition;
  apiKeyInput: string;
  isCheckingApiKey: boolean;
  isApiKeySetForProvider: boolean;
  isSavingApiKey: boolean;
  onProviderChange: (providerId: AiProviderId) => void;
  onApiKeyInputChange: (value: string) => void;
  onSaveApiKey: () => void;
  onClearApiKey: () => void;
  onBack: () => void;
  onContinue: () => void;
}

// Provider icons/colors - refined gradient styles
const PROVIDER_STYLES: Record<AiProviderId, { gradient: string; icon: string; color: string }> = {
  openrouter: {
    gradient: "from-violet-500/25 to-purple-600/15",
    icon: "OR",
    color: "text-violet-400",
  },
  openai: { gradient: "from-emerald-500/25 to-teal-600/15", icon: "AI", color: "text-emerald-400" },
  anthropic: {
    gradient: "from-orange-500/25 to-amber-600/15",
    icon: "A",
    color: "text-orange-400",
  },
  gemini: { gradient: "from-blue-500/25 to-indigo-600/15", icon: "G", color: "text-blue-400" },
};

export function AiSetupView({
  selectedProvider,
  providerDefinition,
  apiKeyInput,
  isCheckingApiKey,
  isApiKeySetForProvider,
  isSavingApiKey,
  onProviderChange,
  onApiKeyInputChange,
  onSaveApiKey,
  onClearApiKey,
  onBack,
  onContinue,
}: AiSetupViewProps) {
  const canContinue = isApiKeySetForProvider;

  return (
    <div className="ai-setup-enter flex h-full flex-col text-white">
      {/* Header - refined with better typography */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/[0.06] px-5">
        <button
          type="button"
          onClick={onBack}
          className="flex size-8 items-center justify-center rounded-lg bg-white/[0.04] text-white/50 ring-1 ring-white/[0.06] transition-all duration-200 hover:bg-white/[0.08] hover:text-white/80"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[13px] font-semibold tracking-[-0.01em] text-white/90">AI Setup</h1>
          <p className="text-[11px] tracking-[-0.01em] text-white/40">Configure your AI provider</p>
        </div>
      </header>

      {/* Content - improved spacing and typography */}
      <div className="flex-1 overflow-y-auto px-6 py-8 scrollbar-hidden-until-hover">
        <div className="mx-auto max-w-md space-y-10">
          {/* Hero section - refined typography */}
          <div className="ai-hero-enter text-center">
            <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--solid-accent,#4ea2ff)]/20 to-[var(--solid-accent,#4ea2ff)]/5 ring-1 ring-white/[0.08] shadow-lg shadow-[var(--solid-accent,#4ea2ff)]/10">
              <Sparkles className="size-6 text-[var(--solid-accent,#4ea2ff)]" />
            </div>
            <h2 className="text-[20px] font-semibold tracking-[-0.025em] text-white">
              Connect your AI
            </h2>
            <p className="mx-auto mt-2.5 max-w-xs text-[13px] leading-[1.6] tracking-[-0.01em] text-white/50">
              Add your API key to start chatting with AI models. Your key is stored securely on your
              device.
            </p>
          </div>

          {/* Provider selection - refined card styles */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/40">
                Provider
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-white/[0.08] to-transparent" />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {AI_PROVIDERS.map((provider, idx) => {
                const style = PROVIDER_STYLES[provider.id];
                const isSelected = provider.id === selectedProvider;
                return (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => onProviderChange(provider.id)}
                    className={`
                      ai-provider-card group relative flex items-center gap-3 rounded-xl p-3.5 text-left transition-all duration-200
                      ${
                        isSelected
                          ? "bg-white/[0.07] ring-2 ring-[var(--solid-accent,#4ea2ff)]/60 shadow-lg shadow-[var(--solid-accent,#4ea2ff)]/10"
                          : "bg-white/[0.03] ring-1 ring-white/[0.06] hover:bg-white/[0.05] hover:ring-white/[0.1]"
                      }
                    `}
                    style={{ animationDelay: `${idx * 40}ms` }}
                  >
                    <div
                      className={`flex size-9 items-center justify-center rounded-lg bg-gradient-to-br ${style.gradient} ring-1 ring-white/[0.08]`}
                    >
                      <span className={`text-[11px] font-bold tracking-tight ${style.color}`}>
                        {style.icon}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span
                        className={`block text-[13px] font-medium tracking-[-0.01em] truncate ${isSelected ? "text-white" : "text-white/80"}`}
                      >
                        {provider.label}
                      </span>
                      <span className="text-[11px] tracking-[-0.01em] text-white/35">
                        {provider.models.length} model{provider.models.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {isSelected && (
                      <div className="flex size-5 items-center justify-center rounded-full bg-[var(--solid-accent,#4ea2ff)] shadow-md shadow-[var(--solid-accent,#4ea2ff)]/30">
                        <Check className="size-3 text-white" strokeWidth={2.5} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* API Key input - refined input styling */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/40">
                API Key
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-white/[0.08] to-transparent" />
              {isApiKeySetForProvider && (
                <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-emerald-400">
                  <Check className="size-3" strokeWidth={2.5} />
                  Configured
                </span>
              )}
            </div>

            <div className="space-y-3">
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                  <Key className="size-4 text-white/25" />
                </div>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => onApiKeyInputChange(e.target.value)}
                  placeholder={
                    isApiKeySetForProvider
                      ? "API key already configured"
                      : `Enter your ${providerDefinition.label} API key`
                  }
                  className="h-11 w-full rounded-xl bg-white/[0.04] pl-11 pr-4 text-[13px] tracking-[-0.01em] text-white/90 placeholder:text-white/25 ring-1 ring-white/[0.08] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--solid-accent,#4ea2ff)]/70 focus:bg-white/[0.06]"
                  disabled={isSavingApiKey}
                />
              </div>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={onSaveApiKey}
                  disabled={isSavingApiKey || apiKeyInput.trim().length === 0}
                  className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--solid-accent,#4ea2ff)]/15 text-[12px] font-semibold tracking-[-0.01em] text-[var(--solid-accent,#4ea2ff)] ring-1 ring-[var(--solid-accent,#4ea2ff)]/25 transition-all duration-200 hover:bg-[var(--solid-accent,#4ea2ff)]/25 hover:ring-[var(--solid-accent,#4ea2ff)]/40 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSavingApiKey ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      <Key className="size-3.5" />
                      Save Key
                    </>
                  )}
                </button>
                {isApiKeySetForProvider && (
                  <button
                    type="button"
                    onClick={onClearApiKey}
                    disabled={isSavingApiKey}
                    className="flex h-10 items-center justify-center gap-2 rounded-xl bg-white/[0.04] px-4 text-[12px] font-medium tracking-[-0.01em] text-white/50 ring-1 ring-white/[0.06] transition-all duration-200 hover:bg-white/[0.08] hover:text-white/70 disabled:opacity-40"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Help link - refined */}
              <a
                href={`https://console.${selectedProvider === "openai" ? "openai" : selectedProvider === "anthropic" ? "anthropic" : selectedProvider === "gemini" ? "cloud.google" : "openrouter"}.com`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 pt-1 text-[11px] tracking-[-0.01em] text-white/35 transition-colors hover:text-white/55"
              >
                Get your {providerDefinition.label} API key
                <ExternalLink className="size-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Footer - refined */}
      <footer className="flex h-14 shrink-0 items-center justify-between border-t border-white/[0.06] px-5">
        <div className="flex items-center gap-2 text-[11px] tracking-[-0.01em] text-white/35">
          {isCheckingApiKey ? (
            <>
              <Loader2 className="size-3.5 animate-spin text-white/40" />
              <span>Checking key...</span>
            </>
          ) : isApiKeySetForProvider ? (
            <>
              <Check className="size-3.5 text-emerald-400" strokeWidth={2.5} />
              <span className="text-white/50">Ready to chat</span>
            </>
          ) : (
            <>
              <Key className="size-3.5 text-white/30" />
              <span>API key required</span>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={onContinue}
          disabled={!canContinue}
          className="flex h-9 items-center gap-2 rounded-xl bg-[var(--solid-accent,#4ea2ff)] px-5 text-[12px] font-semibold tracking-[-0.01em] text-white shadow-lg shadow-[var(--solid-accent,#4ea2ff)]/25 transition-all duration-200 hover:shadow-xl hover:shadow-[var(--solid-accent,#4ea2ff)]/35 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
        >
          Continue to Chat
          <ChevronLeft className="size-4 rotate-180" />
        </button>
      </footer>
    </div>
  );
}
