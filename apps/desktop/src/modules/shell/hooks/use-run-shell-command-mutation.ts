import { useMutation } from "@tanstack/react-query";

import { executeShellCommand } from "@/modules/shell/api/execute-shell-command";
import type { ExecuteShellCommandRequest } from "@/modules/shell/types";

export function useRunShellCommandMutation() {
  return useMutation({
    mutationFn: (request: ExecuteShellCommandRequest) => executeShellCommand(request),
  });
}
