import type { ElementType, ReactNode } from "react";

export type SettingsView =
  | "main"
  | "style"
  | "layout"
  | "pinned"
  | "hotkeys"
  | "trigger-symbols"
  | "command-items";

export interface SettingsMenuItem {
  id: SettingsView;
  icon: ElementType;
  title: string;
  description: string;
  iconVariant: "neutral" | "primary" | "orange" | "cyan" | "purple" | "red" | "green";
}

export interface SettingsCommandGroupProps {
  isOpen: boolean;
  onOpen: () => void;
  onBack: () => void;
  pinnedCommandIds: readonly string[];
  hiddenCommandIds: ReadonlySet<string>;
  onSetPinned: (commandId: string, pinned: boolean) => void;
  onSetHidden: (commandId: string, hidden: boolean) => void;
  onMovePinned: (commandId: string, direction: "up" | "down") => void;
  fallbackEnabled?: boolean;
  fallbackCommandIds?: readonly string[];
  onSetFallbackEnabled?: (enabled: boolean) => void;
  onSetFallbackCommandIds?: (fallbackCommandIds: readonly string[]) => void;
}

export interface SettingsMenuProps {
  setView: (view: SettingsView) => void;
}

export interface SettingsViewWrapperProps {
  view: SettingsView;
  onBack: () => void;
  onNavigateToMain: () => void;
  children: ReactNode;
}

export interface CommandItemsSettingsProps {
  hiddenCommandIds: ReadonlySet<string>;
  onSetHidden: (commandId: string, hidden: boolean) => void;
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
