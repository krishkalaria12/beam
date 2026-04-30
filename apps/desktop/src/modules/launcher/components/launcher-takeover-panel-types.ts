import type { CommandPanel } from "@/command-registry/types";
import type { TakeoverCommandPanel } from "@/command-registry/panels";
import type { RetainedTakeoverPanel } from "@/modules/launcher/lib/takeover-panel-retention";
import type { QuicklinksView } from "@/store/use-launcher-ui-store";

export interface TakeoverPanelRendererInput {
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
  openFocus: () => void;
  openClipboard: () => void;
  openAi: () => void;
  openTodo: () => void;
  openNotes: () => void;
  openSnippets: () => void;
  openExtensions: () => void;
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

export interface LauncherTakeoverPanelProps extends TakeoverPanelRendererInput {
  activePanel: CommandPanel;
}

export interface LauncherTakeoverPanelContentProps extends TakeoverPanelRendererInput {
  activePanel: TakeoverCommandPanel;
}

export type CommandGroupProps = {
  isOpen: boolean;
  onOpen: () => void;
  onBack: () => void;
};

export type QueryCommandGroupProps = {
  isOpen: boolean;
  onBack: () => void;
  onOpen: (query: string) => void;
  query: string;
};

export type QuicklinksCommandGroupProps = CommandGroupProps & {
  view: QuicklinksView;
  setView: (view: QuicklinksView) => void;
};

export type ClipboardCommandGroupProps = CommandGroupProps & {
  isActive?: boolean;
  onToggleActions: () => void;
};

export type WindowSwitcherCommandGroupProps = {
  isOpen: boolean;
  onBack: () => void;
};

export type HyprWhsprViewProps = {
  onBack: () => void;
};

export type ExtensionRunnerViewProps = {
  onBack: () => void;
  onOpenExtensions: () => void;
};

export interface SettingsTakeoverViewProps {
  onBack: () => void;
  pinnedCommandIds: readonly string[];
  hiddenCommandIds: ReadonlySet<string>;
  aliasesById: Record<string, string[]>;
  onSetPinned: (commandId: string, pinned: boolean) => void;
  onSetHidden: (commandId: string, hidden: boolean) => void;
  onSetAliases: (commandId: string, aliases: readonly string[]) => void;
  onMovePinned: (commandId: string, direction: "up" | "down") => void;
}

export interface RenderTakeoverPanelsInput extends TakeoverPanelRendererInput {
  activePanel: TakeoverCommandPanel;
  panel: TakeoverCommandPanel;
  retainedPanels: readonly RetainedTakeoverPanel[];
  onToggleActions: () => void;
}
