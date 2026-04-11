import { invoke, isTauri } from "@tauri-apps/api/core";

const HOTKEYS_LOCAL_STORAGE_KEY = "beam-hotkey-settings-v1";

export const HOTKEY_COMMAND_EVENT = "hotkey-command";
const HOTKEY_SETTINGS_UPDATED_EVENT = "hotkey-settings-updated";
export const HOTKEY_BACKEND_STATUS_EVENT = "hotkey-backend-status";

export interface HotkeySettings {
  globalShortcut: string;
  commandHotkeys: Record<string, string>;
}

export interface HotkeyCapabilities {
  sessionType: string;
  compositor: string;
  backend: string;
  globalLauncherSupported: boolean;
  globalCommandHotkeysSupported: boolean;
  launcherOnlySupported: boolean;
  notes: string[];
}

interface HotkeyUpdateResult {
  success: boolean;
  error?: string;
}

interface CommandHotkeyUpdateResult extends HotkeyUpdateResult {
  conflictCommandId?: string;
}

export interface CompositorBindings {
  compositor: string;
  backend: string;
  commandPrefix: string;
  launcherBindingExamples: string[];
  commandBindingExamples: string[];
  notes: string[];
}

interface RawHotkeySettings {
  global_shortcut?: unknown;
  command_hotkeys?: unknown;
}

interface RawHotkeyCapabilities {
  session_type?: unknown;
  compositor?: unknown;
  backend?: unknown;
  global_launcher_supported?: unknown;
  global_command_hotkeys_supported?: unknown;
  launcher_only_supported?: unknown;
  notes?: unknown;
}

interface RawCommandHotkeyUpdateResult {
  success?: unknown;
  error?: unknown;
  conflict_command_id?: unknown;
}

interface LocalHotkeySettingsRecord {
  globalShortcut: string;
  commandHotkeys: Record<string, string>;
}

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeHotkeysMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const entries = value as Record<string, unknown>;
  const normalized: Record<string, string> = {};
  for (const [commandId, rawHotkey] of Object.entries(entries)) {
    const normalizedCommandId = toNonEmptyString(commandId);
    const normalizedHotkey = toNonEmptyString(rawHotkey);
    if (!normalizedCommandId || !normalizedHotkey) {
      continue;
    }
    normalized[normalizedCommandId] = normalizedHotkey;
  }
  return normalized;
}

function defaultHotkeySettings(): HotkeySettings {
  return {
    globalShortcut: "SUPER+Space",
    commandHotkeys: {},
  };
}

function normalizeHotkeySettings(value: unknown): HotkeySettings {
  if (!value || typeof value !== "object") {
    return defaultHotkeySettings();
  }

  const record = value as RawHotkeySettings;
  const globalShortcut =
    toNonEmptyString(record.global_shortcut) ?? defaultHotkeySettings().globalShortcut;
  const commandHotkeys = normalizeHotkeysMap(record.command_hotkeys);

  return {
    globalShortcut,
    commandHotkeys,
  };
}

function normalizeHotkeyCapabilities(value: unknown): HotkeyCapabilities {
  const defaults: HotkeyCapabilities = {
    sessionType: "unknown",
    compositor: "unknown",
    backend: "launcher-only",
    globalLauncherSupported: false,
    globalCommandHotkeysSupported: false,
    launcherOnlySupported: true,
    notes: [],
  };

  if (!value || typeof value !== "object") {
    return defaults;
  }

  const record = value as RawHotkeyCapabilities;
  return {
    sessionType: toNonEmptyString(record.session_type) ?? defaults.sessionType,
    compositor: toNonEmptyString(record.compositor) ?? defaults.compositor,
    backend: toNonEmptyString(record.backend) ?? defaults.backend,
    globalLauncherSupported: Boolean(record.global_launcher_supported),
    globalCommandHotkeysSupported: Boolean(record.global_command_hotkeys_supported),
    launcherOnlySupported: record.launcher_only_supported === false ? false : true,
    notes: Array.isArray(record.notes)
      ? record.notes
          .map((entry) => toNonEmptyString(entry))
          .filter((entry): entry is string => Boolean(entry))
      : defaults.notes,
  };
}

