import type { QueryClient } from "@tanstack/react-query";

import { getScriptCommands } from "@/modules/script-commands/api/get-script-commands";
import { getScriptCommandsDirectory } from "@/modules/script-commands/api/get-script-commands-directory";
import {
  SCRIPT_COMMANDS_DIRECTORY_QUERY_KEY,
  SCRIPT_COMMANDS_QUERY_KEY,
} from "@/modules/script-commands/constants";

const SCRIPT_COMMANDS_STALE_TIME_MS = 8_000;
const SCRIPT_COMMANDS_DIRECTORY_STALE_TIME_MS = 5 * 60 * 1000;

export function getScriptCommandsQueryOptions() {
  return {
    queryKey: SCRIPT_COMMANDS_QUERY_KEY,
    queryFn: getScriptCommands,
    staleTime: SCRIPT_COMMANDS_STALE_TIME_MS,
  };
}

export function getScriptCommandsDirectoryQueryOptions() {
  return {
    queryKey: SCRIPT_COMMANDS_DIRECTORY_QUERY_KEY,
    queryFn: getScriptCommandsDirectory,
    staleTime: SCRIPT_COMMANDS_DIRECTORY_STALE_TIME_MS,
  };
}

export async function warmScriptCommandsData(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.ensureQueryData(getScriptCommandsQueryOptions()),
    queryClient.ensureQueryData(getScriptCommandsDirectoryQueryOptions()),
  ]);
}
