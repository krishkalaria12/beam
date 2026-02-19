import { STATIC_COMMANDS } from "@/command-registry/static-commands";
import {
  createStaticCommandRegistry as createStaticCommandRegistryStore,
  type StaticCommandRegistry,
} from "@/command-registry/static-registry";

export function createStaticCommandRegistry(): StaticCommandRegistry {
  return createStaticCommandRegistryStore(STATIC_COMMANDS);
}

export const staticCommandRegistry = createStaticCommandRegistry();
