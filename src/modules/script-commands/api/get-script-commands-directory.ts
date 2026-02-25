import { invoke } from "@tauri-apps/api/core";

import { assertScriptCommandsDesktopRuntime } from "@/modules/script-commands/api/runtime";

export async function getScriptCommandsDirectory(): Promise<string> {
  assertScriptCommandsDesktopRuntime();
  const response = await invoke<unknown>("get_script_commands_directory");
  if (typeof response !== "string" || response.trim().length === 0) {
    throw new Error("Invalid script commands directory response from backend.");
  }

  return response.trim();
}
