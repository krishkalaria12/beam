import { invoke, isTauri } from "@tauri-apps/api/core";

export async function getHyprWhsprRecordStatus(): Promise<string> {
  if (!isTauri()) {
    throw new Error("desktop runtime is required");
  }

  return invoke<string>("hyprwhspr_record_status");
}
