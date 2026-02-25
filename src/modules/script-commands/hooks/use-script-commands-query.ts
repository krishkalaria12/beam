import { useQuery } from "@tanstack/react-query";

import { getScriptCommands } from "@/modules/script-commands/api/get-script-commands";
import { SCRIPT_COMMANDS_QUERY_KEY } from "@/modules/script-commands/constants";

export function useScriptCommandsQuery() {
  return useQuery({
    queryKey: SCRIPT_COMMANDS_QUERY_KEY,
    queryFn: getScriptCommands,
    staleTime: 8_000,
  });
}
