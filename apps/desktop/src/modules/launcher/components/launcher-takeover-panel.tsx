import {
  ArrowLeft,
  AtSign,
  CornerDownLeft,
  FilePlus2,
  Keyboard,
  List,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { lazy, Suspense, useRef, useState, type ReactNode } from "react";

import { COMMAND_PANELS, TAKEOVER_COMMAND_PANELS } from "@/command-registry/panels";
import {
  getPanelCommandRegistration,
  getPanelPrimaryActionLabel,
} from "@/command-registry/panel-actions-registry";
import type { CommandPanel } from "@/command-registry/types";
import { CommandLoadingState } from "@/components/command/command-loading-state";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { isLauncherActionsHotkey, listenLauncherActionsToggle } from "@/lib/launcher-actions";
import type { LauncherActionItem } from "@/modules/launcher/components/launcher-actions-panel";
import { LauncherActionsPanel } from "@/modules/launcher/components/launcher-actions-panel";
import { LauncherTakeoverSurface } from "@/modules/launcher/components/launcher-takeover-surface";
import { dispatchKeyboardShortcutToTarget, dispatchEnterToTarget } from "@/modules/launcher/helper";

import type { QuicklinksView } from "@/store/use-launcher-ui-store";

const ClipboardCommandGroup = lazy(
  () => import("@/modules/clipboard/components/clipboard-command-group"),
);
const AiCommandGroup = lazy(() => import("@/modules/ai/components/ai-command-group"));
const TodoCommandGroup = lazy(() => import("@/modules/todo/components/todo-command-group"));
const NotesCommandGroup = lazy(() => import("@/modules/notes/components/notes-command-group"));
const SnippetsCommandGroup = lazy(
  () => import("@/modules/snippets/components/snippets-command-group"),
);
const DictionaryCommandGroup = lazy(
  () => import("@/modules/dictionary/components/dictionary-command-group"),
);
const FileSearchCommandGroup = lazy(
  () => import("@/modules/file-search/components/file-search-command-group"),
);
const QuicklinksCommandGroup = lazy(
  () => import("@/modules/quicklinks/components/quicklinks-command-group"),
);
const SpeedTestCommandGroup = lazy(
  () => import("@/modules/speed-test/components/speed-test-command-group"),
);
const TranslationCommandGroup = lazy(
  () => import("@/modules/translation/components/translation-command-group"),
);
const SpotifyCommandGroup = lazy(
  () => import("@/modules/integrations/spotify/components/spotify-command-group"),
);
const GithubCommandGroup = lazy(
  () => import("@/modules/integrations/github/components/github-command-group"),
);
const ExtensionsCommandGroup = lazy(
  () => import("@/modules/extensions/components/extensions-command-group"),
);
const WindowSwitcherCommandGroup = lazy(
  () => import("@/modules/window-switcher/components/window-switcher-command-group"),
);
const ScriptCommandsCommandGroup = lazy(
  () => import("@/modules/script-commands/components/script-commands-command-group"),
);
const DmenuCommandGroup = lazy(() => import("@/modules/dmenu/components/dmenu-command-group"));
const HyprWhsprView = lazy(() =>
  import("@/modules/hyprwhspr/components/hyprwhspr-view").then((mod) => ({
    default: mod.HyprWhsprView,
  })),
);
const ExtensionRunnerView = lazy(() =>
  import("@/modules/extensions/components/extension-runner-view").then((mod) => ({
    default: mod.ExtensionRunnerView,
  })),
);
const SettingsTakeoverView = lazy(() =>
  import("@/modules/settings/takeover/components/settings-takeover-view").then((mod) => ({
    default: mod.SettingsTakeoverView,
  })),
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
  githubQuery: string;
  quicklinksView: QuicklinksView;
  setQuicklinksView: (view: QuicklinksView) => void;
  openFileSearch: (query: string) => void;
  openDictionary: (query: string) => void;
  openTranslation: (query: string) => void;
  openSpotify: (query: string) => void;
  openGithub: (query: string) => void;
  openQuicklinks: () => void;
  openSpeedTest: () => void;
  openClipboard: () => void;
  openAi: () => void;
  openTodo: () => void;
  openNotes: () => void;
  openSnippets: () => void;
  openExtensions: () => void;
  openSettings: () => void;
  openScriptCommands: () => void;
  pinnedCommandIds: readonly string[];
  hiddenCommandIds: ReadonlySet<string>;
  aliasesById: Record<string, string[]>;
  onSetPinned: (commandId: string, pinned: boolean) => void;
  onSetHidden: (commandId: string, hidden: boolean) => void;
  onSetAliases: (commandId: string, aliases: readonly string[]) => void;
  onMovePinned: (commandId: string, direction: "up" | "down") => void;
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

function getPrimaryShortcutLabel(panel: CommandPanel): string {
  if (panel === COMMAND_PANELS.TRANSLATION) {
    return "Ctrl+↩";
  }

  return "↩";
}

export function LauncherTakeoverPanel(props: LauncherTakeoverPanelProps) {
  const { activePanel } = props;
  if (!isTakeoverPanel(activePanel)) {
    return null;
  }

  return <LauncherTakeoverPanelContent key={activePanel} {...props} />;
}

function LauncherTakeoverPanelContent({
  activePanel,
  fileSearchQuery,
  dictionaryQuery,
  translationQuery,
  spotifyQuery,
  githubQuery,
  quicklinksView,
  setQuicklinksView,
  openFileSearch,
  openDictionary,
  openTranslation,
  openSpotify,
  openGithub,
  openQuicklinks,
  openSpeedTest,
  openClipboard,
  openAi,
  openTodo,
  openNotes,
  openSnippets,
  openExtensions,
  openSettings,
  openScriptCommands,
  pinnedCommandIds,
  hiddenCommandIds,
  aliasesById,
  onSetPinned,
  onSetHidden,
  onSetAliases,
  onMovePinned,
  backToCommands,
}: LauncherTakeoverPanelProps) {
  const takeoverPanelIsOpen = isTakeoverPanel(activePanel);
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsPreviousFocusRef = useRef<HTMLElement | null>(null);
  const actionsOpenRef = useRef(actionsOpen);
  const shouldUseSharedActionsRef = useRef(false);
  const handleActionsOpenChangeRef = useRef<(nextOpen: boolean) => void>(() => {});
  const shouldUseSharedActions =
    takeoverPanelIsOpen &&
    activePanel !== COMMAND_PANELS.DMENU &&
    activePanel !== COMMAND_PANELS.SETTINGS;
  const panelRegistration = getPanelCommandRegistration(activePanel, quicklinksView);
  const primaryActionLabel = getPanelPrimaryActionLabel(activePanel);
  actionsOpenRef.current = actionsOpen;
  shouldUseSharedActionsRef.current = shouldUseSharedActions;

  function handleActionsOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      const currentActiveElement = document.activeElement;
      actionsPreviousFocusRef.current =
        currentActiveElement instanceof HTMLElement ? currentActiveElement : null;
      setActionsOpen(true);
      return;
    }

    setActionsOpen(false);
    window.requestAnimationFrame(() => {
      const previousFocusElement = actionsPreviousFocusRef.current;
      if (previousFocusElement && previousFocusElement.isConnected) {
        previousFocusElement.focus({ preventScroll: true });
      }
    });
  }

  handleActionsOpenChangeRef.current = handleActionsOpenChange;

  useMountEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!shouldUseSharedActionsRef.current || !isLauncherActionsHotkey(event)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      handleActionsOpenChangeRef.current(!actionsOpenRef.current);
    };

    window.addEventListener("keydown", onKeyDown, true);
    const unsubscribeToggle = listenLauncherActionsToggle(() => {
      if (!shouldUseSharedActionsRef.current) {
        return;
      }

      handleActionsOpenChangeRef.current(!actionsOpenRef.current);
    });

    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      unsubscribeToggle();
    };
  });

  function dispatchShortcut(options: {
    key: string;
    code?: string;
    metaKey?: boolean;
    ctrlKey?: boolean;
    altKey?: boolean;
    shiftKey?: boolean;
  }) {
    const previousFocusElement = actionsPreviousFocusRef.current;
    if (previousFocusElement && previousFocusElement.isConnected) {
      previousFocusElement.focus({ preventScroll: true });
      dispatchKeyboardShortcutToTarget(previousFocusElement, options);
      return;
    }

    const activeElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dispatchKeyboardShortcutToTarget(activeElement, options);
  }

  const panelSpecificRootItems: LauncherActionItem[] = [];
  if (activePanel === COMMAND_PANELS.TRANSLATION) {
    panelSpecificRootItems.push({
      id: "translation-translate-now",
      label: "Translate Now",
      icon: <Search className="size-4" />,
      shortcut: "Ctrl+↩",
      keywords: ["translate", "now", "submit", "translation"],
      onSelect: () => {
        dispatchShortcut({ key: "Enter", code: "Enter", ctrlKey: true });
      },
    });
  } else if (activePanel === COMMAND_PANELS.QUICKLINKS) {
    panelSpecificRootItems.push(
      {
        id: "quicklinks-create",
        label: "Create Quicklink",
        icon: <Plus className="size-4" />,
        keywords: ["quicklink", "create", "new"],
        onSelect: () => {
          setQuicklinksView("create");
          openQuicklinks();
        },
      },
      {
        id: "quicklinks-manage",
        label: "Manage Quicklinks",
        icon: <List className="size-4" />,
        keywords: ["quicklink", "manage", "list"],
        onSelect: () => {
          setQuicklinksView("manage");
          openQuicklinks();
        },
      },
    );
  } else if (activePanel === COMMAND_PANELS.SNIPPETS) {
    panelSpecificRootItems.push(
      {
        id: "snippets-new",
        label: "New Snippet",
        icon: <FilePlus2 className="size-4" />,
        shortcut: "Ctrl+N",
        keywords: ["snippet", "new", "create"],
        onSelect: () => {
          dispatchShortcut({ key: "n", code: "KeyN", ctrlKey: true });
        },
      },
      {
        id: "snippets-edit",
        label: "Edit Selected Snippet",
        icon: <Pencil className="size-4" />,
        shortcut: "Ctrl+E",
        keywords: ["snippet", "edit", "selected"],
        onSelect: () => {
          dispatchShortcut({ key: "e", code: "KeyE", ctrlKey: true });
        },
      },
    );
  } else if (activePanel === COMMAND_PANELS.SCRIPT_COMMANDS) {
    panelSpecificRootItems.push({
      id: "script-commands-new",
      label: "New Script",
      icon: <FilePlus2 className="size-4" />,
      shortcut: "Ctrl+N",
      keywords: ["script", "new", "create"],
      onSelect: () => {
        dispatchShortcut({ key: "n", code: "KeyN", ctrlKey: true });
      },
    });
  } else if (activePanel === COMMAND_PANELS.WINDOW_SWITCHER) {
    panelSpecificRootItems.push({
      id: "window-switcher-close-selected",
      label: "Close Selected Window",
      icon: <X className="size-4" />,
      shortcut: "Shift+↩",
      keywords: ["window", "close", "selected"],
      onSelect: () => {
        dispatchShortcut({ key: "Enter", code: "Enter", shiftKey: true });
      },
    });
  } else if (activePanel === COMMAND_PANELS.HYPRWHSPR) {
    panelSpecificRootItems.push(
      {
        id: "hyprwhspr-toggle-recording",
        label: "Toggle Recording",
        icon: <CornerDownLeft className="size-4" />,
        shortcut: "↩",
        keywords: ["hyprwhspr", "recording", "toggle"],
        onSelect: () => {
          dispatchShortcut({ key: "Enter", code: "Enter" });
        },
      },
      {
        id: "hyprwhspr-refresh-status",
        label: "Refresh Status",
        icon: <RefreshCw className="size-4" />,
        shortcut: "R",
        keywords: ["hyprwhspr", "refresh", "status"],
        onSelect: () => {
          dispatchShortcut({ key: "r", code: "KeyR" });
        },
      },
    );
  }

  const sharedRootItems: LauncherActionItem[] = shouldUseSharedActions
    ? [
        {
          id: `${activePanel}-primary-action`,
          label: primaryActionLabel,
          icon: <CornerDownLeft className="size-4" />,
          shortcut: getPrimaryShortcutLabel(activePanel),
          keywords: ["primary", "default", "action", "enter", activePanel],
          onSelect: () => {
            if (activePanel === COMMAND_PANELS.TRANSLATION) {
              dispatchShortcut({ key: "Enter", code: "Enter", ctrlKey: true });
            } else {
              const previousFocusElement = actionsPreviousFocusRef.current;
              if (previousFocusElement && previousFocusElement.isConnected) {
                previousFocusElement.focus({ preventScroll: true });
                dispatchEnterToTarget(previousFocusElement);
                return;
              }

              const activeElement =
                document.activeElement instanceof HTMLElement ? document.activeElement : null;
              dispatchEnterToTarget(activeElement);
            }
          },
        },
        ...panelSpecificRootItems,
        {
          id: `${activePanel}-back`,
          label: "Back",
          icon: <ArrowLeft className="size-4" />,
          shortcut: "Esc",
          keywords: ["back", "close", "exit", activePanel],
          onSelect: backToCommands,
        },
        {
          id: `${activePanel}-set-hotkey`,
          label: "Set Hotkey...",
          icon: <Keyboard className="size-4" />,
          keywords: ["shortcut", "keys", "binding", activePanel],
          nextPageId: "hotkey",
          closeOnSelect: false,
        },
        {
          id: `${activePanel}-set-alias`,
          label: "Set Alias...",
          icon: <AtSign className="size-4" />,
          keywords: ["alias", "keyword", "trigger", activePanel],
          nextPageId: "alias",
          closeOnSelect: false,
        },
      ]
    : [];

  let content: ReactNode = null;

  if (activePanel === COMMAND_PANELS.SETTINGS) {
    content = (
      <SettingsTakeoverView
        onBack={backToCommands}
        pinnedCommandIds={pinnedCommandIds}
        hiddenCommandIds={hiddenCommandIds}
        aliasesById={aliasesById}
        onSetPinned={onSetPinned}
        onSetHidden={onSetHidden}
        onSetAliases={onSetAliases}
        onMovePinned={onMovePinned}
      />
    );
  } else if (activePanel === COMMAND_PANELS.TODO) {
    content = <TodoCommandGroup isOpen onOpen={openTodo} onBack={backToCommands} />;
  } else if (activePanel === COMMAND_PANELS.NOTES) {
    content = <NotesCommandGroup isOpen onOpen={openNotes} onBack={backToCommands} />;
  } else if (activePanel === COMMAND_PANELS.AI) {
    content = <AiCommandGroup isOpen onOpen={openAi} onBack={backToCommands} />;
  } else if (activePanel === COMMAND_PANELS.SNIPPETS) {
    content = <SnippetsCommandGroup isOpen onOpen={openSnippets} onBack={backToCommands} />;
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
  } else if (activePanel === COMMAND_PANELS.GITHUB) {
    content = (
      <GithubCommandGroup isOpen query={githubQuery} onOpen={openGithub} onBack={backToCommands} />
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
    content = <SpeedTestCommandGroup isOpen onOpen={openSpeedTest} onBack={backToCommands} />;
  } else if (activePanel === COMMAND_PANELS.CLIPBOARD) {
    content = (
      <ClipboardCommandGroup
        isOpen
        onOpen={openClipboard}
        onBack={backToCommands}
        onToggleActions={() => {
          handleActionsOpenChange(!actionsOpen);
        }}
      />
    );
  } else if (activePanel === COMMAND_PANELS.EXTENSIONS) {
    content = <ExtensionsCommandGroup isOpen onOpen={openExtensions} onBack={backToCommands} />;
  } else if (activePanel === COMMAND_PANELS.WINDOW_SWITCHER) {
    content = <WindowSwitcherCommandGroup isOpen onBack={backToCommands} />;
  } else if (activePanel === COMMAND_PANELS.SCRIPT_COMMANDS) {
    content = (
      <ScriptCommandsCommandGroup isOpen onOpen={openScriptCommands} onBack={backToCommands} />
    );
  } else if (activePanel === COMMAND_PANELS.DMENU) {
    content = (
      <LauncherTakeoverSurface>
        <DmenuCommandGroup />
      </LauncherTakeoverSurface>
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
        <ExtensionRunnerView onBack={backToCommands} onOpenExtensions={openExtensions} />
      </LauncherTakeoverSurface>
    );
  }
  return (
    <div className="relative h-full w-full">
      <Suspense fallback={<TakeoverPanelFallback />}>{content}</Suspense>
      {shouldUseSharedActions ? (
        <LauncherActionsPanel
          open={actionsOpen}
          onOpenChange={handleActionsOpenChange}
          rootTitle={`${panelRegistration?.title ?? "Module"} Actions...`}
          rootSearchPlaceholder="Search for actions..."
          rootItems={sharedRootItems}
          targetCommandId={panelRegistration?.id}
          targetCommandTitle={panelRegistration?.title}
          containerClassName="bottom-14 right-4"
        />
      ) : null}
    </div>
  );
}
