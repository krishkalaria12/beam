import { invoke, isTauri } from "@tauri-apps/api/core";

export async function toggleAwake(): Promise<boolean> {
  if (!isTauri()) {
    throw new Error("desktop runtime is required");
  }

  return invoke<boolean>("toggle_awake");
}

export async function getAwakeStatus(): Promise<boolean> {
  if (!isTauri()) {
    return false;
  }

  return invoke<boolean>("get_awake_status");
}
