import type React from "react";

export interface LauncherActionItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  keywords?: string[];
  shortcut?: React.ReactNode;
  disabled?: boolean;
  nextPageId?: "hotkey" | "alias";
  closeOnSelect?: boolean;
  onSelect?: () => void;
}

export interface LauncherActionsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  containerClassName?: string;
  anchorMode?: "self" | "panel-footer";
  rootTitle?: string;
  rootSearchPlaceholder?: string;
  rootItems?: LauncherActionItem[];
  defaultRootItemsMode?: "replace" | "append";
  targetCommandId?: string;
  targetCommandTitle?: string;
}

export type ActionPageId = "root" | "hotkey" | "alias";

export interface ActionPage {
  id: ActionPageId;
  title: string;
  subtitle?: string;
  searchPlaceholder: string;
  items: LauncherActionItem[];
}

export type FeedbackTone = "neutral" | "success" | "error";

export interface SaveFeedback {
  tone: FeedbackTone;
  text: string;
}
