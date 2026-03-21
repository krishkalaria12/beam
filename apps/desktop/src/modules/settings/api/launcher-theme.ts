import { invoke } from "@tauri-apps/api/core";

export interface LauncherThemeSummary {
  id: string;
  name: string;
  version?: string | null;
  author?: string | null;
  description?: string | null;
}

export const LAUNCHER_THEME_CHANGE_EVENT = "beam-launcher-theme-change";

export async function listLauncherThemes(): Promise<LauncherThemeSummary[]> {
  const themes = await invoke<LauncherThemeSummary[]>("list_launcher_themes");
  return Array.isArray(themes) ? themes : [];
}

export async function getSelectedLauncherThemeId(): Promise<string | null> {
  const selected = await invoke<string | null>("get_selected_launcher_theme");
  const normalized = String(selected ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

export async function setSelectedLauncherThemeId(themeId: string | null): Promise<void> {
  const normalized = String(themeId ?? "").trim();
  const target = normalized.length > 0 ? normalized : null;

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

  const css = await invoke<string>("get_launcher_theme_css", {
    themeId: normalized,
    theme_id: normalized,
  });
  return String(css ?? "");
}
