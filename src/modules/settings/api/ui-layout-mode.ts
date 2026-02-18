import { invoke, isTauri } from "@tauri-apps/api/core";

import type { UiLayoutMode } from "../hooks/use-ui-layout";

const UI_LAYOUT_STORAGE_KEY = "beam-ui-layout-mode";

export async function getUiLayoutMode(): Promise<UiLayoutMode> {
  if (!isTauri()) {
    const stored = localStorage.getItem(UI_LAYOUT_STORAGE_KEY);
    return stored === "compressed" ? "compressed" : "expanded";
  }

  const mode = await invoke<UiLayoutMode>("get_ui_layout_mode");
  return mode === "compressed" ? "compressed" : "expanded";
}

export async function setUiLayoutMode(mode: UiLayoutMode): Promise<void> {
  if (!isTauri()) {
    localStorage.setItem(UI_LAYOUT_STORAGE_KEY, mode);
    return;
  }

  await invoke("set_ui_layout_mode", { mode });
}
