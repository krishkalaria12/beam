import { convertFileSrc, isTauri } from "@tauri-apps/api/core";

const iconSourceCache = new Map<string, string | null>();
const iconSourcesCache = new Map<string, string[]>();
const COMMON_ICON_EXTENSIONS = ["png", "svg", "jpg", "jpeg", "webp", "ico"];
const COMMON_ICON_DIRECTORIES = [
  "assets",
  "Assets",
  "icons",
  "Icons",
  "images",
  "img",
  "media",
  "dist/assets",
  "build/assets",
];

function isWindowsAbsolutePath(input: string): boolean {
  return /^[A-Za-z]:[\\/]/.test(input);
}

function hasUriScheme(input: string): boolean {
  return /^[A-Za-z][A-Za-z\d+\-.]*:/.test(input);
}

function stripFileProtocol(input: string): string {
  return input.startsWith("file://") ? input.slice("file://".length) : input;
}

function normalizeRelativeIconPath(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const withoutDotPrefix = trimmed.replace(/^\.([\\/])/, "");
  const withoutSlashPrefix = withoutDotPrefix.replace(/^[\\/]+/, "");

  return withoutSlashPrefix.trim() || null;
}

function trimTrailingSeparators(input: string): string {
  return input.replace(/[\\/]+$/, "");
}

function joinFilePath(basePath: string, relativePath: string): string {
  const normalizedBasePath = trimTrailingSeparators(basePath);
  const normalizedRelativePath = relativePath.replace(/^[\\/]+/, "");
  const separator =
    normalizedBasePath.includes("\\") && !normalizedBasePath.includes("/") ? "\\" : "/";

  return `${normalizedBasePath}${separator}${normalizedRelativePath.replace(/[\\/]+/g, separator)}`;
}

function dirname(path: string): string | null {
  const normalizedPath = trimTrailingSeparators(stripFileProtocol(path));
  const lastSeparatorIndex = Math.max(
    normalizedPath.lastIndexOf("/"),
    normalizedPath.lastIndexOf("\\"),
  );

  if (lastSeparatorIndex <= 0) {
    return null;
  }

  return normalizedPath.slice(0, lastSeparatorIndex);
}

function pushCandidateWithCommonExtensions(candidates: string[], candidatePath: string): void {
  candidates.push(candidatePath);

  const hasExtension = /\.[A-Za-z0-9]+$/.test(candidatePath);
  if (hasExtension) {
    return;
  }

  for (const extension of COMMON_ICON_EXTENSIONS) {
    candidates.push(`${candidatePath}.${extension}`);
  }
}

function buildRelativeIconCandidates(iconReference: string, baseDirectory: string): string[] {
  const relativePath = normalizeRelativeIconPath(iconReference);
  if (!relativePath) {
    return [];
  }

  const candidates: string[] = [];
  pushCandidateWithCommonExtensions(candidates, joinFilePath(baseDirectory, relativePath));

  if (!relativePath.includes("/") && !relativePath.includes("\\")) {
    for (const prefix of COMMON_ICON_DIRECTORIES) {
      pushCandidateWithCommonExtensions(
        candidates,
        joinFilePath(joinFilePath(baseDirectory, prefix), relativePath),
      );
    }
  }

  return Array.from(new Set(candidates));
}

export function resolveExtensionIconReference(icon: string | null | undefined): string | null {
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

export function resolveExtensionDirectory(pluginPath: string | null | undefined): string | null {
  const normalizedPluginPath = pluginPath?.trim() ?? "";
  if (!normalizedPluginPath) {
    return null;
  }

  return dirname(normalizedPluginPath);
}

export function resolveExtensionIconSource(
  iconReference: string | null | undefined,
  options?: { baseDirectory?: string | null },
): string | null {
  return resolveExtensionIconSources(iconReference, options)[0] ?? null;
}

export function resolveExtensionIconSources(
  iconReference: string | null | undefined,
  options?: { baseDirectory?: string | null },
): string[] {
  const normalized = iconReference?.trim() ?? "";
  if (!normalized) {
    return [];
  }

  const baseDirectory = options?.baseDirectory?.trim() ?? "";
  const cacheKey = `${baseDirectory}::${normalized}`;

  if (
    normalized.startsWith("asset:") ||
    normalized.startsWith("tauri://") ||
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("data:")
  ) {
    iconSourceCache.set(cacheKey, normalized);
    iconSourcesCache.set(cacheKey, [normalized]);
    return [normalized];
  }

  if (iconSourcesCache.has(cacheKey)) {
    return iconSourcesCache.get(cacheKey) ?? [];
  }

  if (!isTauri()) {
    iconSourceCache.set(cacheKey, null);
    iconSourcesCache.set(cacheKey, []);
    return [];
  }

  const localPath = stripFileProtocol(normalized);
  const candidatePaths =
    baseDirectory &&
    !normalized.startsWith("/") &&
    !normalized.startsWith("\\") &&
    !isWindowsAbsolutePath(normalized) &&
    !hasUriScheme(normalized)
      ? buildRelativeIconCandidates(localPath, baseDirectory)
      : [localPath];

  try {
    const resolvedSources = Array.from(
      new Set(
        candidatePaths.map((candidatePath) =>
          convertFileSrc(stripFileProtocol(candidatePath), "asset"),
        ),
      ),
    );
    iconSourceCache.set(cacheKey, resolvedSources[0] ?? null);
    iconSourcesCache.set(cacheKey, resolvedSources);
    return resolvedSources;
  } catch {
    iconSourceCache.set(cacheKey, null);
    iconSourcesCache.set(cacheKey, []);
    return [];
  }
}
