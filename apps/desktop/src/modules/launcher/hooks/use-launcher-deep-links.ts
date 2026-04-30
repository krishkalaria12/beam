import { useQueryClient } from "@tanstack/react-query";
import { invoke, isTauri } from "@tauri-apps/api/core";
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
import { getFocusStatus } from "@/modules/focus/api/focus";
import type { FocusSessionDraft } from "@/modules/focus/types";

interface UseLauncherDeepLinksInput {
  openPanel: (panel: CommandPanel, takeover?: boolean) => void;
}

function parseFocusDeepLink(
  value: string,
):
  | { kind: "start"; draft?: FocusSessionDraft }
  | { kind: "open" }
  | { kind: "toggle" }
  | { kind: "complete" }
  | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (url.protocol !== "beam:" && url.protocol !== "raycast:") {
    return null;
  }

  const pathParts = [url.hostname, ...url.pathname.split("/")].filter(Boolean);
  if (pathParts[0] !== "focus") {
    return null;
  }

  const action = pathParts[1] || "start";
  if (action === "toggle") {
    return { kind: "toggle" };
  }
  if (action === "complete") {
    return { kind: "complete" };
  }
  if (action === "open") {
    return { kind: "open" };
  }
  if (action !== "start") {
    return null;
  }

  const goal = url.searchParams.get("goal")?.trim();
  const durationParam = url.searchParams.get("duration") ?? url.searchParams.get("minutes");
  const durationMinutes = durationParam ? Number.parseInt(durationParam, 10) : Number.NaN;
  const hasDraft = Boolean(goal) || Number.isFinite(durationMinutes);
  if (!hasDraft) {
    return { kind: "start" };
  }

  return {
    kind: "start",
    draft: {
      goal: goal || "Deep work",
      durationSeconds: Number.isFinite(durationMinutes)
        ? Math.max(1, durationMinutes) * 60
        : 25 * 60,
      mode: "block",
      categoryIds: [],
      apps: [],
      websites: [],
    },
  };
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

  const handleFocusDeepLink = useCallback(
    async (deepLinkUrl: string) => {
      const parsed = parseFocusDeepLink(deepLinkUrl);
      if (!parsed) {
        return false;
      }

      try {
        if (parsed.kind === "complete") {
          await invoke("complete_focus_session");
          return true;
        }
        if (parsed.kind === "toggle") {
          await invoke("toggle_focus_session");
          return true;
        }
        if (parsed.kind === "open") {
          openPanel("focus", true);
          return true;
        }
        if (parsed.draft) {
          await invoke("start_focus_session", { draft: parsed.draft });
          return true;
        }

        const status = await getFocusStatus();
        await invoke("start_focus_session", { draft: status.lastDraft });
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        toast.error(`Focus deeplink failed: ${message}`);
        openPanel("focus", true);
        return true;
      }
    },
    [openPanel],
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

      void handleFocusDeepLink(deepLinkUrl).then((handled) => {
        if (handled) {
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
      });
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
