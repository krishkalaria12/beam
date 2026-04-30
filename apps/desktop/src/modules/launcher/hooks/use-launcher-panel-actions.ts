import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import type { CommandDescriptor, CommandPanel } from "@/command-registry/types";
import { useSettingsPageStore } from "@/modules/settings/takeover/store/use-settings-page-store";

import { prepareLauncherPanel } from "@/modules/launcher/lib/launcher-panel-preparation";
import { getLauncherPanelFromCommand } from "@/modules/launcher/lib/panel-warmup-policy";
import type { SecondaryLauncherPanel } from "@/modules/launcher/lib/secondary-panel-loader";

interface UseLauncherPanelActionsInput {
  openPanel: (panel: CommandPanel, clearSearch?: boolean) => void;
}

export function useLauncherPanelActions({ openPanel }: UseLauncherPanelActionsInput) {
  const queryClient = useQueryClient();

  const preparePanel = useCallback(
    async (panel: CommandPanel) => {
      await prepareLauncherPanel(panel, queryClient);
    },
    [queryClient],
  );

  const openPreparedPanel = useCallback(
    async (panel: CommandPanel, clearSearch = false) => {
      await preparePanel(panel);
      openPanel(panel, clearSearch);
    },
    [openPanel, preparePanel],
  );

  const openPreparedSecondaryPanel = useCallback(
    async (panel: SecondaryLauncherPanel) => {
      await openPreparedPanel(panel, true);
    },
    [openPreparedPanel],
  );

  const openExtensions = useCallback(() => {
    void openPreparedPanel("extensions", true);
  }, [openPreparedPanel]);

  const openSettings = useCallback(() => {
    useSettingsPageStore.getState().openGeneral();
    void openPreparedPanel("settings", true);
  }, [openPreparedPanel]);

  const prefetchRegistryCommand = useCallback(
    (command: CommandDescriptor) => {
      const panel = getLauncherPanelFromCommand(command);
      if (!panel) {
        return;
      }

      void preparePanel(panel);
    },
    [preparePanel],
  );

  const takeoverPanelOpeners = useMemo(
    () => ({
      openQuicklinks: () => {
        void openPreparedPanel("quicklinks");
      },
      openSpeedTest: () => {
        void openPreparedPanel("speed-test", true);
      },
      openFocus: () => {
        void openPreparedPanel("focus", true);
      },
      openClipboard: () => {
        void openPreparedPanel("clipboard", true);
      },
      openAi: () => {
        void openPreparedPanel("ai", true);
      },
      openTodo: () => {
        void openPreparedPanel("todo", true);
      },
      openNotes: () => {
        void openPreparedPanel("notes", true);
      },
      openSnippets: () => {
        void openPreparedPanel("snippets", true);
      },
      openExtensions,
      openScriptCommands: () => {
        void openPreparedPanel("script-commands", true);
      },
    }),
    [openExtensions, openPreparedPanel],
  );

  return {
    preparePanel,
    openPreparedPanel,
    openPreparedSecondaryPanel,
    openExtensions,
    openSettings,
    prefetchRegistryCommand,
    takeoverPanelOpeners,
  };
}
