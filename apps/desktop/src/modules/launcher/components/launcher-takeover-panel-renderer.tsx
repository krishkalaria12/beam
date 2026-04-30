import type { ComponentType, ReactNode } from "react";

import { COMMAND_PANELS } from "@/command-registry/panels";
import { LauncherTakeoverSurface } from "@/modules/launcher/components/launcher-takeover-surface";
import { getLoadedTakeoverPanel } from "@/modules/launcher/lib/takeover-panel-loader";
import { isRetainedTakeoverPanel } from "@/modules/launcher/lib/takeover-panel-retention";

import type {
  ClipboardCommandGroupProps,
  CommandGroupProps,
  ExtensionRunnerViewProps,
  HyprWhsprViewProps,
  QueryCommandGroupProps,
  QuicklinksCommandGroupProps,
  RenderTakeoverPanelsInput,
  SettingsTakeoverViewProps,
  WindowSwitcherCommandGroupProps,
} from "@/modules/launcher/components/launcher-takeover-panel-types";

export function renderTakeoverPanels(input: RenderTakeoverPanelsInput): ReactNode {
  if (!input.retainedPanels.some((panel) => panel !== input.activePanel)) {
    return renderTakeoverPanel(input);
  }

  return (
    <>
      {input.retainedPanels.map((panel) => {
        const panelContent = renderTakeoverPanel({ ...input, panel });
        const isActive = panel === input.activePanel;

        return (
          <div
            key={panel}
            className={isActive ? "h-full min-h-0" : "hidden h-full min-h-0"}
            aria-hidden={isActive ? undefined : true}
          >
            {panelContent}
          </div>
        );
      })}
      {isRetainedTakeoverPanel(input.activePanel) ? null : (
        <div className="h-full min-h-0">{renderTakeoverPanel(input)}</div>
      )}
    </>
  );
}

