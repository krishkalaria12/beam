import { isTauri } from "@tauri-apps/api/core";

export function assertScriptCommandsDesktopRuntime() {
  if (!isTauri()) {
    throw new Error("Script commands require desktop runtime.");
  }
}
