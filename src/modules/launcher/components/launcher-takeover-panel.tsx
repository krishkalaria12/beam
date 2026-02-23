import { lazy, Suspense, type ReactNode } from "react";
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

  let content: ReactNode = null;

  if (activePanel === "file-search") {
    content = (
      <FileSearchCommandGroup
        isOpen
        query={fileSearchQuery}
        onOpen={openFileSearch}
        onBack={backToCommands}
      />
    );
  } else if (activePanel === "dictionary") {
    content = (
      <DictionaryCommandGroup
        isOpen
        query={dictionaryQuery}
        onOpen={openDictionary}
        onBack={backToCommands}
      />
    );
  } else if (activePanel === "translation") {
    content = (
      <TranslationCommandGroup
        isOpen
        query={translationQuery}
        onOpen={openTranslation}
        onBack={backToCommands}
      />
    );
  } else if (activePanel === "quicklinks") {
    content = (
      <QuicklinksCommandGroup
        isOpen
        view={quicklinksView}
        setView={setQuicklinksView}
        onOpen={openQuicklinks}
        onBack={backToCommands}
      />
    );
  } else if (activePanel === "speed-test") {
    content = (
      <SpeedTestCommandGroup
        isOpen
        onOpen={openSpeedTest}
        onBack={backToCommands}
      />
    );
  } else if (activePanel === "clipboard") {
    content = (
      <ClipboardCommandGroup
        isOpen
        onOpen={openClipboard}
        onBack={backToCommands}
      />
    );
  } else if (activePanel === "extensions") {
    content = (
      <ExtensionsCommandGroup
        isOpen
        onOpen={openExtensions}
        onBack={backToCommands}
      />
    );
  } else if (activePanel === "extension-runner") {
    content = (
      <LauncherTakeoverSurface>
        <ExtensionRunnerView
          onBack={backToCommands}
          onOpenExtensions={openExtensions}
        />
      </LauncherTakeoverSurface>
    );
  }

  return (
    <Suspense fallback={<TakeoverPanelFallback />}>
      {content}
    </Suspense>
  );
}