function renderTakeoverPanel(input: RenderTakeoverPanelsInput): ReactNode {
  switch (input.panel) {
    case COMMAND_PANELS.SETTINGS: {
      const SettingsTakeoverView = getLoadedTakeoverPanel(
        input.panel,
      ) as ComponentType<SettingsTakeoverViewProps> | null;
      return SettingsTakeoverView ? (
        <SettingsTakeoverView
          onBack={input.backToCommands}
          pinnedCommandIds={input.pinnedCommandIds}
          hiddenCommandIds={input.hiddenCommandIds}
          aliasesById={input.aliasesById}
          onSetPinned={input.onSetPinned}
          onSetHidden={input.onSetHidden}
          onSetAliases={input.onSetAliases}
          onMovePinned={input.onMovePinned}
        />
      ) : null;
    }
    case COMMAND_PANELS.TODO: {
      const TodoCommandGroup = getLoadedTakeoverPanel(
        input.panel,
      ) as ComponentType<CommandGroupProps> | null;
      return TodoCommandGroup ? (
        <TodoCommandGroup isOpen onOpen={input.openTodo} onBack={input.backToCommands} />
      ) : null;
    }
    case COMMAND_PANELS.NOTES: {
      const NotesCommandGroup = getLoadedTakeoverPanel(
        input.panel,
      ) as ComponentType<CommandGroupProps> | null;
      return NotesCommandGroup ? (
        <NotesCommandGroup isOpen onOpen={input.openNotes} onBack={input.backToCommands} />
      ) : null;
    }
    case COMMAND_PANELS.AI: {
      const AiCommandGroup = getLoadedTakeoverPanel(
        input.panel,
      ) as ComponentType<CommandGroupProps> | null;
      return AiCommandGroup ? (
        <AiCommandGroup isOpen onOpen={input.openAi} onBack={input.backToCommands} />
      ) : null;
    }
    case COMMAND_PANELS.SNIPPETS: {
      const SnippetsCommandGroup = getLoadedTakeoverPanel(
        input.panel,
      ) as ComponentType<CommandGroupProps> | null;
      return SnippetsCommandGroup ? (
        <SnippetsCommandGroup isOpen onOpen={input.openSnippets} onBack={input.backToCommands} />
      ) : null;
    }
    case COMMAND_PANELS.FILE_SEARCH: {
      const FileSearchCommandGroup = getLoadedTakeoverPanel(
        input.panel,
      ) as ComponentType<QueryCommandGroupProps> | null;
      return FileSearchCommandGroup ? (
        <FileSearchCommandGroup
          isOpen
          query={input.fileSearchQuery}
          onOpen={input.openFileSearch}
          onBack={input.backToCommands}
        />
      ) : null;
    }
    case COMMAND_PANELS.DICTIONARY: {
      const DictionaryCommandGroup = getLoadedTakeoverPanel(
        input.panel,
      ) as ComponentType<QueryCommandGroupProps> | null;
      return DictionaryCommandGroup ? (
        <DictionaryCommandGroup
          isOpen
          query={input.dictionaryQuery}
          onOpen={input.openDictionary}
          onBack={input.backToCommands}
        />
      ) : null;
    }
    case COMMAND_PANELS.TRANSLATION: {
      const TranslationCommandGroup = getLoadedTakeoverPanel(
        input.panel,
      ) as ComponentType<QueryCommandGroupProps> | null;
      return TranslationCommandGroup ? (
        <TranslationCommandGroup
          isOpen
          query={input.translationQuery}
          onOpen={input.openTranslation}
          onBack={input.backToCommands}
        />
      ) : null;
    }
    case COMMAND_PANELS.QUICKLINKS: {
      const QuicklinksCommandGroup = getLoadedTakeoverPanel(
        input.panel,
      ) as ComponentType<QuicklinksCommandGroupProps> | null;
      return QuicklinksCommandGroup ? (
        <QuicklinksCommandGroup
          isOpen
          view={input.quicklinksView}
          setView={input.setQuicklinksView}
          onOpen={input.openQuicklinks}
          onBack={input.backToCommands}
        />
      ) : null;
    }
    case COMMAND_PANELS.SPEED_TEST: {
      const SpeedTestCommandGroup = getLoadedTakeoverPanel(
        input.panel,
      ) as ComponentType<CommandGroupProps> | null;
      return SpeedTestCommandGroup ? (
        <SpeedTestCommandGroup isOpen onOpen={input.openSpeedTest} onBack={input.backToCommands} />
      ) : null;
    }
    case COMMAND_PANELS.FOCUS: {
      const FocusCommandGroup = getLoadedTakeoverPanel(
        input.panel,
      ) as ComponentType<CommandGroupProps> | null;
      return FocusCommandGroup ? (
        <FocusCommandGroup isOpen onOpen={input.openFocus} onBack={input.backToCommands} />
      ) : null;
    }
    case COMMAND_PANELS.CLIPBOARD: {
      const ClipboardCommandGroup = getLoadedTakeoverPanel(
        input.panel,
      ) as ComponentType<ClipboardCommandGroupProps> | null;
      return ClipboardCommandGroup ? (
        <ClipboardCommandGroup
          isOpen
          isActive={input.panel === input.activePanel}
          onOpen={input.openClipboard}
          onBack={input.backToCommands}
          onToggleActions={input.onToggleActions}
        />
      ) : null;
    }
    case COMMAND_PANELS.EXTENSIONS: {
      const ExtensionsCommandGroup = getLoadedTakeoverPanel(
        input.panel,
      ) as ComponentType<CommandGroupProps> | null;
      return ExtensionsCommandGroup ? (
        <ExtensionsCommandGroup
          isOpen
          onOpen={input.openExtensions}
          onBack={input.backToCommands}
        />
      ) : null;
    }
    case COMMAND_PANELS.WINDOW_SWITCHER: {
      const WindowSwitcherCommandGroup = getLoadedTakeoverPanel(
        input.panel,
      ) as ComponentType<WindowSwitcherCommandGroupProps> | null;
      return WindowSwitcherCommandGroup ? (
        <WindowSwitcherCommandGroup isOpen onBack={input.backToCommands} />
      ) : null;
    }
    case COMMAND_PANELS.SCRIPT_COMMANDS: {
      const ScriptCommandsCommandGroup = getLoadedTakeoverPanel(
        input.panel,
      ) as ComponentType<CommandGroupProps> | null;
      return ScriptCommandsCommandGroup ? (
        <ScriptCommandsCommandGroup
          isOpen
          onOpen={input.openScriptCommands}
          onBack={input.backToCommands}
        />
      ) : null;
    }
    case COMMAND_PANELS.DMENU: {
      const DmenuCommandGroup = getLoadedTakeoverPanel(input.panel) as ComponentType | null;
      return DmenuCommandGroup ? (
        <LauncherTakeoverSurface>
          <DmenuCommandGroup />
        </LauncherTakeoverSurface>
      ) : null;
    }
    case COMMAND_PANELS.HYPRWHSPR: {
      const HyprWhsprView = getLoadedTakeoverPanel(
        input.panel,
      ) as ComponentType<HyprWhsprViewProps> | null;
      return HyprWhsprView ? (
        <LauncherTakeoverSurface>
          <HyprWhsprView onBack={input.backToCommands} />
        </LauncherTakeoverSurface>
      ) : null;
    }
    case COMMAND_PANELS.EXTENSION_RUNNER: {
      const ExtensionRunnerView = getLoadedTakeoverPanel(
        input.panel,
      ) as ComponentType<ExtensionRunnerViewProps> | null;
      return ExtensionRunnerView ? (
        <LauncherTakeoverSurface>
          <ExtensionRunnerView
            onBack={input.backToCommands}
            onOpenExtensions={input.openExtensions}
          />
        </LauncherTakeoverSurface>
      ) : null;
    }
  }
}
