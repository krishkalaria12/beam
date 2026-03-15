import { invoke, isTauri } from "@tauri-apps/api/core";

import {
  scriptCommandSummaryListSchema,
  type ScriptCommandSummary,
} from "@/modules/script-commands/types";

export async function getScriptCommands(): Promise<ScriptCommandSummary[]> {
  if (!isTauri()) {
    return [];
  }

  const response = await invoke<unknown>("get_script_commands");
  const parsed = scriptCommandSummaryListSchema.safeParse(response);
  if (!parsed.success) {
    throw new Error("Invalid script commands response from backend.");
  }

  return parsed.data;
}
