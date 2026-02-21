import type { ReactNode } from "react";

import type { CommandPanel } from "@/command-registry/types";

import ClipboardCommandGroup from "@/modules/clipboard/components/clipboard-command-group";
import DictionaryCommandGroup from "@/modules/dictionary/components/dictionary-command-group";
import FileSearchCommandGroup from "@/modules/file-search/components/file-search-command-group";
import QuicklinksCommandGroup from "@/modules/quicklinks/components/quicklinks-command-group";
import SpeedTestCommandGroup from "@/modules/speed-test/components/speed-test-command-group";
import TranslationCommandGroup from "@/modules/translation/components/translation-command-group";
import ExtensionsCommandGroup from "@/modules/extensions/components/extensions-command-group";
import { ExtensionRunnerView } from "@/modules/extensions/components/extension-runner-view";
import type { QuicklinksView } from "@/store/use-launcher-ui-store";

const TAKEOVER_PANELS = [
  "file-search",
  "dictionary",
  "translation",
  "quicklinks",
  "speed-test",
  "clipboard",
  "extensions",
  "extension-runner",
] as const;

type TakeoverPanel = (typeof TAKEOVER_PANELS)[number];

function isTakeoverPanel(panel: CommandPanel): panel is TakeoverPanel {
  return (TAKEOVER_PANELS as readonly string[]).includes(panel);
}

interface TakeoverPanelRendererInput {
  fileSearchQuery: string;
  dictionaryQuery: string;
  translationQuery: string;
  quicklinksView: QuicklinksView;
  setQuicklinksView: (view: QuicklinksView) => void;
  openFileSearch: (query: string) => void;
  openDictionary: (query: string) => void;
  openTranslation: (query: string) => void;
  openQuicklinks: () => void;
  openSpeedTest: () => void;
  openClipboard: () => void;
  openExtensions: () => void;
  backToCommands: () => void;
}

type TakeoverPanelRenderer = (input: TakeoverPanelRendererInput) => ReactNode;

const TAKEOVER_PANEL_RENDERERS: Record<TakeoverPanel, TakeoverPanelRenderer> = {
  "file-search": (input) => (
    <FileSearchCommandGroup
      isOpen
      query={input.fileSearchQuery}
      onOpen={input.openFileSearch}
      onBack={input.backToCommands}
    />
  ),
  dictionary: (input) => (
    <DictionaryCommandGroup
      isOpen
      query={input.dictionaryQuery}
      onOpen={input.openDictionary}
      onBack={input.backToCommands}
    />
  ),
  translation: (input) => (
    <TranslationCommandGroup
      isOpen
      query={input.translationQuery}
      onOpen={input.openTranslation}
      onBack={input.backToCommands}
    />
  ),
  quicklinks: (input) => (
    <QuicklinksCommandGroup
      isOpen
      view={input.quicklinksView}
      setView={input.setQuicklinksView}
      onOpen={input.openQuicklinks}
      onBack={input.backToCommands}
    />
  ),
  "speed-test": (input) => (
    <SpeedTestCommandGroup
      isOpen
      onOpen={input.openSpeedTest}
      onBack={input.backToCommands}
    />
  ),
  clipboard: (input) => (
    <ClipboardCommandGroup
      isOpen
      onOpen={input.openClipboard}
      onBack={input.backToCommands}
    />
  ),
  extensions: (input) => (
    <ExtensionsCommandGroup
      isOpen
      onOpen={input.openExtensions}
      onBack={input.backToCommands}
    />
  ),
  "extension-runner": (input) => (
    <div className="absolute inset-0 z-50 bg-background">
      <ExtensionRunnerView
        onBack={input.backToCommands}
        onOpenExtensions={input.openExtensions}
      />
    </div>
  ),
};

interface LauncherTakeoverPanelProps extends TakeoverPanelRendererInput {
  activePanel: CommandPanel;
}

export function LauncherTakeoverPanel({
  activePanel,
  fileSearchQuery,
  dictionaryQuery,
  translationQuery,
  quicklinksView,
  setQuicklinksView,
  openFileSearch,
  openDictionary,
  openTranslation,
  openQuicklinks,
  openSpeedTest,
  openClipboard,
  openExtensions,
  backToCommands,
}: LauncherTakeoverPanelProps) {
  if (!isTakeoverPanel(activePanel)) {
    return null;
  }

  return TAKEOVER_PANEL_RENDERERS[activePanel]({
    fileSearchQuery,
    dictionaryQuery,
    translationQuery,
    quicklinksView,
    setQuicklinksView,
    openFileSearch,
    openDictionary,
    openTranslation,
    openQuicklinks,
    openSpeedTest,
    openClipboard,
    openExtensions,
    backToCommands,
  });
}
