import { isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect } from "react";
import { toast } from "sonner";

import type { CommandPanel } from "@/command-registry/types";
import { getDiscoveredPlugins } from "@/modules/extensions/api/get-discovered-plugins";
import { persistentExtensionRunnerManager } from "@/modules/extensions/background/persistent-runners";
import { extensionSidecarService } from "@/modules/extensions/sidecar-service";
import { parseRaycastDeepLink } from "@/modules/extensions/sidecar/deep-link";
import { useExtensionRuntimeStore } from "@/modules/extensions/runtime/store";
import { useExtensionsUiStore } from "@/modules/extensions/store/use-extensions-ui-store";

interface UseLauncherDeepLinksInput {
  openPanel: (panel: CommandPanel, takeover?: boolean) => void;
  backToCommands: () => void;
}

export function useLauncherDeepLinks({ openPanel, backToCommands }: UseLauncherDeepLinksInput) {
  const openExtensionsFromDeepLink = useCallback(
    (extensionSlug?: string) => {
      openPanel("extensions", true);
      const extensionsUi = useExtensionsUiStore.getState();
      const normalizedSlug = extensionSlug?.trim() ?? "";
      if (normalizedSlug.length > 0) {
        extensionsUi.setSearch(normalizedSlug);
        extensionsUi.setDebouncedSearch(normalizedSlug);
        extensionsUi.setSearchDebouncing(false);
      }
    },
    [openPanel],
  );

  const runExtensionCommandFromDeepLink = useCallback(
    async (ownerOrAuthor: string, extensionName: string, commandName: string) => {
      const requestedOwner = ownerOrAuthor.trim().toLowerCase();
      const requestedExtension = extensionName.trim().toLowerCase();
      const requestedCommand = commandName.trim().toLowerCase();
      if (!requestedOwner || !requestedExtension || !requestedCommand) {
        return;
      }

      const discovered = await getDiscoveredPlugins();
      const matchedPlugin = discovered.find((plugin) => {
        const owner = plugin.owner?.trim().toLowerCase() ?? "";
        const author =
          typeof plugin.author === "string"
            ? plugin.author.trim().toLowerCase()
            : (plugin.author?.name?.trim().toLowerCase() ?? "");
        const ownerMatches = owner.length > 0 && owner === requestedOwner;
        const authorMatches = author.length > 0 && author === requestedOwner;
        if (!ownerMatches && !authorMatches) {
          return false;
        }

        return (
          plugin.pluginName.trim().toLowerCase() === requestedExtension &&
          plugin.commandName.trim().toLowerCase() === requestedCommand
        );
      });

      if (!matchedPlugin) {
        openExtensionsFromDeepLink(extensionName);
        toast.error(
          `Extension command not found: ${ownerOrAuthor}/${extensionName}/${commandName}`,
        );
        return;
      }

      const pluginMode =
        matchedPlugin.mode?.trim().toLowerCase() === "menu-bar"
          ? "menu-bar"
          : matchedPlugin.mode?.trim().toLowerCase() === "no-view"
            ? "no-view"
            : "view";

      if (
        pluginMode === "menu-bar" ||
        (pluginMode === "no-view" && typeof matchedPlugin.interval === "string")
      ) {
        try {
          await persistentExtensionRunnerManager.runPlugin(matchedPlugin, "userInitiated");
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          toast.error(`Failed to launch extension command: ${message}`);
        }
        return;
      }

      useExtensionRuntimeStore.getState().resetForNewPlugin({
        pluginPath: matchedPlugin.pluginPath,
        pluginMode,
        title: matchedPlugin.title,
        subtitle:
          [matchedPlugin.pluginTitle, matchedPlugin.description ?? ""]
            .filter((part) => part.trim().length > 0)
            .join(" - ") || undefined,
      });

      if (pluginMode === "view") {
        openPanel("extension-runner", true);
      }

      try {
        await extensionSidecarService.runPlugin({
          pluginPath: matchedPlugin.pluginPath,
          mode: pluginMode,
          aiAccessStatus: false,
        });
      } catch (error) {
        useExtensionRuntimeStore.getState().resetRuntime();
        if (pluginMode === "view") {
          backToCommands();
        }
        const message = error instanceof Error ? error.message : String(error);
        toast.error(`Failed to launch extension command: ${message}`);
      }
    },
    [backToCommands, openExtensionsFromDeepLink, openPanel],
  );

  useEffect(() => {
    if (!isTauri()) {
      return;
    }

    let disposed = false;
    let unlisten: (() => void) | undefined;

    void listen<string>("deep-link", (event) => {
      const deepLinkUrl = event.payload;
      if (extensionSidecarService.handleDeepLink(deepLinkUrl)) {
        return;
      }

      const parsed = parseRaycastDeepLink(deepLinkUrl);
      if (!parsed.handled) {
        return;
      }

      if (parsed.kind === "extensions-store") {
        openExtensionsFromDeepLink(parsed.extensionSlug);
        return;
      }

      if (parsed.kind === "extensions-command") {
        void runExtensionCommandFromDeepLink(
          parsed.ownerOrAuthor,
          parsed.extensionName,
          parsed.commandName,
        );
      }
    })
      .then((cleanup) => {
        if (disposed) {
          cleanup();
          return;
        }
        unlisten = cleanup;
      })
      .catch((error) => {
        console.error("Failed to listen for deep links:", error);
      });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [openExtensionsFromDeepLink, runExtensionCommandFromDeepLink]);
}
