export interface GeneralTabProps {
  pinnedCommandIds: readonly string[];
  hiddenCommandIds: ReadonlySet<string>;
  onSetPinned: (commandId: string, pinned: boolean) => void;
  onSetHidden: (commandId: string, hidden: boolean) => void;
  onMovePinned: (commandId: string, direction: "up" | "down") => void;
}

export type CommandItemsFilter = "all" | "enabled" | "disabled";

export interface CommandItemsEntry {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  keywords: readonly string[];
  groupLabel: string;
}
