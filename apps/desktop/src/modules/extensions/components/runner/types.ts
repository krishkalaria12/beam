export interface KeyboardShortcutDefinition {
  key: string;
  modifiers: Array<"cmd" | "ctrl" | "opt" | "shift">;
}

export type FormValue = string | boolean | number | null | string[];

interface ExtensionActionBase {
  key: string;
  nodeId: number;
  type: string;
  title: string;
  icon?: unknown;
  shortcut?: string;
  shortcutDefinition?: KeyboardShortcutDefinition;
  style?: string;
  autoFocus: boolean;
  props: Record<string, unknown>;
}

export interface ExtensionAction extends ExtensionActionBase {
  kind: "action";
  hasOnAction: boolean;
  hasOnSubmit: boolean;
}

export interface ExtensionActionSubmenu extends ExtensionActionBase {
  kind: "submenu";
  hasOnOpen: boolean;
  page: ExtensionActionPanelPage;
}

export type ExtensionActionNode = ExtensionAction | ExtensionActionSubmenu;

export interface ExtensionActionSection {
  key: string;
  title?: string;
  items: ExtensionActionNode[];
}

export interface ExtensionActionPanelPage {
  key: string;
  title?: string;
  sections: ExtensionActionSection[];
}

export type FlattenedAction = ExtensionAction;

export function emptyExtensionActionPanelPage(key = "panel:empty"): ExtensionActionPanelPage {
  return {
    key,
    sections: [],
  };
}

export function getExtensionActionPageItems(page: ExtensionActionPanelPage): ExtensionActionNode[] {
  return page.sections.flatMap((section) => section.items);
}

export function getPrimaryExtensionAction(
  page: ExtensionActionPanelPage,
): ExtensionAction | undefined {
  return getExtensionActionPageItems(page).find(
    (item): item is ExtensionAction => item.kind === "action",
  );
}

export function getTopLevelExtensionShortcutActions(
  page: ExtensionActionPanelPage,
): ExtensionAction[] {
  return getExtensionActionPageItems(page).filter(
    (item): item is ExtensionAction => item.kind === "action" && !!item.shortcutDefinition,
  );
}

export function getExtensionActionPageItemCount(page: ExtensionActionPanelPage): number {
  return getExtensionActionPageItems(page).length;
}

export function getExtensionActionPageDefaultItemIndex(page: ExtensionActionPanelPage): number {
  const items = getExtensionActionPageItems(page);
  if (items.length === 0) {
    return -1;
  }

  const autoFocusIndex = items.findIndex((item) => item.autoFocus);
  return autoFocusIndex >= 0 ? autoFocusIndex : 0;
}

export interface ListEntry {
  nodeId: number;
  sectionTitle?: string;
  sectionNodeId?: number;
  title: string;
  subtitle?: string;
  keywords: string;
  itemId: string;
  actionsNodeId?: number;
  detailNodeId?: number;
  hasOnAction: boolean;
  gridColumns?: number;
  gridAspectRatio?: string;
  gridFit?: string;
  gridInset?: string;
}

export interface FormField {
  nodeId: number;
  key: string;
  type: string;
  title: string;
  placeholder?: string;
  options: Array<{ value: string; title: string; icon?: unknown }>;
  optionSections?: Array<{
    title?: string;
    items: Array<{ value: string; title: string; icon?: unknown }>;
  }>;
  defaultValue: FormValue;
  controlledValue?: FormValue;
  hasOnChange: boolean;
  hasOnBlur: boolean;
  error?: string;
  info?: string;
}
