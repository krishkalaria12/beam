import type { ReactNode } from "react";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

import type { CommandPanel } from "@/command-registry/types";
import { LauncherTakeoverSurface } from "@/modules/launcher/components/launcher-takeover-surface";

import type { QuicklinksView } from "@/store/use-launcher-ui-store";

const ClipboardCommandGroup = lazy(() => import("@/modules/clipboard/components/clipboard-command-group"));
const DictionaryCommandGroup = lazy(() => import("@/modules/dictionary/components/dictionary-command-group"));
const FileSearchCommandGroup = lazy(() => import("@/modules/file-search/components/file-search-command-group"));
const QuicklinksCommandGroup = lazy(() => import("@/modules/quicklinks/components/quicklinks-command-group"));
const SpeedTestCommandGroup = lazy(() => import("@/modules/speed-test/components/speed-test-command-group"));
const TranslationCommandGroup = lazy(() => import("@/modules/translation/components/translation-command-group"));
const ExtensionsCommandGroup = lazy(() => import("@/modules/extensions/components/extensions-command-group"));
const ExtensionRunnerView = lazy(() =>
  import("@/modules/extensions/components/extension-runner-view").then((mod) => ({
    default: mod.ExtensionRunnerView,
  }))
);

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
    <LauncherTakeoverSurface>
      <ExtensionRunnerView
        onBack={input.backToCommands}
        onOpenExtensions={input.openExtensions}
      />
    </LauncherTakeoverSurface>
  ),
};

interface LauncherTakeoverPanelProps extends TakeoverPanelRendererInput {
  activePanel: CommandPanel;
}

function TakeoverPanelFallback() {
  return (
    <LauncherTakeoverSurface>
      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Loading panel...
      </div>
    </LauncherTakeoverSurface>
  );
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

  return (
    <Suspense fallback={<TakeoverPanelFallback />}>
      {TAKEOVER_PANEL_RENDERERS[activePanel]({
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
      })}
    </Suspense>
  );
}
