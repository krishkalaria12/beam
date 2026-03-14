import type { CommandProvider } from "@/command-registry/types";
import {
  EXTENSIONS_PROVIDER_SCOPE,
} from "@/modules/extensions/constants";
import {
  invalidateExtensionCatalog,
  searchExtensionCatalog,
} from "@/modules/extensions/extension-catalog";

export function invalidateDiscoveredExtensionsCache(): void {
  invalidateExtensionCatalog();
}

export function createExtensionCommandProvider(): CommandProvider {
  return {
    id: "extensions-provider",
    scope: EXTENSIONS_PROVIDER_SCOPE,
    async provide({ context, signal }) {
      const normalizedQuery = context.query.trim().toLowerCase();
      if (!normalizedQuery || signal.aborted || !context.isDesktopRuntime) {
        return [];
      }

      const commands = await searchExtensionCatalog(normalizedQuery);
      if (signal.aborted) {
        return [];
      }

      return commands;
    },
  };
}
