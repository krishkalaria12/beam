import { invoke } from "@tauri-apps/api/core";

import type { UiLayoutMode } from "../hooks/use-ui-layout";

export async function getUiLayoutMode(): Promise<UiLayoutMode> {
  const mode = await invoke<UiLayoutMode>("get_ui_layout_mode");
  return mode === "compressed" ? "compressed" : "expanded";
}

export async function setUiLayoutMode(mode: UiLayoutMode): Promise<void> {
  await invoke("set_ui_layout_mode", { mode });
}
