import { isTauri } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import {
  AlertTriangle,
  CheckCircle2,
  Keyboard,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { staticCommandRegistry } from "@/command-registry/registry";
import type { CommandDescriptor } from "@/command-registry/types";
import { CommandGroup } from "@/components/ui/command";
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
      setStatusWithTimeout({
        type: "error",
        text: "Failed to load hotkey settings.",
      }, 3000);
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

  const handleGlobalHotkeyChange = useCallback(async (nextHotkey: string) => {
    const normalizedHotkey = nextHotkey.trim();
    if (!normalizedHotkey) {
      setStatusWithTimeout({
        type: "error",
        text: "Global launcher hotkey cannot be empty.",
      }, 2800);
      return;
    }

    const result = await updateGlobalHotkey(normalizedHotkey);
    if (!result.success) {
      setStatusWithTimeout({
        type: "error",
        text: "Failed to update global launcher hotkey.",
      }, 2800);
      return;
    }

    setSettings((previous) =>
      previous
        ? { ...previous, globalShortcut: normalizedHotkey }
        : {
            globalShortcut: normalizedHotkey,
            commandHotkeys: {},
          });
    setStatusWithTimeout({
      type: "success",
      text: "Launcher hotkey updated.",
    });
  }, [setStatusWithTimeout]);

  const handleCommandHotkeyChange = useCallback(async (commandId: string, nextHotkey: string) => {
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
          setStatusWithTimeout({
            type: "error",
            text: "Failed to remove command hotkey.",
          }, 3000);
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
          setStatusWithTimeout({
            type: "error",
            text: `Hotkey already used by ${conflictId}.`,
          }, 3200);
          return;
        }
        setStatusWithTimeout({
          type: "error",
          text: "Failed to update command hotkey.",
        }, 3000);
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
  }, [setStatusWithTimeout]);

  const globalShortcutValue = settings?.globalShortcut ?? "";
  const commandHotkeys = settings?.commandHotkeys ?? {};
  const capabilitySummary = capabilities
    ? `${capabilities.backend} · ${capabilities.sessionType} · ${capabilities.compositor}`
    : "loading";

  return (
    <CommandGroup>
      <div className="space-y-4 px-1 pb-1 pt-4">
        <div className="flex items-center justify-between px-2">
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50">
            Hotkey Backend
          </p>
          <button
            type="button"
            onClick={() => {
              void refresh();
            }}
            className="inline-flex items-center gap-1 rounded-md border border-border/40 bg-background/30 px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:border-border hover:text-foreground"
            aria-label="Refresh hotkey status"
            title="Refresh hotkey status"
          >
            <RefreshCw className="size-3" />
            Refresh
          </button>
        </div>

        <div className="space-y-2 rounded-xl border border-border/35 bg-background/20 p-3">
          <div className="flex items-center gap-2 text-xs text-foreground">
            <Keyboard className="size-4 text-muted-foreground" />
            <span className="font-medium capitalize">{capabilitySummary}</span>
          </div>
          {capabilities?.notes?.length ? (
            <ul className="space-y-1 text-[11px] text-muted-foreground/85">
              {capabilities.notes.map((note) => (
                <li key={note} className="leading-relaxed">{note}</li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="space-y-2 rounded-xl border border-border/35 bg-background/20 p-3">
          <p className="text-xs font-medium text-foreground">Launcher Hotkey</p>
          <HotkeyRecorder
            value={globalShortcutValue}
            onChange={(nextHotkey) => {
              void handleGlobalHotkeyChange(nextHotkey);
            }}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2 rounded-xl border border-border/35 bg-background/20 p-3">
          <p className="text-xs font-medium text-foreground">Command Hotkeys</p>
          <p className="text-[11px] text-muted-foreground/80">
            Global command bindings on Wayland should be wired through compositor shortcuts.
          </p>

          <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
            {commandCandidates.map((command) => (
              <div
                key={command.id}
                className={cn(
                  "flex items-center gap-2 rounded-lg border border-border/30 px-2.5 py-2",
                  pendingCommandId === command.id ? "bg-primary/5" : "bg-background/10",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">{command.title}</p>
                  <p className="truncate text-[10px] text-muted-foreground/75">{command.id}</p>
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
        </div>

        {bindings ? (
          <div className="space-y-2 rounded-xl border border-border/35 bg-background/20 p-3">
            <p className="text-xs font-medium text-foreground">Compositor Snippets</p>
            <div className="space-y-2">
              {bindings.launcherBindingExamples.map((entry) => (
                <pre
                  key={entry}
                  className="overflow-x-auto rounded-md border border-border/30 bg-background/40 px-2 py-1.5 text-[10px] text-muted-foreground"
                >
                  {entry}
                </pre>
              ))}
              {bindings.commandBindingExamples.slice(0, 8).map((entry) => (
                <pre
                  key={entry}
                  className="overflow-x-auto rounded-md border border-border/30 bg-background/40 px-2 py-1.5 text-[10px] text-muted-foreground"
                >
                  {entry}
                </pre>
              ))}
            </div>
          </div>
        ) : null}

        {status.type !== "idle" ? (
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-[11px]",
              status.type === "error"
                ? "border-red-400/30 bg-red-500/10 text-red-200"
                : "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
            )}
          >
            {status.type === "error" ? (
              <AlertTriangle className="size-3.5 shrink-0" />
            ) : (
              <CheckCircle2 className="size-3.5 shrink-0" />
            )}
            <span>{status.text}</span>
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex items-center gap-2 px-2 text-[11px] text-muted-foreground/80">
            <Loader2 className="size-3.5 animate-spin" />
            <span>Loading hotkey settings...</span>
          </div>
        ) : null}

        {!isTauri() ? (
          <p className="px-2 text-[11px] text-muted-foreground/75">
            Running without desktop runtime. Changes are stored locally for this browser profile.
          </p>
        ) : null}
      </div>
    </CommandGroup>
  );
}

