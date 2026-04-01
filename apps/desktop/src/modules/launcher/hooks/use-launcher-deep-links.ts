import { useQueryClient } from "@tanstack/react-query";
import { isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useCallback } from "react";
import { toast } from "sonner";

import type { CommandPanel } from "@/command-registry/types";
import { persistentExtensionRunnerManager } from "@/modules/extensions/background/persistent-runners";
import { findExtensionCommandByQualifiedName } from "@/modules/extensions/extension-catalog";
import { extensionManagerService } from "@/modules/extensions/extension-manager-service";
import { parseRaycastDeepLink } from "@/modules/extensions/extension-manager/deep-link";
import { prepareLauncherPanel } from "@/modules/launcher/lib/launcher-panel-preparation";
import { useExtensionsUiStore } from "@/modules/extensions/store/use-extensions-ui-store";
import { useMountEffect } from "@/hooks/use-mount-effect";

interface UseLauncherDeepLinksInput {
  openPanel: (panel: CommandPanel, takeover?: boolean) => void;
}

export function useLauncherDeepLinks({ openPanel }: UseLauncherDeepLinksInput) {
  const queryClient = useQueryClient();
  const openExtensionsFromDeepLink = useCallback(
    (extensionSlug?: string) => {
      openPanel("extensions", true);
      const extensionsUi = useExtensionsUiStore.getState();
      const normalizedSlug = extensionSlug?.trim() ?? "";
      if (normalizedSlug.length > 0) {
        extensionsUi.primeSearch(normalizedSlug);
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

      const matchedPlugin = await findExtensionCommandByQualifiedName({
        ownerOrAuthor: requestedOwner,
        extensionName: requestedExtension,
        commandName: requestedCommand,
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

      const subtitle =
        [matchedPlugin.pluginTitle, matchedPlugin.description ?? ""]
          .filter((part) => part.trim().length > 0)
          .join(" - ") || undefined;

      const launchPromise = extensionManagerService.launchForegroundPlugin({
        title: matchedPlugin.title,
        subtitle,
        pluginPath: matchedPlugin.pluginPath,
        mode: pluginMode,
        aiAccessStatus: false,
      });

      if (pluginMode === "view") {
        await Promise.all([
          prepareLauncherPanel("extension-runner", queryClient).then(() => {
            openPanel("extension-runner", true);
          }),
          launchPromise,
        ]);
        return;
      }

      try {
        await launchPromise;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        toast.error(`Failed to launch extension command: ${message}`);
      }
    },
    [openExtensionsFromDeepLink, openPanel, queryClient],
  );

  useMountEffect(() => {
    if (!isTauri()) {
      return;
    }

    let disposed = false;
    let unlisten: (() => void) | undefined;

    void listen<string>("deep-link", (event) => {
      const deepLinkUrl = event.payload;
      if (persistentExtensionRunnerManager.handleDeepLink(deepLinkUrl)) {
        return;
      }

      if (extensionManagerService.handleDeepLink(deepLinkUrl)) {
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
  });
}
