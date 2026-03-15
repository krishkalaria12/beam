import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createScriptCommand } from "@/modules/script-commands/api/create-script-command";
import { SCRIPT_COMMANDS_QUERY_KEY } from "@/modules/script-commands/constants";
import { invalidateScriptCommandsProviderCache } from "@/modules/script-commands/script-commands-provider";
import type { CreateScriptCommandRequest } from "@/modules/script-commands/types";

export function useCreateScriptCommandMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateScriptCommandRequest) => createScriptCommand(request),
    onSuccess: async () => {
      invalidateScriptCommandsProviderCache();
      await queryClient.invalidateQueries({
        queryKey: SCRIPT_COMMANDS_QUERY_KEY,
      });
    },
  });
}
