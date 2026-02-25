import { useQuery } from "@tanstack/react-query";

import { getScriptCommandsDirectory } from "@/modules/script-commands/api/get-script-commands-directory";
import { SCRIPT_COMMANDS_DIRECTORY_QUERY_KEY } from "@/modules/script-commands/constants";

export function useScriptCommandsDirectoryQuery() {
  return useQuery({
    queryKey: SCRIPT_COMMANDS_DIRECTORY_QUERY_KEY,
    queryFn: getScriptCommandsDirectory,
    staleTime: 5 * 60 * 1000,
  });
}
