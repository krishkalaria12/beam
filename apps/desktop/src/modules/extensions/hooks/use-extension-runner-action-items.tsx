import { create } from "zustand";

import { RunnerIcon } from "@/modules/extensions/components/runner/nodes/shared/runner-icon";
import type {
  ExtensionAction,
  ExtensionActionNode,
  ExtensionActionPanelPage,
  ExtensionActionSection,
  ExtensionActionSubmenu,
} from "@/modules/extensions/components/runner/types";
import type {
  LauncherActionCustomPage,
  LauncherActionItem,
  LauncherActionSection,
} from "@/modules/launcher/types";

interface ExtensionRunnerActionsState {
  sections: LauncherActionSection[];
}

interface SyncExtensionRunnerActionItemsInput {
  page: ExtensionActionPanelPage;
  onExecuteAction: (action: ExtensionAction) => void;
  onOpenSubmenu: (submenu: ExtensionActionSubmenu) => void;
}

const useExtensionRunnerActionsStore = create<ExtensionRunnerActionsState>(() => ({
  sections: [],
}));

function readStringProp(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function canExecuteAction(item: ExtensionAction): boolean {
  if (item.hasOnAction || item.hasOnSubmit) {
    return true;
  }

  if (item.type === "Action.OpenInBrowser") {
    return readStringProp(item.props.url) !== "" || readStringProp(item.props.target) !== "";
  }

  if (item.type === "Action.Open") {
    return readStringProp(item.props.target) !== "" || readStringProp(item.props.url) !== "";
  }

  if (item.type === "Action.ShowInFinder") {
    return readStringProp(item.props.path) !== "" || readStringProp(item.props.target) !== "";
  }

  if (item.type === "Action.CopyToClipboard" || item.type === "Action.Paste") {
    return "content" in item.props;
  }

  return false;
}

function createIcon(icon: unknown) {
  return icon ? <RunnerIcon icon={icon} className="size-4" /> : <span className="size-4" />;
}

function mapExtensionActionItem(
  item: ExtensionActionNode,
  section: ExtensionActionSection,
  onExecuteAction: (action: ExtensionAction) => void,
  onOpenSubmenu: (submenu: ExtensionActionSubmenu) => void,
): LauncherActionItem {
  return {
    id: `extension-runner:${item.key}`,
    label: item.title,
    icon: createIcon(item.icon),
    shortcut: item.shortcut,
    disabled: item.kind === "action" ? !canExecuteAction(item) : false,
    keywords: [section.title, item.shortcut, item.kind, item.type].filter(
      (entry): entry is string => Boolean(entry && entry.trim().length > 0),
    ),
    childPage:
      item.kind === "submenu"
        ? mapExtensionActionPage(item.page, onExecuteAction, onOpenSubmenu)
        : undefined,
    onNavigate: item.kind === "submenu" ? () => onOpenSubmenu(item) : undefined,
    onSelect: item.kind === "action" ? () => onExecuteAction(item) : undefined,
  };
}

function mapExtensionActionPage(
  page: ExtensionActionPanelPage,
  onExecuteAction: (action: ExtensionAction) => void,
  onOpenSubmenu: (submenu: ExtensionActionSubmenu) => void,
): LauncherActionCustomPage {
  return {
    id: `extension-runner-page:${page.key}`,
    title: page.title,
    searchPlaceholder: page.title ? `Search ${page.title.toLowerCase()}...` : "Search actions...",
    sections: page.sections.map((section) => ({
      id: `extension-runner-section:${page.key}:${section.key}`,
      title: section.title || undefined,
      items: section.items.map((item) =>
        mapExtensionActionItem(item, section, onExecuteAction, onOpenSubmenu),
      ),
    })),
  };
}

export function syncExtensionRunnerActionItemsState(
  input: SyncExtensionRunnerActionItemsInput,
): void {
  const nextPage = mapExtensionActionPage(input.page, input.onExecuteAction, input.onOpenSubmenu);
  useExtensionRunnerActionsStore.setState({
    sections: nextPage.sections,
  });
}

export function clearExtensionRunnerActionItemsState(): void {
  useExtensionRunnerActionsStore.setState({ sections: [] });
}

export function useExtensionRunnerActionSections(): LauncherActionSection[] {
  return useExtensionRunnerActionsStore((state) => state.sections);
}
