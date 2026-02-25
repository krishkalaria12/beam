import { invoke } from "@tauri-apps/api/core";

import { assertScriptCommandsDesktopRuntime } from "@/modules/script-commands/api/runtime";
import {
  createScriptCommandRequestSchema,
  scriptCommandSummarySchema,
  type CreateScriptCommandRequest,
  type ScriptCommandSummary,
} from "@/modules/script-commands/types";

export async function createScriptCommand(
  request: CreateScriptCommandRequest,
): Promise<ScriptCommandSummary> {
  assertScriptCommandsDesktopRuntime();

  const parsedRequest = createScriptCommandRequestSchema.safeParse(request);
  if (!parsedRequest.success) {
    throw new Error("Invalid create script request.");
  }

  const response = await invoke<unknown>("create_script_command", { request: parsedRequest.data });
  const parsedResponse = scriptCommandSummarySchema.safeParse(response);
  if (!parsedResponse.success) {
    throw new Error("Invalid created script response from backend.");
  }

  return parsedResponse.data;
}
