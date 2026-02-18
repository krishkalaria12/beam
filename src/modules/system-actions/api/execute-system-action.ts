import { invoke, isTauri } from "@tauri-apps/api/core";

import type { SystemAction } from "../types";

export async function executeSystemAction(action: SystemAction): Promise<void> {
  if (!isTauri()) {
    throw new Error("desktop runtime is required");
  }

  await invoke("execute_system_action", { action });
}
