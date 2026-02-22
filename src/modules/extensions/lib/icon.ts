import { convertFileSrc, isTauri } from "@tauri-apps/api/core";

const iconSourceCache = new Map<string, string | null>();

function isWindowsAbsolutePath(input: string): boolean {
  return /^[A-Za-z]:[\\/]/.test(input);
}

function hasUriScheme(input: string): boolean {
  return /^[A-Za-z][A-Za-z\d+\-.]*:/.test(input);
}

function stripFileProtocol(input: string): string {
  return input.startsWith("file://") ? input.slice("file://".length) : input;
}

export function resolveExtensionIconReference(
  icon: string | null | undefined,
): string | null {
  const normalizedIcon = icon?.trim() ?? "";
  if (!normalizedIcon) {
    return null;
  }

  if (
    normalizedIcon.startsWith("file://") ||
    normalizedIcon.startsWith("/") ||
    normalizedIcon.startsWith("\\") ||
    isWindowsAbsolutePath(normalizedIcon) ||
    hasUriScheme(normalizedIcon)
  ) {
    return normalizedIcon;
  }

  return normalizedIcon;
}

export function resolveExtensionIconSource(
  iconReference: string | null | undefined,
): string | null {
  const normalized = iconReference?.trim() ?? "";
  if (!normalized) {
    return null;
  }

  if (iconSourceCache.has(normalized)) {
    return iconSourceCache.get(normalized) ?? null;
  }

  if (
    normalized.startsWith("asset:") ||
    normalized.startsWith("tauri://") ||
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("data:")
  ) {
    iconSourceCache.set(normalized, normalized);
    return normalized;
  }

  if (!isTauri()) {
    iconSourceCache.set(normalized, null);
    return null;
  }

  const localPath = stripFileProtocol(normalized);

  try {
    const source = convertFileSrc(localPath, "asset");
    iconSourceCache.set(normalized, source);
    return source;
  } catch {
    iconSourceCache.set(normalized, null);
    return null;
  }
}
