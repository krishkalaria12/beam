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
    <div className="ai-setup-enter flex h-full flex-col text-foreground">
      {/* Header - refined with better typography */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--launcher-card-border)] px-5">
        <button
          type="button"
          onClick={onBack}
          className="flex size-8 items-center justify-center rounded-lg bg-[var(--launcher-card-hover-bg)] text-foreground/50 ring-1 ring-[var(--launcher-card-border)] transition-all duration-200 hover:bg-[var(--launcher-card-hover-bg)] hover:text-foreground/80"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[13px] font-semibold tracking-[-0.01em] text-foreground/90">
            AI Setup
          </h1>
          <p className="text-[11px] tracking-[-0.01em] text-foreground/40">
            Configure your AI provider
          </p>
        </div>
      </header>

      {/* Content - improved spacing and typography */}
      <div className="flex-1 overflow-y-auto px-6 py-8 scrollbar-hidden-until-hover">
        <div className="mx-auto max-w-md space-y-10">
          {/* Hero section - refined typography */}
          <div className="ai-hero-enter text-center">
            <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--ring)]/20 to-[var(--ring)]/5 ring-1 ring-[var(--launcher-card-border)] shadow-lg shadow-[var(--ring)]/10">
              <Sparkles className="size-6 text-[var(--ring)]" />
            </div>
            <h2 className="text-[20px] font-semibold tracking-[-0.025em] text-foreground">
              Connect your AI
            </h2>
            <p className="mx-auto mt-2.5 max-w-xs text-[13px] leading-[1.6] tracking-[-0.01em] text-foreground/50">
              Add your API key to start chatting with AI models. Your key is stored securely on your
              device.
            </p>
          </div>

          {/* Provider selection - refined card styles */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-foreground/40">
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
                          ? "bg-[var(--launcher-card-hover-bg)] ring-2 ring-[var(--ring)]/60 shadow-lg shadow-[var(--ring)]/10"
                          : "bg-[var(--launcher-card-hover-bg)] ring-1 ring-[var(--launcher-card-border)] hover:bg-[var(--launcher-card-hover-bg)] hover:ring-[var(--launcher-card-border)]"
                      }
                    `}
                    style={{ animationDelay: `${idx * 40}ms` }}
                  >
                    <div
                      className={`flex size-9 items-center justify-center rounded-lg bg-gradient-to-br ${style.gradient} ring-1 ring-[var(--launcher-card-border)]`}
                    >
                      <span className={`text-[11px] font-bold tracking-tight ${style.color}`}>
                        {style.icon}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span
                        className={`block text-[13px] font-medium tracking-[-0.01em] truncate ${isSelected ? "text-foreground" : "text-foreground/80"}`}
                      >
                        {provider.label}
                      </span>
                      <span className="text-[11px] tracking-[-0.01em] text-foreground/35">
                        {provider.models.length} model{provider.models.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {isSelected && (
                      <div className="flex size-5 items-center justify-center rounded-full bg-[var(--ring)] shadow-md shadow-[var(--ring)]/30">
                        <Check className="size-3 text-foreground" strokeWidth={2.5} />
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
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-foreground/40">
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
                  <Key className="size-4 text-foreground/25" />
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
                  className="h-11 w-full rounded-xl bg-[var(--launcher-card-hover-bg)] pl-11 pr-4 text-[13px] tracking-[-0.01em] text-foreground/90 placeholder:text-foreground/25 ring-1 ring-[var(--launcher-card-border)] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/70 focus:bg-[var(--launcher-card-hover-bg)]"
                  disabled={isSavingApiKey}
                />
              </div>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={onSaveApiKey}
                  disabled={isSavingApiKey || apiKeyInput.trim().length === 0}
                  className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--ring)]/15 text-[12px] font-semibold tracking-[-0.01em] text-[var(--ring)] ring-1 ring-[var(--ring)]/25 transition-all duration-200 hover:bg-[var(--ring)]/25 hover:ring-[var(--ring)]/40 disabled:opacity-40 disabled:cursor-not-allowed"
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
                    className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--launcher-card-hover-bg)] px-4 text-[12px] font-medium tracking-[-0.01em] text-foreground/50 ring-1 ring-[var(--launcher-card-border)] transition-all duration-200 hover:bg-[var(--launcher-card-hover-bg)] hover:text-foreground/70 disabled:opacity-40"
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
                className="flex items-center justify-center gap-1.5 pt-1 text-[11px] tracking-[-0.01em] text-foreground/35 transition-colors hover:text-foreground/55"
              >
                Get your {providerDefinition.label} API key
                <ExternalLink className="size-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Footer - refined */}
      <footer className="flex h-14 shrink-0 items-center justify-between border-t border-[var(--launcher-card-border)] px-5">
        <div className="flex items-center gap-2 text-[11px] tracking-[-0.01em] text-foreground/35">
          {isCheckingApiKey ? (
            <>
              <Loader2 className="size-3.5 animate-spin text-foreground/40" />
              <span>Checking key...</span>
            </>
          ) : isApiKeySetForProvider ? (
            <>
              <Check className="size-3.5 text-emerald-400" strokeWidth={2.5} />
              <span className="text-foreground/50">Ready to chat</span>
            </>
          ) : (
            <>
              <Key className="size-3.5 text-foreground/30" />
              <span>API key required</span>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={onContinue}
          disabled={!canContinue}
          className="flex h-9 items-center gap-2 rounded-xl bg-[var(--ring)] px-5 text-[12px] font-semibold tracking-[-0.01em] text-foreground shadow-lg shadow-[var(--ring)]/25 transition-all duration-200 hover:shadow-xl hover:shadow-[var(--ring)]/35 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
        >
          Continue to Chat
          <ChevronLeft className="size-4 rotate-180" />
        </button>
      </footer>
    </div>
  );
}
