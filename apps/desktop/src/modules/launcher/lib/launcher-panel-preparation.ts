import type { QueryClient } from "@tanstack/react-query";

import { COMMAND_PANELS } from "@/command-registry/panels";
import type { CommandPanel } from "@/command-registry/types";
import { warmCalculatorHistoryData } from "@/modules/calculator-history/api/query";
import { warmClipboardHistoryData } from "@/modules/clipboard/api/query";
import { warmDictionaryData } from "@/modules/dictionary/api/query";
import { warmExtensionsData } from "@/modules/extensions/api/query";
import { warmFileSearchData } from "@/modules/file-search/api/query";
import { warmGithubAssignedItemsData } from "@/modules/integrations/github/api/query";
import {
  isSecondaryLauncherPanel,
  preloadSecondaryLauncherPanel,
} from "@/modules/launcher/lib/secondary-panel-loader";
import {
  isTakeoverLauncherPanel,
  preloadTakeoverLauncherPanel,
} from "@/modules/launcher/lib/takeover-panel-loader";
import { warmNotesData } from "@/modules/notes/api/query";
import { warmScriptCommandsData } from "@/modules/script-commands/api/query";
import { preloadSettingsTab } from "@/modules/settings/takeover/lib/settings-tab-loader";
import { useSettingsPageStore } from "@/modules/settings/takeover/store/use-settings-page-store";
import { useLauncherUiStore } from "@/store/use-launcher-ui-store";
import { warmTodosData } from "@/modules/todo/api/query";
import { warmTranslationLanguagesData } from "@/modules/translation/api/query";
import { warmWindowEntriesData } from "@/modules/window-switcher/api/query";

export async function prepareLauncherPanel(
  panel: CommandPanel,
  queryClient: QueryClient,
): Promise<void> {
  if (isSecondaryLauncherPanel(panel)) {
    if (panel === COMMAND_PANELS.CALCULATOR_HISTORY) {
      await Promise.all([
        preloadSecondaryLauncherPanel(panel),
        warmCalculatorHistoryData(queryClient),
      ]);
      return;
    }

    await preloadSecondaryLauncherPanel(panel);
    return;
  }

  if (!isTakeoverLauncherPanel(panel)) {
    return;
  }

  if (panel === COMMAND_PANELS.SETTINGS) {
    const settingsTab = useSettingsPageStore.getState().activeTab;
    await Promise.all([preloadTakeoverLauncherPanel(panel), preloadSettingsTab(settingsTab)]);
    return;
  }

  if (panel === COMMAND_PANELS.NOTES) {
    await Promise.all([preloadTakeoverLauncherPanel(panel), warmNotesData(queryClient)]);
    return;
  }

  if (panel === COMMAND_PANELS.CLIPBOARD) {
    await Promise.all([preloadTakeoverLauncherPanel(panel), warmClipboardHistoryData(queryClient)]);
    return;
  }

  if (panel === COMMAND_PANELS.TODO) {
    await Promise.all([preloadTakeoverLauncherPanel(panel), warmTodosData(queryClient)]);
    return;
  }

  if (panel === COMMAND_PANELS.DICTIONARY) {
    const dictionaryQuery = useLauncherUiStore.getState().dictionaryQuery;
    await Promise.all([
      preloadTakeoverLauncherPanel(panel),
      warmDictionaryData(queryClient, dictionaryQuery),
    ]);
    return;
  }

  if (panel === COMMAND_PANELS.FILE_SEARCH) {
    const fileSearchQuery = useLauncherUiStore.getState().fileSearchQuery;
    await Promise.all([
      preloadTakeoverLauncherPanel(panel),
      warmFileSearchData(queryClient, fileSearchQuery),
    ]);
    return;
  }

  if (panel === COMMAND_PANELS.TRANSLATION) {
    await Promise.all([
      preloadTakeoverLauncherPanel(panel),
      warmTranslationLanguagesData(queryClient),
    ]);
    return;
  }

  if (panel === COMMAND_PANELS.SCRIPT_COMMANDS) {
    await Promise.all([preloadTakeoverLauncherPanel(panel), warmScriptCommandsData(queryClient)]);
    return;
  }

  if (panel === COMMAND_PANELS.WINDOW_SWITCHER) {
    await Promise.all([preloadTakeoverLauncherPanel(panel), warmWindowEntriesData(queryClient)]);
    return;
  }

  if (panel === COMMAND_PANELS.GITHUB) {
    await Promise.all([preloadTakeoverLauncherPanel(panel), warmGithubAssignedItemsData(queryClient)]);
    return;
  }

  if (panel === COMMAND_PANELS.EXTENSIONS) {
    await Promise.all([preloadTakeoverLauncherPanel(panel), warmExtensionsData(queryClient)]);
    return;
  }

  await preloadTakeoverLauncherPanel(panel);
}
