import { SCRIPT_TRIGGER_MODE } from "@/command-registry/trigger-registry";

export const SCRIPT_COMMANDS_QUERY_KEY = ["script-commands"] as const;
export const SCRIPT_COMMANDS_DIRECTORY_QUERY_KEY = ["script-commands", "directory"] as const;
export const SCRIPT_COMMANDS_PROVIDER_SCOPE: ReadonlyArray<
  "normal" | "compressed" | typeof SCRIPT_TRIGGER_MODE
> = ["normal", "compressed", SCRIPT_TRIGGER_MODE];
export const SCRIPT_COMMANDS_PROVIDER_CACHE_TTL_MS = 10_000;
export const SCRIPT_COMMANDS_RUN_EXTENSION_COMMAND_ID = "script-commands.run";
