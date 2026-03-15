import { invoke } from "@tauri-apps/api/core";

import { assertScriptCommandsDesktopRuntime } from "@/modules/script-commands/api/runtime";

export async function openScriptCommandsDirectory(): Promise<void> {
  assertScriptCommandsDesktopRuntime();
  await invoke("open_script_commands_directory");
}
