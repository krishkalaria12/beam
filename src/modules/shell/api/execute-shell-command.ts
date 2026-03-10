import { invoke, isTauri } from "@tauri-apps/api/core";

import {
  executeShellCommandRequestSchema,
  executeShellCommandResultSchema,
  type ExecuteShellCommandRequest,
  type ExecuteShellCommandResult,
} from "@/modules/shell/types";

export async function executeShellCommand(
  request: ExecuteShellCommandRequest,
): Promise<ExecuteShellCommandResult> {
  if (!isTauri()) {
    throw new Error("Shell execution requires the desktop runtime.");
  }

  const parsedRequest = executeShellCommandRequestSchema.safeParse(request);
  if (!parsedRequest.success) {
    throw new Error("Invalid shell execution request.");
  }

  const response = await invoke<unknown>("execute_shell_command", {
    request: parsedRequest.data,
  });
  const parsedResponse = executeShellCommandResultSchema.safeParse(response);
  if (!parsedResponse.success) {
    throw new Error("Invalid shell execution response from backend.");
  }

  return parsedResponse.data;
}
