import { useQuery } from "@tanstack/react-query";

import { getScriptCommandsDirectoryQueryOptions } from "@/modules/script-commands/api/query";

export function useScriptCommandsDirectoryQuery() {
  return useQuery({
    ...getScriptCommandsDirectoryQueryOptions(),
  });
}
