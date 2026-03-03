import { invoke, isTauri } from "@tauri-apps/api/core";

export interface LauncherThemeSummary {
  id: string;
  name: string;
  version?: string | null;
  author?: string | null;
  description?: string | null;
}

const SELECTED_THEME_STORAGE_KEY = "beam-launcher-theme-id";
export const LAUNCHER_THEME_CHANGE_EVENT = "beam-launcher-theme-change";

export async function listLauncherThemes(): Promise<LauncherThemeSummary[]> {
  if (!isTauri()) {
    return [];
  }

  const themes = await invoke<LauncherThemeSummary[]>("list_launcher_themes");
  return Array.isArray(themes) ? themes : [];
}

export async function getSelectedLauncherThemeId(): Promise<string | null> {
  if (!isTauri()) {
    const stored = localStorage.getItem(SELECTED_THEME_STORAGE_KEY)?.trim() || "";
    return stored.length > 0 ? stored : null;
  }

  const selected = await invoke<string | null>("get_selected_launcher_theme");
  const normalized = String(selected ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

export async function setSelectedLauncherThemeId(themeId: string | null): Promise<void> {
  const normalized = String(themeId ?? "").trim();
  const target = normalized.length > 0 ? normalized : null;

  if (!isTauri()) {
    if (target) {
      localStorage.setItem(SELECTED_THEME_STORAGE_KEY, target);
    } else {
      localStorage.removeItem(SELECTED_THEME_STORAGE_KEY);
    }
    return;
  }

  await invoke("set_selected_launcher_theme", {
    themeId: target,
    theme_id: target,
  });
}

export async function getLauncherThemeCss(themeId: string): Promise<string> {
  const normalized = themeId.trim();
  if (normalized.length === 0) {
    return "";
  }

  if (!isTauri()) {
    return "";
  }

  const css = await invoke<string>("get_launcher_theme_css", {
    themeId: normalized,
    theme_id: normalized,
  });
  return String(css ?? "");
}
