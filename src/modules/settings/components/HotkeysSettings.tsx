import { isTauri } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import {
  AlertTriangle,
  CheckCircle2,
  Keyboard,
  Loader2,
  RefreshCw,
  Rocket,
  Terminal,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { staticCommandRegistry } from "@/command-registry/registry";
import type { CommandDescriptor } from "@/command-registry/types";
import { cn } from "@/lib/utils";
import {
  getHotkeyCapabilities,
  getHotkeyCompositorBindings,
  getHotkeySettings,
  HOTKEY_SETTINGS_UPDATED_EVENT,
  removeCommandHotkey,
  updateCommandHotkey,
  updateGlobalHotkey,
  type CompositorBindings,
  type HotkeyCapabilities,
  type HotkeySettings,
} from "@/modules/settings/api/hotkeys";
import HotkeyRecorder from "@/modules/settings/components/HotkeyRecorder";

type StatusType = "idle" | "success" | "error";

interface StatusMessage {
  type: StatusType;
  text: string;
}

const EMPTY_STATUS: StatusMessage = {
  type: "idle",
  text: "",
};

function isCommandHotkeyCandidate(command: CommandDescriptor): boolean {
  if (command.hidden || command.requiresQuery || !command.action) {
    return false;
  }

  return command.scope.includes("all") || command.scope.includes("normal");
}

export default function HotkeysSettings() {
  const [settings, setSettings] = useState<HotkeySettings | null>(null);
  const [capabilities, setCapabilities] = useState<HotkeyCapabilities | null>(null);
  const [bindings, setBindings] = useState<CompositorBindings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<StatusMessage>(EMPTY_STATUS);
  const [pendingCommandId, setPendingCommandId] = useState<string | null>(null);
  const statusTimerRef = useRef<number | null>(null);

  const commandCandidates = useMemo(
    () =>
      staticCommandRegistry
        .getAll()
        .filter(isCommandHotkeyCandidate)
        .toSorted((left, right) => left.title.localeCompare(right.title)),
    [],
  );

  const setStatusWithTimeout = useCallback((nextStatus: StatusMessage, timeoutMs = 2200) => {
    if (statusTimerRef.current !== null) {
      window.clearTimeout(statusTimerRef.current);
      statusTimerRef.current = null;
    }
    setStatus(nextStatus);
    statusTimerRef.current = window.setTimeout(() => {
      setStatus(EMPTY_STATUS);
      statusTimerRef.current = null;
    }, timeoutMs);
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [nextSettings, nextCapabilities, nextBindings] = await Promise.all([
        getHotkeySettings(),
        getHotkeyCapabilities(),
        getHotkeyCompositorBindings(),
      ]);
      setSettings(nextSettings);
      setCapabilities(nextCapabilities);
      setBindings(nextBindings);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh().catch(() => {
      setStatusWithTimeout(
        {
          type: "error",
          text: "Failed to load hotkey settings.",
        },
        3000,
      );
    });
  }, [refresh, setStatusWithTimeout]);

  useEffect(() => {
    if (!isTauri()) {
      return;
    }

    let unlistenFn: UnlistenFn | null = null;
    listen(HOTKEY_SETTINGS_UPDATED_EVENT, () => {
      void refresh();
    })
      .then((cleanup) => {
        unlistenFn = cleanup;
      })
      .catch(() => {
        unlistenFn = null;
      });

    return () => {
      unlistenFn?.();
    };
  }, [refresh]);

  useEffect(() => {
    return () => {
      if (statusTimerRef.current !== null) {
        window.clearTimeout(statusTimerRef.current);
      }
    };
  }, []);

  const handleGlobalHotkeyChange = useCallback(
    async (nextHotkey: string) => {
      const normalizedHotkey = nextHotkey.trim();
      if (!normalizedHotkey) {
        setStatusWithTimeout(
          {
            type: "error",
            text: "Global launcher hotkey cannot be empty.",
          },
          2800,
        );
        return;
      }

      const result = await updateGlobalHotkey(normalizedHotkey);
      if (!result.success) {
        setStatusWithTimeout(
          {
            type: "error",
            text: "Failed to update global launcher hotkey.",
          },
          2800,
        );
        return;
      }

      setSettings((previous) =>
        previous
          ? { ...previous, globalShortcut: normalizedHotkey }
          : {
              globalShortcut: normalizedHotkey,
              commandHotkeys: {},
            },
      );
      setStatusWithTimeout({
        type: "success",
        text: "Launcher hotkey updated.",
      });
    },
    [setStatusWithTimeout],
  );

  const handleCommandHotkeyChange = useCallback(
    async (commandId: string, nextHotkey: string) => {
      const normalizedCommandId = commandId.trim();
      if (!normalizedCommandId) {
        return;
      }

      setPendingCommandId(normalizedCommandId);
      try {
        const normalizedHotkey = nextHotkey.trim();
        if (!normalizedHotkey) {
          const removeResult = await removeCommandHotkey(normalizedCommandId);
          if (!removeResult.success) {
            setStatusWithTimeout(
              {
                type: "error",
                text: "Failed to remove command hotkey.",
              },
              3000,
            );
            return;
          }
          setSettings((previous) => {
            if (!previous) return previous;
            const nextCommandHotkeys = { ...previous.commandHotkeys };
            delete nextCommandHotkeys[normalizedCommandId];
            return {
              ...previous,
              commandHotkeys: nextCommandHotkeys,
            };
          });
          setStatusWithTimeout({
            type: "success",
            text: "Command hotkey removed.",
          });
          return;
        }

        const updateResult = await updateCommandHotkey(normalizedCommandId, normalizedHotkey);
        if (!updateResult.success) {
          if (updateResult.error === "duplicate") {
            const conflictId = updateResult.conflictCommandId ?? "another command";
            setStatusWithTimeout(
              {
                type: "error",
                text: `Hotkey already used by ${conflictId}.`,
              },
              3200,
            );
            return;
          }
          setStatusWithTimeout(
            {
              type: "error",
              text: "Failed to update command hotkey.",
            },
            3000,
          );
          return;
        }

        setSettings((previous) => ({
          globalShortcut: previous?.globalShortcut ?? "SUPER+Space",
          commandHotkeys: {
            ...(previous?.commandHotkeys ?? {}),
            [normalizedCommandId]: normalizedHotkey,
          },
        }));
        setStatusWithTimeout({
          type: "success",
          text: "Command hotkey updated.",
        });
      } finally {
        setPendingCommandId(null);
      }
    },
    [setStatusWithTimeout],
  );

  const globalShortcutValue = settings?.globalShortcut ?? "";
  const commandHotkeys = settings?.commandHotkeys ?? {};
  const capabilitySummary = capabilities
    ? `${capabilities.backend} · ${capabilities.sessionType} · ${capabilities.compositor}`
    : "loading";

  return (
    <div className="settings-panel space-y-6 px-4 py-6">
      {/* Backend Info Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/45">
              Hotkey Backend
            </span>
            <div className="h-px flex-1 bg-white/[0.06]" />
          </div>
          <button
            type="button"
            onClick={() => {
              void refresh();
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5",
              "text-[11px] font-medium text-white/50",
              "bg-white/[0.03] hover:bg-white/[0.06]",
              "transition-all duration-150",
              "hover:text-white/70",
            )}
            aria-label="Refresh hotkey status"
          >
            <RefreshCw className={cn("size-3.5", isLoading && "animate-spin")} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="rounded-xl bg-white/[0.03] p-4">
          <div className="flex items-center gap-3.5">
            <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10">
              <Keyboard className="size-5 text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-medium tracking-[-0.02em] text-white/90 capitalize">
                {capabilitySummary}
              </p>
              {capabilities?.notes?.length ? (
                <p className="mt-0.5 text-[12px] text-white/40 leading-relaxed truncate">
                  {capabilities.notes[0]}
                </p>
              ) : null}
            </div>
          </div>
          {capabilities?.notes && capabilities.notes.length > 1 && (
            <ul className="mt-3 space-y-1 border-t border-white/[0.06] pt-3">
              {capabilities.notes.slice(1).map((note) => (
                <li key={note} className="text-[12px] text-white/35 leading-relaxed">
                  {note}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Launcher Hotkey Section */}
      <section className="space-y-3">
        <div className="flex items-center gap-3 px-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/45">
            Launcher Hotkey
          </span>
          <div className="h-px flex-1 bg-white/[0.06]" />
        </div>

        <div className="rounded-xl bg-white/[0.03] p-4">
          <div className="flex items-center gap-3.5">
            <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/10">
              <Rocket className="size-5 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-white/70 mb-2">
                Global shortcut to open Beam
              </p>
              <HotkeyRecorder
                value={globalShortcutValue}
                onChange={(nextHotkey) => {
                  void handleGlobalHotkeyChange(nextHotkey);
                }}
                disabled={isLoading}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Command Hotkeys Section */}
      <section className="space-y-3">
        <div className="flex items-center gap-3 px-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/45">
            Command Hotkeys
          </span>
          <div className="h-px flex-1 bg-white/[0.06]" />
        </div>

        <p className="px-1 text-[12px] text-white/35 leading-relaxed">
          Assign global hotkeys to commands. On Wayland, configure these through your compositor.
        </p>

        <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
          {commandCandidates.map((command, index) => (
            <div
              key={command.id}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-3",
                "transition-all duration-150",
                pendingCommandId === command.id
                  ? "bg-[var(--solid-accent,#4ea2ff)]/10"
                  : "bg-white/[0.02] hover:bg-white/[0.04]",
              )}
              style={{ animationDelay: `${index * 15}ms` }}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium tracking-[-0.01em] text-white/80">
                  {command.title}
                </p>
                <p className="truncate text-[11px] font-mono text-white/30">{command.id}</p>
              </div>
              <HotkeyRecorder
                value={commandHotkeys[command.id] ?? ""}
                onChange={(nextHotkey) => {
                  void handleCommandHotkeyChange(command.id, nextHotkey);
                }}
                disabled={pendingCommandId === command.id || isLoading}
                className="shrink-0"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Compositor Snippets */}
      {bindings ? (
        <section className="space-y-3">
          <div className="flex items-center gap-3 px-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/45">
              Compositor Snippets
            </span>
            <div className="h-px flex-1 bg-white/[0.06]" />
          </div>

          <div className="rounded-xl bg-white/[0.03] p-4 space-y-3">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/10">
                <Terminal className="size-4 text-emerald-400" />
              </div>
              <p className="text-[12px] text-white/50">
                Example bindings for your compositor config
              </p>
            </div>

            <div className="space-y-2">
              {bindings.launcherBindingExamples.map((entry, index) => (
                <pre
                  key={entry}
                  className={cn(
                    "overflow-x-auto rounded-lg px-3 py-2",
                    "bg-white/[0.03] text-[11px] font-mono text-white/50",
                    "ring-1 ring-white/[0.04]",
                  )}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <code>{entry}</code>
                </pre>
              ))}
              {bindings.commandBindingExamples.slice(0, 6).map((entry, index) => (
                <pre
                  key={entry}
                  className={cn(
                    "overflow-x-auto rounded-lg px-3 py-2",
                    "bg-white/[0.03] text-[11px] font-mono text-white/50",
                    "ring-1 ring-white/[0.04]",
                  )}
                  style={{
                    animationDelay: `${(index + bindings.launcherBindingExamples.length) * 30}ms`,
                  }}
                >
                  <code>{entry}</code>
                </pre>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Status Messages */}
      {status.type !== "idle" && (
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-xl px-4 py-3",
            "text-[12px] font-medium",
            "animate-in fade-in slide-in-from-bottom-2 duration-200",
            status.type === "error"
              ? "bg-red-500/10 text-red-300 ring-1 ring-red-500/20"
              : "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20",
          )}
        >
          {status.type === "error" ? (
            <AlertTriangle className="size-4 shrink-0" />
          ) : (
            <CheckCircle2 className="size-4 shrink-0" />
          )}
          <span>{status.text}</span>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-4 text-[12px] text-white/40">
          <Loader2 className="size-4 animate-spin" />
          <span>Loading hotkey settings...</span>
        </div>
      )}

      {/* Browser Warning */}
      {!isTauri() && (
        <div className="rounded-xl bg-amber-500/10 px-4 py-3 ring-1 ring-amber-500/20">
          <p className="text-[12px] text-amber-300/80 leading-relaxed">
            Running without desktop runtime. Changes are stored locally for this browser profile.
          </p>
        </div>
      )}
    </div>
  );
}
