import { invoke, isTauri } from "@tauri-apps/api/core";

export interface GnomeExtensionStatus {
  installed: boolean;
  enabled: boolean;
  version: string | null;
  path: string | null;
  dbusReachable: boolean;
  updateRequired: boolean;
}

export interface DesktopIntegrationStatus {
  platform: string;
  sessionType: string;
  desktopEnvironment: string;
  compositor: string;
  windowBackend: string;
  clipboardBackend: string;
  selectedTextBackend: string;
  selectedFilesBackend: string;
  waylandHelper: {
    available: boolean;
    backend: string | null;
    helperPath: string | null;
    lastError: string | null;
  };
  supportsWindowListing: boolean;
  supportsWindowFocus: boolean;
  supportsWindowClose: boolean;
  supportsFrontmostApplication: boolean;
  supportsDefaultApplication: boolean;
  supportsClipboardRead: boolean;
  supportsClipboardWrite: boolean;
  supportsClipboardPaste: boolean;
  supportsSelectedText: boolean;
  supportsSelectedFileItems: boolean;
  notes: string[];
  gnomeExtension: GnomeExtensionStatus | null;
}

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeGnomeExtensionStatus(value: unknown): GnomeExtensionStatus | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  return {
    installed: Boolean(record.installed),
    enabled: Boolean(record.enabled),
    version: toNonEmptyString(record.version),
    path: toNonEmptyString(record.path),
    dbusReachable: Boolean(record.dbusReachable),
    updateRequired: Boolean(record.updateRequired),
  };
}

function defaultStatus(): DesktopIntegrationStatus {
  return {
    platform: "linux",
    sessionType: "unknown",
    desktopEnvironment: "unknown",
    compositor: "unknown",
    windowBackend: "unsupported",
    clipboardBackend: "unsupported",
    selectedTextBackend: "unsupported",
    selectedFilesBackend: "unsupported",
    waylandHelper: {
      available: false,
      backend: null,
      helperPath: null,
      lastError: null,
    },
    supportsWindowListing: false,
    supportsWindowFocus: false,
    supportsWindowClose: false,
    supportsFrontmostApplication: false,
    supportsDefaultApplication: false,
    supportsClipboardRead: false,
    supportsClipboardWrite: false,
    supportsClipboardPaste: false,
    supportsSelectedText: false,
    supportsSelectedFileItems: false,
    notes: [],
    gnomeExtension: null,
  };
}

function normalizeStatus(value: unknown): DesktopIntegrationStatus {
  if (!value || typeof value !== "object") {
    return defaultStatus();
  }

  const record = value as Record<string, unknown>;
  return {
    platform: toNonEmptyString(record.platform) ?? "linux",
    sessionType: toNonEmptyString(record.sessionType) ?? "unknown",
    desktopEnvironment: toNonEmptyString(record.desktopEnvironment) ?? "unknown",
    compositor: toNonEmptyString(record.compositor) ?? "unknown",
    windowBackend: toNonEmptyString(record.windowBackend) ?? "unsupported",
    clipboardBackend: toNonEmptyString(record.clipboardBackend) ?? "unsupported",
    selectedTextBackend: toNonEmptyString(record.selectedTextBackend) ?? "unsupported",
    selectedFilesBackend: toNonEmptyString(record.selectedFilesBackend) ?? "unsupported",
    waylandHelper:
      record.waylandHelper && typeof record.waylandHelper === "object"
        ? {
            available: Boolean((record.waylandHelper as Record<string, unknown>).available),
            backend: toNonEmptyString((record.waylandHelper as Record<string, unknown>).backend),
            helperPath: toNonEmptyString(
              (record.waylandHelper as Record<string, unknown>).helperPath,
            ),
            lastError: toNonEmptyString(
              (record.waylandHelper as Record<string, unknown>).lastError,
            ),
          }
        : defaultStatus().waylandHelper,
    supportsWindowListing: Boolean(record.supportsWindowListing),
    supportsWindowFocus: Boolean(record.supportsWindowFocus),
    supportsWindowClose: Boolean(record.supportsWindowClose),
    supportsFrontmostApplication: Boolean(record.supportsFrontmostApplication),
    supportsDefaultApplication: Boolean(record.supportsDefaultApplication),
    supportsClipboardRead: Boolean(record.supportsClipboardRead),
    supportsClipboardWrite: Boolean(record.supportsClipboardWrite),
    supportsClipboardPaste: Boolean(record.supportsClipboardPaste),
    supportsSelectedText: Boolean(record.supportsSelectedText),
    supportsSelectedFileItems: Boolean(record.supportsSelectedFileItems),
    notes: Array.isArray(record.notes)
      ? record.notes
          .map((entry) => toNonEmptyString(entry))
          .filter((entry): entry is string => Boolean(entry))
      : [],
    gnomeExtension: normalizeGnomeExtensionStatus(record.gnomeExtension),
  };
}

export async function getDesktopIntegrationStatus(): Promise<DesktopIntegrationStatus> {
  if (!isTauri()) {
    return defaultStatus();
  }

  const result = await invoke<unknown>("get_desktop_integration_status");
  return normalizeStatus(result);
}

export async function installGnomeShellExtension(): Promise<string> {
  if (!isTauri()) {
    return "";
  }

  const result = await invoke<string>("install_gnome_shell_extension");
  return String(result ?? "");
}

export async function enableGnomeShellExtension(): Promise<void> {
  if (!isTauri()) {
    return;
  }

  await invoke("enable_gnome_shell_extension");
}

export async function openGnomeShellExtensionDirectory(): Promise<void> {
  if (!isTauri()) {
    return;
  }

  await invoke("open_gnome_shell_extension_directory");
}
