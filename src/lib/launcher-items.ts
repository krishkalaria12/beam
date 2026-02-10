import type { LucideIcon } from "lucide-react";
import {
  Calculator,
  FileText,
  FolderOpen,
  Globe,
  Settings,
  TerminalSquare,
} from "lucide-react";

export type LauncherItemType = "application" | "command" | "shortcut";

export type LauncherItem = {
  id: string;
  title: string;
  subtitle: string;
  type: LauncherItemType;
  icon: LucideIcon;
};

export const launcherItems: LauncherItem[] = [
  {
    id: "terminal",
    title: "terminal",
    subtitle: "open your shell session",
    type: "application",
    icon: TerminalSquare,
  },
  {
    id: "files",
    title: "files",
    subtitle: "browse local folders",
    type: "application",
    icon: FolderOpen,
  },
  {
    id: "settings",
    title: "settings",
    subtitle: "launcher preferences",
    type: "command",
    icon: Settings,
  },
  {
    id: "search-web",
    title: "search web",
    subtitle: "query from beam",
    type: "command",
    icon: Globe,
  },
  {
    id: "notes",
    title: "notes",
    subtitle: "capture a quick thought",
    type: "shortcut",
    icon: FileText,
  },
  {
    id: "calculator",
    title: "calculator",
    subtitle: "evaluate expressions",
    type: "application",
    icon: Calculator,
  },
];
