import { useState } from "react";

import {
  getHotkeyCapabilities,
  getHotkeyCompositorBindings,
  getHotkeySettings,
  removeCommandHotkey,
  updateCommandHotkey,
  updateGlobalHotkey,
  type CompositorBindings,
  type HotkeyCapabilities,
  type HotkeySettings,
} from "@/modules/settings/api/hotkeys";
import { useMountEffect } from "@/hooks/use-mount-effect";

import { KeybindsDetailPane } from "./components/keybinds-detail-pane";
import { KeybindsHeader } from "./components/keybinds-header";
import { KeybindsListPane } from "./components/keybinds-list-pane";
import { buildKeybindRows, filterKeybindRows } from "./lib/build-keybind-rows";
import type { HotkeySnapshot, KeybindStatus, KeybindsTabProps } from "./types";

async function loadHotkeySnapshot(): Promise<HotkeySnapshot> {
  const [settings, capabilities, bindings] = await Promise.all([
    getHotkeySettings(),
    getHotkeyCapabilities(),
    getHotkeyCompositorBindings(),
  ]);

  return {
    settings,
    capabilities,
    bindings,
  };
}

export function KeybindsTab({ isActive }: KeybindsTabProps) {
  const [settings, setSettings] = useState<HotkeySettings | null>(null);
  const [capabilities, setCapabilities] = useState<HotkeyCapabilities | null>(null);
  const [bindings, setBindings] = useState<CompositorBindings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>("__global__");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [status, setStatus] = useState<KeybindStatus>({ tone: "idle", text: "" });

  useMountEffect(() => {
    if (!isActive) {
      return;
    }

    let cancelled = false;

    const refresh = async () => {
      setIsLoading(true);

      try {
        const snapshot = await loadHotkeySnapshot();
        if (cancelled) {
          return;
        }

        setSettings(snapshot.settings);
        setCapabilities(snapshot.capabilities);
        setBindings(snapshot.bindings);
      } catch {
        if (cancelled) {
          return;
        }

        setStatus({
          tone: "error",
          text: "Failed to load hotkey settings.",
        });
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void refresh();

    return () => {
      cancelled = true;
    };
  });

  const rows = buildKeybindRows(settings);
  const filteredRows = filterKeybindRows(rows, query);
  const resolvedSelectedId = filteredRows.some((row) => row.id === selectedId)
    ? selectedId
    : (filteredRows[0]?.id ?? "");

  if (selectedId !== resolvedSelectedId) {
    setSelectedId(resolvedSelectedId);
  }

  const selectedRow = filteredRows.find((row) => row.id === resolvedSelectedId) ?? null;

  async function refreshKeybinds() {
    setIsLoading(true);
    setStatus({ tone: "idle", text: "" });

    try {
      const snapshot = await loadHotkeySnapshot();
      setSettings(snapshot.settings);
      setCapabilities(snapshot.capabilities);
      setBindings(snapshot.bindings);
    } catch {
      setStatus({
        tone: "error",
        text: "Failed to load hotkey settings.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRecord(nextShortcut: string) {
    if (!selectedRow) {
      return;
    }

    setSavingId(selectedRow.id);
    setStatus({ tone: "idle", text: "" });

    try {
      if (selectedRow.kind === "global") {
        const normalized = nextShortcut.trim();
        if (!normalized) {
          setStatus({
            tone: "error",
            text: "Global launcher hotkey cannot be empty.",
          });
          return;
        }

        const result = await updateGlobalHotkey(normalized);
        if (!result.success) {
          setStatus({
            tone: "error",
            text: "Failed to update the launcher shortcut.",
          });
          return;
        }

        setSettings((previous) =>
          previous
            ? { ...previous, globalShortcut: normalized }
            : { globalShortcut: normalized, commandHotkeys: {} },
        );
        setStatus({
          tone: "success",
          text: "Launcher shortcut updated.",
        });
        return;
      }

      const normalized = nextShortcut.trim();
      if (!normalized) {
        const result = await removeCommandHotkey(selectedRow.id);
        if (!result.success) {
          setStatus({
            tone: "error",
            text: "Failed to remove the command shortcut.",
          });
          return;
        }

        setSettings((previous) => {
          if (!previous) {
            return previous;
          }

          const commandHotkeys = { ...previous.commandHotkeys };
          delete commandHotkeys[selectedRow.id];
          return {
            ...previous,
            commandHotkeys,
          };
        });
        setStatus({
          tone: "success",
          text: "Command shortcut removed.",
        });
        return;
      }

      const result = await updateCommandHotkey(selectedRow.id, normalized);
      if (!result.success) {
        setStatus({
          tone: "error",
          text:
            result.error === "duplicate"
              ? `Shortcut already used by ${result.conflictCommandId ?? "another command"}.`
              : "Failed to update the command shortcut.",
        });
        return;
      }

      setSettings((previous) => ({
        globalShortcut: previous?.globalShortcut ?? "SUPER+Space",
        commandHotkeys: {
          ...previous?.commandHotkeys,
          [selectedRow.id]: normalized,
        },
      }));
      setStatus({
        tone: "success",
        text: "Command shortcut updated.",
      });
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <KeybindsHeader
        capabilities={capabilities}
        isLoading={isLoading}
        status={status}
        onRefresh={() => {
          void refreshKeybinds();
        }}
      />

      <div className="grid h-full min-h-0 flex-1 grid-cols-[58%_42%] overflow-hidden bg-[var(--command-item-selected-bg)]/30">
        <KeybindsListPane
          query={query}
          rows={filteredRows}
          selectedId={selectedId}
          onQueryChange={setQuery}
          onSelect={setSelectedId}
        />

        <KeybindsDetailPane
          selectedRow={selectedRow}
          savingId={savingId}
          bindings={bindings}
          capabilities={capabilities}
          onRecord={(nextShortcut) => {
            void handleRecord(nextShortcut);
          }}
        />
      </div>
    </div>
  );
}
