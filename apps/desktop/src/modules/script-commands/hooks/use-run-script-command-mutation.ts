import { useMutation } from "@tanstack/react-query";

import { runScriptCommand } from "@/modules/script-commands/api/run-script-command";
import type { RunScriptCommandRequest } from "@/modules/script-commands/types";

export function useRunScriptCommandMutation() {
  return useMutation({
    mutationFn: (request: RunScriptCommandRequest) => runScriptCommand(request),
  });
}
