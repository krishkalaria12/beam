import { invoke } from "@tauri-apps/api/core";

import { assertScriptCommandsDesktopRuntime } from "@/modules/script-commands/api/runtime";
import {
  runScriptCommandRequestSchema,
  scriptExecutionResultSchema,
  type RunScriptCommandRequest,
  type ScriptExecutionResult,
} from "@/modules/script-commands/types";

export async function runScriptCommand(
  request: RunScriptCommandRequest,
): Promise<ScriptExecutionResult> {
  assertScriptCommandsDesktopRuntime();

  const parsedRequest = runScriptCommandRequestSchema.safeParse(request);
  if (!parsedRequest.success) {
    throw new Error("Invalid script execution request.");
  }

  const response = await invoke<unknown>("run_script_command", { request: parsedRequest.data });
  const parsedResponse = scriptExecutionResultSchema.safeParse(response);
  if (!parsedResponse.success) {
    throw new Error("Invalid script execution response from backend.");
  }

  return parsedResponse.data;
}
