import { useQuery } from "@tanstack/react-query";

import { getScriptCommandsQueryOptions } from "@/modules/script-commands/api/query";

export function useScriptCommandsQuery() {
  return useQuery({
    ...getScriptCommandsQueryOptions(),
  });
}
