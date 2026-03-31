import {
  ArrowLeft,
  CornerDownLeft,
  FilePlus2,
  List,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import { COMMAND_PANELS, type TakeoverCommandPanel } from "@/command-registry/panels";
import type { LauncherActionItem, LauncherActionSection } from "@/modules/launcher/types";
import type { QuicklinksView } from "@/store/use-launcher-ui-store";

interface ActionShortcutOptions {
  key: string;
  code?: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
}

interface BuildSharedTakeoverActionItemsInput {
  activePanel: TakeoverCommandPanel;
  quicklinksView: QuicklinksView;
  primaryActionLabel: string;
  setQuicklinksView: (view: QuicklinksView) => void;
  openQuicklinks: () => void;
  backToCommands: () => void;
  handlePrimaryActionSelect: () => void;
  dispatchShortcut: (options: ActionShortcutOptions) => void;
  clipboardActionItems: readonly LauncherActionItem[];
  extensionActionItems: readonly LauncherActionItem[];
  extensionRunnerActionSections: readonly LauncherActionSection[];
  fileSearchActionItems: readonly LauncherActionItem[];
  quicklinksActionItems: readonly LauncherActionItem[];
  scriptCommandActionItems: readonly LauncherActionItem[];
}

function createSection(id: string, items: readonly LauncherActionItem[], title?: string) {
  return items.length > 0 ? [{ id, title, items: [...items] }] : [];
}

function getPrimaryShortcutLabel(panel: TakeoverCommandPanel): string {
  if (panel === COMMAND_PANELS.TRANSLATION) {
    return "Ctrl+↩";
  }

  return "↩";
}

export function buildSharedTakeoverActionItems({
  activePanel,
  quicklinksView,
  primaryActionLabel,
  setQuicklinksView,
  openQuicklinks,
  backToCommands,
  handlePrimaryActionSelect,
  dispatchShortcut,
  clipboardActionItems,
  extensionActionItems,
  extensionRunnerActionSections,
  fileSearchActionItems,
  quicklinksActionItems,
  scriptCommandActionItems,
}: BuildSharedTakeoverActionItemsInput): LauncherActionSection[] {
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

  if (activePanel === COMMAND_PANELS.CLIPBOARD) {
    panelSpecificRootItems.unshift(...clipboardActionItems);
  }

  if (activePanel === COMMAND_PANELS.FILE_SEARCH) {
    panelSpecificRootItems.unshift(...fileSearchActionItems);
  }

  if (activePanel === COMMAND_PANELS.EXTENSIONS) {
    panelSpecificRootItems.unshift(...extensionActionItems);
  }

  if (activePanel === COMMAND_PANELS.QUICKLINKS && quicklinksView === "manage") {
    panelSpecificRootItems.push(...quicklinksActionItems);
  }

  if (activePanel === COMMAND_PANELS.SCRIPT_COMMANDS) {
    panelSpecificRootItems.unshift(...scriptCommandActionItems);
  }

  const shellItems: LauncherActionItem[] = [
    {
      id: `${activePanel}-primary-action`,
      label: primaryActionLabel,
      icon: <CornerDownLeft className="size-4" />,
      shortcut: getPrimaryShortcutLabel(activePanel),
      keywords: ["primary", "default", "action", "enter", activePanel],
      onSelect: handlePrimaryActionSelect,
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
  ];

  if (activePanel === COMMAND_PANELS.EXTENSION_RUNNER) {
    return [...createSection(`${activePanel}-shell`, shellItems), ...extensionRunnerActionSections];
  }

  return createSection(`${activePanel}-root`, shellItems);
}