function normalizeHotkeyUpdateResult(value: unknown): HotkeyUpdateResult {
  if (!value || typeof value !== "object") {
    return { success: false, error: "unknown" };
  }

  const record = value as Record<string, unknown>;
  return {
    success: Boolean(record.success),
    error: toNonEmptyString(record.error) ?? undefined,
  };
}

function normalizeCommandHotkeyUpdateResult(value: unknown): CommandHotkeyUpdateResult {
  if (!value || typeof value !== "object") {
    return { success: false, error: "unknown" };
  }

  const record = value as RawCommandHotkeyUpdateResult;
  return {
    success: Boolean(record.success),
    error: toNonEmptyString(record.error) ?? undefined,
    conflictCommandId: toNonEmptyString(record.conflict_command_id) ?? undefined,
  };
}

function normalizeCompositorBindings(value: unknown): CompositorBindings {
  const defaults: CompositorBindings = {
    compositor: "unknown",
    backend: "launcher-only",
    commandPrefix: "beam",
    launcherBindingExamples: [],
    commandBindingExamples: [],
    notes: [],
  };

  if (!value || typeof value !== "object") {
    return defaults;
  }

  const record = value as Record<string, unknown>;
  return {
    compositor: toNonEmptyString(record.compositor) ?? defaults.compositor,
    backend: toNonEmptyString(record.backend) ?? defaults.backend,
    commandPrefix: toNonEmptyString(record.command_prefix) ?? defaults.commandPrefix,
    launcherBindingExamples: Array.isArray(record.launcher_binding_examples)
      ? record.launcher_binding_examples
          .map((entry) => toNonEmptyString(entry))
          .filter((entry): entry is string => Boolean(entry))
      : defaults.launcherBindingExamples,
    commandBindingExamples: Array.isArray(record.command_binding_examples)
      ? record.command_binding_examples
          .map((entry) => toNonEmptyString(entry))
          .filter((entry): entry is string => Boolean(entry))
      : defaults.commandBindingExamples,
    notes: Array.isArray(record.notes)
      ? record.notes
          .map((entry) => toNonEmptyString(entry))
          .filter((entry): entry is string => Boolean(entry))
      : defaults.notes,
  };
}

function readLocalHotkeySettings(): HotkeySettings {
  if (typeof window === "undefined") {
    return defaultHotkeySettings();
  }

  try {
    const raw = localStorage.getItem(HOTKEYS_LOCAL_STORAGE_KEY);
    if (!raw) {
      return defaultHotkeySettings();
    }
    const parsed = JSON.parse(raw) as LocalHotkeySettingsRecord;
    return {
      globalShortcut:
        toNonEmptyString(parsed.globalShortcut) ?? defaultHotkeySettings().globalShortcut,
      commandHotkeys: normalizeHotkeysMap(parsed.commandHotkeys),
    };
  } catch {
    return defaultHotkeySettings();
  }
}

function writeLocalHotkeySettings(settings: HotkeySettings) {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(HOTKEYS_LOCAL_STORAGE_KEY, JSON.stringify(settings));
}

function canonicalKeyPart(key: string): string {
  const normalized = key.trim().toLowerCase();
  if (normalized === "spacebar") return "space";
  if (normalized === "return") return "enter";
  if (normalized === "esc") return "escape";
  return normalized;
}

function canonicalHotkey(shortcut: string): string {
  const tokens = shortcut
    .split("+")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (tokens.length === 0) {
    return "";
  }

  const key = canonicalKeyPart(tokens[tokens.length - 1]);
  const modifiers = new Set<string>();
  for (const token of tokens.slice(0, -1)) {
    const normalized = token.toLowerCase();
    if (
      normalized === "super" ||
      normalized === "meta" ||
      normalized === "cmd" ||
      normalized === "command"
    ) {
      modifiers.add("super");
      continue;
    }
    if (normalized === "ctrl" || normalized === "control") {
      modifiers.add("control");
      continue;
    }
    if (normalized === "alt" || normalized === "option" || normalized === "opt") {
      modifiers.add("alt");
      continue;
    }
    if (normalized === "shift") {
      modifiers.add("shift");
    }
  }

  const parts = [
    ...(modifiers.has("super") ? ["super"] : []),
    ...(modifiers.has("control") ? ["control"] : []),
    ...(modifiers.has("alt") ? ["alt"] : []),
    ...(modifiers.has("shift") ? ["shift"] : []),
    key,
  ];

  return parts.join("+");
}

