import { invoke } from "@tauri-apps/api/core";

export type UiStylePreference = "default" | "glassy" | "solid";

export const DEFAULT_BASE_COLOR = "#101113";

export function normalizeUiStyle(value: string | null | undefined): UiStylePreference {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (normalized === "glassy") return "glassy";
  if (normalized === "solid") return "solid";
  return "default";
}

export function normalizeBaseColor(value: string | null | undefined): string {
  const raw = String(value || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) {
    return raw.toLowerCase();
  }
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    const expanded = raw
      .slice(1)
      .split("")
      .map((ch) => `${ch}${ch}`)
      .join("");
    return `#${expanded}`.toLowerCase();
  }
  return DEFAULT_BASE_COLOR;
}

async function getUiStyle(): Promise<UiStylePreference> {
  const result = await invoke<unknown>("get_ui_style");
  return normalizeUiStyle(typeof result === "string" ? result : null);
}

export async function setUiStylePreference(style: UiStylePreference): Promise<UiStylePreference> {
  const normalized = normalizeUiStyle(style);
  const result = await invoke<unknown>("set_ui_style", { style: normalized });
  return normalizeUiStyle(typeof result === "string" ? result : normalized);
}

async function getBaseColor(): Promise<string> {
  const result = await invoke<unknown>("get_base_color");
  return normalizeBaseColor(typeof result === "string" ? result : null);
}

export async function setBaseColorPreference(color: string): Promise<string> {
  const normalized = normalizeBaseColor(color);
  const result = await invoke<unknown>("set_base_color", { color: normalized });
  return normalizeBaseColor(typeof result === "string" ? result : normalized);
}

export async function loadInitialUiStyleSettings(): Promise<{
  uiStyle: UiStylePreference;
  baseColor: string;
}> {
  const [uiStyle, baseColor] = await Promise.all([getUiStyle(), getBaseColor()]);
  return { uiStyle, baseColor };
}
