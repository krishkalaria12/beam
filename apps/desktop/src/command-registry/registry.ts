import { STATIC_COMMANDS } from "@/command-registry/static-commands";
import {
  createStaticCommandRegistryStore,
  type StaticCommandRegistry,
} from "@/command-registry/static-registry";

function createStaticCommandRegistry(): StaticCommandRegistry {
  return createStaticCommandRegistryStore(STATIC_COMMANDS);
}

export const staticCommandRegistry = createStaticCommandRegistry();