export async function getHotkeySettings(): Promise<HotkeySettings> {
  if (!isTauri()) {
    return readLocalHotkeySettings();
  }

  const result = await invoke<unknown>("get_hotkey_settings");
  return normalizeHotkeySettings(result);
}

export async function getHotkeyCapabilities(): Promise<HotkeyCapabilities> {
  if (!isTauri()) {
    return {
      sessionType: "web",
      compositor: "browser",
      backend: "launcher-only",
      globalLauncherSupported: false,
      globalCommandHotkeysSupported: false,
      launcherOnlySupported: true,
      notes: ["Desktop runtime is required for compositor-driven hotkeys."],
    };
  }

  const result = await invoke<unknown>("get_hotkey_capabilities");
  return normalizeHotkeyCapabilities(result);
}

export async function getHotkeyCompositorBindings(): Promise<CompositorBindings> {
  if (!isTauri()) {
    return {
      compositor: "browser",
      backend: "launcher-only",
      commandPrefix: "beam",
      launcherBindingExamples: [],
      commandBindingExamples: [],
      notes: ["Desktop runtime is required for compositor binding examples."],
    };
  }

  const result = await invoke<unknown>("get_hotkey_compositor_bindings");
  return normalizeCompositorBindings(result);
}

export async function updateGlobalHotkey(shortcut: string): Promise<HotkeyUpdateResult> {
  const normalizedShortcut = shortcut.trim();
  if (!normalizedShortcut) {
    return { success: false, error: "invalid" };
  }

  if (!isTauri()) {
    const current = readLocalHotkeySettings();
    writeLocalHotkeySettings({
      ...current,
      globalShortcut: normalizedShortcut,
    });
    return { success: true };
  }

  const result = await invoke<unknown>("update_global_shortcut", {
    shortcut: normalizedShortcut,
  });

  return normalizeHotkeyUpdateResult(result);
}

export async function updateCommandHotkey(
  commandId: string,
  hotkey: string,
): Promise<CommandHotkeyUpdateResult> {
  const normalizedCommandId = commandId.trim();
  const normalizedHotkey = hotkey.trim();
  if (!normalizedCommandId || !normalizedHotkey) {
    return { success: false, error: "invalid" };
  }

  if (!isTauri()) {
    const current = readLocalHotkeySettings();
    const requestedCanonical = canonicalHotkey(normalizedHotkey);
    for (const [existingCommandId, existingHotkey] of Object.entries(current.commandHotkeys)) {
      if (existingCommandId === normalizedCommandId) {
        continue;
      }
      if (canonicalHotkey(existingHotkey) === requestedCanonical) {
        return {
          success: false,
          error: "duplicate",
          conflictCommandId: existingCommandId,
        };
      }
    }

    writeLocalHotkeySettings({
      ...current,
      commandHotkeys: {
        ...current.commandHotkeys,
        [normalizedCommandId]: normalizedHotkey,
      },
    });
    return { success: true };
  }

  const result = await invoke<unknown>("update_command_hotkey", {
    commandId: normalizedCommandId,
    hotkey: normalizedHotkey,
  });

  return normalizeCommandHotkeyUpdateResult(result);
}

export async function removeCommandHotkey(commandId: string): Promise<HotkeyUpdateResult> {
  const normalizedCommandId = commandId.trim();
  if (!normalizedCommandId) {
    return { success: false, error: "invalid" };
  }

  if (!isTauri()) {
    const current = readLocalHotkeySettings();
    const next = { ...current.commandHotkeys };
    delete next[normalizedCommandId];
    writeLocalHotkeySettings({
      ...current,
      commandHotkeys: next,
    });
    return { success: true };
  }

  const result = await invoke<unknown>("remove_command_hotkey", {
    commandId: normalizedCommandId,
  });

  return normalizeHotkeyUpdateResult(result);
}
