import { invoke, isTauri } from "@tauri-apps/api/core";

export const ICON_THEME_QUERY_KEY = ["settings", "icon-theme"] as const;
export const ICON_THEMES_QUERY_KEY = ["settings", "icon-themes"] as const;
const ICON_THEME_STORAGE_KEY = "beam-icon-theme";

export interface IconThemeSummary {
  id: string;
  name: string;
}

function normalizeIconThemeId(value: unknown): string {
  if (typeof value !== "string") {
    return "auto";
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : "auto";
}

function normalizeIconThemes(value: unknown): IconThemeSummary[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const record = entry as Record<string, unknown>;
      const id = normalizeIconThemeId(record.id);
      const name =
        typeof record.name === "string" && record.name.trim().length > 0
          ? record.name.trim()
          : id;

      if (id === "auto") {
        return null;
      }

      return { id, name };
    })
    .filter((entry): entry is IconThemeSummary => Boolean(entry))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function listIconThemes(): Promise<IconThemeSummary[]> {
  if (!isTauri()) {
    return [];
  }

  const result = await invoke<unknown>("list_icon_themes");
  return normalizeIconThemes(result);
}

export async function getIconTheme(): Promise<string> {
  if (!isTauri()) {
    return normalizeIconThemeId(localStorage.getItem(ICON_THEME_STORAGE_KEY));
  }

  const result = await invoke<unknown>("get_icon_theme");
  return normalizeIconThemeId(result);
}

export async function setIconTheme(themeId: string): Promise<string> {
  const normalized = normalizeIconThemeId(themeId);

  if (!isTauri()) {
    localStorage.setItem(ICON_THEME_STORAGE_KEY, normalized);
    return normalized;
  }

  const result = await invoke<unknown>("set_icon_theme", {
    themeId: normalized,
    theme_id: normalized,
  });
  return normalizeIconThemeId(result);
}
