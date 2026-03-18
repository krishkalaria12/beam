import type {
  CompositorBindings,
  HotkeyCapabilities,
  HotkeySettings,
} from "@/modules/settings/api/hotkeys";

export type StatusTone = "idle" | "success" | "error";

export interface KeybindStatus {
  tone: StatusTone;
  text: string;
}

export type KeybindRow =
  | {
      id: "__global__";
      title: string;
      icon: string;
      description: string;
      shortcut: string;
      keywords: string[];
      kind: "global";
    }
  | {
      id: string;
      title: string;
      icon: string | undefined;
      description: string;
      shortcut: string;
      keywords: string[];
      kind: "command";
    };

export interface KeybindsTabProps {
  isActive: boolean;
}

export interface HotkeySnapshot {
  settings: HotkeySettings;
  capabilities: HotkeyCapabilities;
  bindings: CompositorBindings;
}
