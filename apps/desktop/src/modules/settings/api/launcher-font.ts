import { invoke, isTauri } from "@tauri-apps/api/core";

export interface FontFamilySummary {
  id: string;
  name: string;
}

export interface LauncherFontSizePreset {
  id: "small" | "default" | "large";
  label: string;
  size: number;
}

export const DEFAULT_LAUNCHER_FONT_FAMILY = "default";
export const SYSTEM_LAUNCHER_FONT_FAMILY = "system";
export const SMALL_LAUNCHER_FONT_SIZE = 12;
export const DEFAULT_LAUNCHER_FONT_SIZE = 13;
export const LARGE_LAUNCHER_FONT_SIZE = 14;
export const MIN_LAUNCHER_FONT_SIZE = 10;
export const MAX_LAUNCHER_FONT_SIZE = 18;
export const LAUNCHER_FONT_FAMILIES_QUERY_KEY = ["settings", "launcher-font-families"] as const;
export const LAUNCHER_FONT_FAMILY_QUERY_KEY = ["settings", "launcher-font-family"] as const;
export const LAUNCHER_FONT_SIZE_QUERY_KEY = ["settings", "launcher-font-size"] as const;
export const LAUNCHER_FONT_SIZE_PRESETS: LauncherFontSizePreset[] = [
  { id: "small", label: "Small", size: SMALL_LAUNCHER_FONT_SIZE },
  { id: "default", label: "Default", size: DEFAULT_LAUNCHER_FONT_SIZE },
  { id: "large", label: "Large", size: LARGE_LAUNCHER_FONT_SIZE },
];

const LAUNCHER_FONT_FAMILY_STORAGE_KEY = "beam-launcher-font-family";
const LAUNCHER_FONT_SIZE_STORAGE_KEY = "beam-launcher-font-size";
const BEAM_DEFAULT_FONT_STACK = '"Manrope", "Ubuntu", "Noto Sans", "Segoe UI", sans-serif';
const SYSTEM_FONT_STACK = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

function normalizeFontFamilyId(value: unknown): string {
  if (typeof value !== "string") {
    return DEFAULT_LAUNCHER_FONT_FAMILY;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : DEFAULT_LAUNCHER_FONT_FAMILY;
}

function normalizeFontFamilies(value: unknown): FontFamilySummary[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const record = entry as Record<string, unknown>;
      const id = normalizeFontFamilyId(record.id);
      const name =
        typeof record.name === "string" && record.name.trim().length > 0 ? record.name.trim() : id;

      return { id, name };
    })
    .filter((entry): entry is FontFamilySummary => Boolean(entry))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function normalizeFontSize(value: unknown): number {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : Number.NaN;

  if (!Number.isFinite(numeric)) {
    return DEFAULT_LAUNCHER_FONT_SIZE;
  }

  const rounded = Math.round(numeric * 2) / 2;
  return Math.min(MAX_LAUNCHER_FONT_SIZE, Math.max(MIN_LAUNCHER_FONT_SIZE, rounded));
}

export function getLauncherFontSizePreset(size: number): LauncherFontSizePreset {
  const normalized = normalizeFontSize(size);

  return LAUNCHER_FONT_SIZE_PRESETS.reduce((closest, candidate) => {
    const closestDistance = Math.abs(closest.size - normalized);
    const candidateDistance = Math.abs(candidate.size - normalized);
    return candidateDistance < closestDistance ? candidate : closest;
  }, LAUNCHER_FONT_SIZE_PRESETS[0]);
}

function quoteFontFamily(family: string): string {
  return `"${family.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

function resolveFontFamilyStack(familyId: string): string {
  const normalized = normalizeFontFamilyId(familyId);

  if (normalized === DEFAULT_LAUNCHER_FONT_FAMILY) {
    return BEAM_DEFAULT_FONT_STACK;
  }

  if (normalized === SYSTEM_LAUNCHER_FONT_FAMILY) {
    return SYSTEM_FONT_STACK;
  }

  return `${quoteFontFamily(normalized)}, ${SYSTEM_FONT_STACK}`;
}

export function applyLauncherFontFamily(familyId: string): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.style.setProperty("--beam-font-sans", resolveFontFamilyStack(familyId));
}

export function applyLauncherFontSize(size: number): void {
  if (typeof document === "undefined") {
    return;
  }

  const normalized = normalizeFontSize(size);
  document.documentElement.style.setProperty("--beam-font-size-base", `${normalized}px`);
}

export async function listFontFamilies(): Promise<FontFamilySummary[]> {
  if (!isTauri()) {
    return [];
  }

  const result = await invoke<unknown>("list_font_families");
  return normalizeFontFamilies(result);
}

export async function getLauncherFontFamily(): Promise<string> {
  if (!isTauri()) {
    return normalizeFontFamilyId(localStorage.getItem(LAUNCHER_FONT_FAMILY_STORAGE_KEY));
  }

  const result = await invoke<unknown>("get_launcher_font_family");
  return normalizeFontFamilyId(result);
}

export async function setLauncherFontFamily(familyId: string): Promise<string> {
  const normalized = normalizeFontFamilyId(familyId);

  if (!isTauri()) {
    localStorage.setItem(LAUNCHER_FONT_FAMILY_STORAGE_KEY, normalized);
    return normalized;
  }

  const result = await invoke<unknown>("set_launcher_font_family", {
    family: normalized,
  });
  return normalizeFontFamilyId(result);
}

export async function getLauncherFontSize(): Promise<number> {
  if (!isTauri()) {
    return normalizeFontSize(localStorage.getItem(LAUNCHER_FONT_SIZE_STORAGE_KEY));
  }

  const result = await invoke<unknown>("get_launcher_font_size");
  return normalizeFontSize(result);
}

export async function setLauncherFontSize(size: number): Promise<number> {
  const normalized = normalizeFontSize(size);

  if (!isTauri()) {
    localStorage.setItem(LAUNCHER_FONT_SIZE_STORAGE_KEY, String(normalized));
    return normalized;
  }

  const result = await invoke<unknown>("set_launcher_font_size", {
    size: normalized,
  });
  return normalizeFontSize(result);
}
