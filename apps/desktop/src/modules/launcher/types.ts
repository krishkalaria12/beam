import type React from "react";

import type { LauncherManagedItem } from "@/modules/launcher/managed-items";

export type LauncherActionTarget =
  | {
      kind: "command";
      commandId: string;
      title?: string;
    }
  | {
      kind: "managed-item";
      item: LauncherManagedItem;
    };

export interface LauncherActionItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  keywords?: string[];
  shortcut?: React.ReactNode;
  disabled?: boolean;
  nextPageId?: "hotkey" | "alias";
  nextPageTarget?: LauncherActionTarget;
  childPage?: LauncherActionCustomPage;
  onNavigate?: () => void;
  closeOnSelect?: boolean;
  onSelect?: () => void;
}

export interface LauncherActionSection {
  id: string;
  title?: string;
  items: LauncherActionItem[];
}

export interface LauncherActionCustomPage {
  id: string;
  title?: string;
  subtitle?: string;
  searchPlaceholder?: string;
  sections: LauncherActionSection[];
}

export interface LauncherActionsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  containerClassName?: string;
  anchorMode?: "self" | "panel-footer";
  rootTitle?: string;
  rootSearchPlaceholder?: string;
  showItemDescriptions?: boolean;
  rootItems?: LauncherActionItem[];
  rootSections?: LauncherActionSection[];
  defaultRootItemsMode?: "replace" | "append";
  defaultTarget?: LauncherActionTarget | null;
}

export type ActionPageId = "root" | "hotkey" | "alias";

export type FeedbackTone = "neutral" | "success" | "error";

export interface SaveFeedback {
  tone: FeedbackTone;
  text: string;
}
