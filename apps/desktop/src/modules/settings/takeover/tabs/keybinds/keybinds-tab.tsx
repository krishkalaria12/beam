import { useReducer } from "react";

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

interface KeybindsTabState {
  settings: HotkeySettings | null;
  capabilities: HotkeyCapabilities | null;
  bindings: CompositorBindings | null;
  isLoading: boolean;
  query: string;
  selectedId: string;
  savingId: string | null;
  status: KeybindStatus;
}

type KeybindsTabAction =
  | { type: "set-snapshot"; value: HotkeySnapshot }
  | { type: "set-loading"; value: boolean }
  | { type: "set-query"; value: string }
  | { type: "set-selected-id"; value: string }
  | { type: "set-saving-id"; value: string | null }
  | { type: "set-status"; value: KeybindStatus }
  | { type: "set-settings"; value: HotkeySettings | null };

const INITIAL_KEYBINDS_TAB_STATE: KeybindsTabState = {
  settings: null,
  capabilities: null,
  bindings: null,
  isLoading: true,
  query: "",
  selectedId: "__global__",
  savingId: null,
  status: { tone: "idle", text: "" },
};

function keybindsTabReducer(state: KeybindsTabState, action: KeybindsTabAction): KeybindsTabState {
  switch (action.type) {
    case "set-snapshot":
      return {
        ...state,
        settings: action.value.settings,
        capabilities: action.value.capabilities,
        bindings: action.value.bindings,
      };
    case "set-loading":
      return { ...state, isLoading: action.value };
    case "set-query":
      return { ...state, query: action.value };
    case "set-selected-id":
      return { ...state, selectedId: action.value };
    case "set-saving-id":
      return { ...state, savingId: action.value };
    case "set-status":
      return { ...state, status: action.value };
    case "set-settings":
      return { ...state, settings: action.value };
  }
}

export function KeybindsTab({ isActive }: KeybindsTabProps) {
  const [state, dispatch] = useReducer(keybindsTabReducer, INITIAL_KEYBINDS_TAB_STATE);

  useMountEffect(() => {
    if (!isActive) {
      return;
    }

    let cancelled = false;

    const refresh = async () => {
      dispatch({ type: "set-loading", value: true });

      const snapshot = await loadHotkeySnapshot().catch(() => null);
      if (cancelled) {
        return;
      }

      if (snapshot) {
        dispatch({ type: "set-snapshot", value: snapshot });
      } else {
        dispatch({
          type: "set-status",
          value: {
            tone: "error",
            text: "Failed to load hotkey settings.",
          },
        });
      }

      dispatch({ type: "set-loading", value: false });
    };

    void refresh();

    return () => {
      cancelled = true;
    };
  });

  const rows = buildKeybindRows(state.settings);
  const filteredRows = filterKeybindRows(rows, state.query);
  const resolvedSelectedId = filteredRows.some((row) => row.id === state.selectedId)
    ? state.selectedId
    : (filteredRows[0]?.id ?? "");

  if (state.selectedId !== resolvedSelectedId) {
    dispatch({ type: "set-selected-id", value: resolvedSelectedId });
  }

  const selectedRow = filteredRows.find((row) => row.id === resolvedSelectedId) ?? null;

  async function refreshKeybinds() {
    dispatch({ type: "set-loading", value: true });
    dispatch({ type: "set-status", value: { tone: "idle", text: "" } });

    const snapshot = await loadHotkeySnapshot().catch(() => null);
    if (snapshot) {
      dispatch({ type: "set-snapshot", value: snapshot });
    } else {
      dispatch({
        type: "set-status",
        value: {
        tone: "error",
        text: "Failed to load hotkey settings.",
        },
      });
    }

    dispatch({ type: "set-loading", value: false });
  }

  async function handleRecord(nextShortcut: string) {
    if (!selectedRow) {
      return;
    }

    dispatch({ type: "set-saving-id", value: selectedRow.id });
    dispatch({ type: "set-status", value: { tone: "idle", text: "" } });

    const didSucceed = await (async () => {
      if (selectedRow.kind === "global") {
        const normalized = nextShortcut.trim();
        if (!normalized) {
          dispatch({
            type: "set-status",
            value: {
            tone: "error",
            text: "Global launcher hotkey cannot be empty.",
            },
          });
          return true;
        }

        const result = await updateGlobalHotkey(normalized);
        if (!result.success) {
          dispatch({
            type: "set-status",
            value: {
            tone: "error",
            text: "Failed to update the launcher shortcut.",
            },
          });
          return true;
        }

        dispatch({
          type: "set-settings",
          value:
            state.settings
              ? { ...state.settings, globalShortcut: normalized }
              : { globalShortcut: normalized, commandHotkeys: {} },
        });
        dispatch({
          type: "set-status",
          value: {
          tone: "success",
          text: "Launcher shortcut updated.",
          },
        });
        return true;
      }

      const normalized = nextShortcut.trim();
      if (!normalized) {
        const result = await removeCommandHotkey(selectedRow.id);
        if (!result.success) {
          dispatch({
            type: "set-status",
            value: {
            tone: "error",
            text: "Failed to remove the command shortcut.",
            },
          });
          return true;
        }

        dispatch({
          type: "set-settings",
          value: (() => {
            const previous = state.settings;
          if (!previous) {
            return previous;
          }

          const commandHotkeys = { ...previous.commandHotkeys };
          delete commandHotkeys[selectedRow.id];
          return {
            ...previous,
            commandHotkeys,
          };
          })(),
        });
        dispatch({
          type: "set-status",
          value: {
          tone: "success",
          text: "Command shortcut removed.",
          },
        });
        return true;
      }

      const result = await updateCommandHotkey(selectedRow.id, normalized);
      if (!result.success) {
        dispatch({
          type: "set-status",
          value: {
          tone: "error",
          text:
            result.error === "duplicate"
              ? `Shortcut already used by ${result.conflictCommandId ?? "another command"}.`
              : "Failed to update the command shortcut.",
          },
        });
        return true;
      }

      dispatch({
        type: "set-settings",
        value: {
          globalShortcut: state.settings?.globalShortcut ?? "SUPER+Space",
          commandHotkeys: {
            ...state.settings?.commandHotkeys,
          [selectedRow.id]: normalized,
        },
        },
      });
      dispatch({
        type: "set-status",
        value: {
        tone: "success",
        text: "Command shortcut updated.",
        },
      });
      return true;
    })().catch(() => {
      dispatch({
        type: "set-status",
        value: { tone: "error", text: "Failed to update hotkey settings." },
      });
      return false;
    });

    dispatch({ type: "set-saving-id", value: null });
    if (!didSucceed) {
      return;
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <KeybindsHeader
        capabilities={state.capabilities}
        isLoading={state.isLoading}
        status={state.status}
        onRefresh={() => {
          void refreshKeybinds();
        }}
      />

      <div className="grid h-full min-h-0 flex-1 grid-cols-[58%_42%] overflow-hidden bg-[var(--command-item-selected-bg)]/30">
        <KeybindsListPane
          query={state.query}
          rows={filteredRows}
          selectedId={state.selectedId}
          onQueryChange={(value) => dispatch({ type: "set-query", value })}
          onSelect={(value) => dispatch({ type: "set-selected-id", value })}
        />

        <KeybindsDetailPane
          selectedRow={selectedRow}
          savingId={state.savingId}
          bindings={state.bindings}
          capabilities={state.capabilities}
          onRecord={(nextShortcut) => {
            void handleRecord(nextShortcut);
          }}
        />
      </div>
    </div>
  );
}
