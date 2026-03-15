import { invoke, isTauri } from "@tauri-apps/api/core";

export type HyprWhsprRecordAction = "start" | "stop" | "cancel" | "toggle" | "status";

interface ExecuteHyprWhsprRecordOptions {
  hideLauncher?: boolean;
}

export async function executeHyprWhsprRecord(
  action: HyprWhsprRecordAction,
  options?: ExecuteHyprWhsprRecordOptions,
): Promise<string> {
  if (!isTauri()) {
    throw new Error("desktop runtime is required");
  }

  const hideWindow = options?.hideLauncher ?? true;
  return invoke<string>("hyprwhspr_record", {
    action,
    hideWindow,
    hide_window: hideWindow,
  });
}
