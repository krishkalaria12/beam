import { lazy, Suspense, type ReactNode } from "react";

import {
  COMMAND_PANELS,
  TAKEOVER_COMMAND_PANELS,
} from "@/command-registry/panels";
import type { CommandPanel } from "@/command-registry/types";
import { CommandLoadingState } from "@/components/command/command-loading-state";
import { LauncherTakeoverSurface } from "@/modules/launcher/components/launcher-takeover-surface";

import type { QuicklinksView } from "@/store/use-launcher-ui-store";

const ClipboardCommandGroup = lazy(() => import("@/modules/clipboard/components/clipboard-command-group"));
const TodoCommandGroup = lazy(() => import("@/modules/todo/components/todo-command-group"));
const DictionaryCommandGroup = lazy(() => import("@/modules/dictionary/components/dictionary-command-group"));
const FileSearchCommandGroup = lazy(() => import("@/modules/file-search/components/file-search-command-group"));
const QuicklinksCommandGroup = lazy(() => import("@/modules/quicklinks/components/quicklinks-command-group"));
const SpeedTestCommandGroup = lazy(() => import("@/modules/speed-test/components/speed-test-command-group"));
const TranslationCommandGroup = lazy(() => import("@/modules/translation/components/translation-command-group"));
const SpotifyCommandGroup = lazy(() => import("@/modules/spotify/components/spotify-command-group"));
const ExtensionsCommandGroup = lazy(() => import("@/modules/extensions/components/extensions-command-group"));
const WindowSwitcherCommandGroup = lazy(() =>
  import("@/modules/window-switcher/components/window-switcher-command-group")
);
const ScriptCommandsCommandGroup = lazy(() =>
  import("@/modules/script-commands/components/script-commands-command-group")
);
const HyprWhsprView = lazy(() =>
  import("@/modules/hyprwhspr/components/hyprwhspr-view").then((mod) => ({
    default: mod.HyprWhsprView,
  }))
);
const ExtensionRunnerView = lazy(() =>
  import("@/modules/extensions/components/extension-runner-view").then((mod) => ({
    default: mod.ExtensionRunnerView,
  }))
);

type TakeoverPanel = (typeof TAKEOVER_COMMAND_PANELS)[number];

function isTakeoverPanel(panel: CommandPanel): panel is TakeoverPanel {
  return (TAKEOVER_COMMAND_PANELS as readonly string[]).includes(panel);
}

interface TakeoverPanelRendererInput {
  fileSearchQuery: string;
  dictionaryQuery: string;
  translationQuery: string;
  spotifyQuery: string;
  quicklinksView: QuicklinksView;
  setQuicklinksView: (view: QuicklinksView) => void;
  openFileSearch: (query: string) => void;
  openDictionary: (query: string) => void;
  openTranslation: (query: string) => void;
  openSpotify: (query: string) => void;
  openQuicklinks: () => void;
  openSpeedTest: () => void;
  openClipboard: () => void;
  openTodo: () => void;
  openExtensions: () => void;
  openScriptCommands: () => void;
  backToCommands: () => void;
}

interface LauncherTakeoverPanelProps extends TakeoverPanelRendererInput {
  activePanel: CommandPanel;
}

function TakeoverPanelFallback() {
  return (
    <LauncherTakeoverSurface>
      <CommandLoadingState label="Loading..." className="text-xs" />
    </LauncherTakeoverSurface>
  );
}

export function LauncherTakeoverPanel({
  activePanel,
  fileSearchQuery,
  dictionaryQuery,
  translationQuery,
  spotifyQuery,
  quicklinksView,
  setQuicklinksView,
  openFileSearch,
  openDictionary,
  openTranslation,
  openSpotify,
  openQuicklinks,
  openSpeedTest,
  openClipboard,
  openTodo,
  openExtensions,
  openScriptCommands,
  backToCommands,
}: LauncherTakeoverPanelProps) {
  if (!isTakeoverPanel(activePanel)) {
    return null;
  }

  let content: ReactNode = null;

  if (activePanel === COMMAND_PANELS.TODO) {
    content = (
      <TodoCommandGroup
        isOpen
        onOpen={openTodo}
        onBack={backToCommands}
      />
    );
  } else if (activePanel === COMMAND_PANELS.FILE_SEARCH) {
    content = (
      <FileSearchCommandGroup
        isOpen
        query={fileSearchQuery}
        onOpen={openFileSearch}
        onBack={backToCommands}
      />
    );
  } else if (activePanel === COMMAND_PANELS.DICTIONARY) {
    content = (
      <DictionaryCommandGroup
        isOpen
        query={dictionaryQuery}
        onOpen={openDictionary}
        onBack={backToCommands}
      />
    );
  } else if (activePanel === COMMAND_PANELS.TRANSLATION) {
    content = (
      <TranslationCommandGroup
        isOpen
        query={translationQuery}
        onOpen={openTranslation}
        onBack={backToCommands}
      />
    );
  } else if (activePanel === COMMAND_PANELS.SPOTIFY) {
    content = (
      <SpotifyCommandGroup
        isOpen
        query={spotifyQuery}
        onOpen={openSpotify}
        onBack={backToCommands}
      />
    );
  } else if (activePanel === COMMAND_PANELS.QUICKLINKS) {
    content = (
      <QuicklinksCommandGroup
        isOpen
        view={quicklinksView}
        setView={setQuicklinksView}
        onOpen={openQuicklinks}
        onBack={backToCommands}
      />
    );
  } else if (activePanel === COMMAND_PANELS.SPEED_TEST) {
    content = (
      <SpeedTestCommandGroup
        isOpen
        onOpen={openSpeedTest}
        onBack={backToCommands}
      />
    );
  } else if (activePanel === COMMAND_PANELS.CLIPBOARD) {
    content = (
      <ClipboardCommandGroup
        isOpen
        onOpen={openClipboard}
        onBack={backToCommands}
      />
    );
  } else if (activePanel === COMMAND_PANELS.EXTENSIONS) {
    content = (
      <ExtensionsCommandGroup
        isOpen
        onOpen={openExtensions}
        onBack={backToCommands}
      />
    );
  } else if (activePanel === COMMAND_PANELS.WINDOW_SWITCHER) {
    content = (
      <WindowSwitcherCommandGroup
        isOpen
        onBack={backToCommands}
      />
    );
  } else if (activePanel === COMMAND_PANELS.SCRIPT_COMMANDS) {
    content = (
      <ScriptCommandsCommandGroup
        isOpen
        onOpen={openScriptCommands}
        onBack={backToCommands}
      />
    );
  } else if (activePanel === COMMAND_PANELS.HYPRWHSPR) {
    content = (
      <LauncherTakeoverSurface>
        <HyprWhsprView onBack={backToCommands} />
      </LauncherTakeoverSurface>
    );
  } else if (activePanel === COMMAND_PANELS.EXTENSION_RUNNER) {
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
