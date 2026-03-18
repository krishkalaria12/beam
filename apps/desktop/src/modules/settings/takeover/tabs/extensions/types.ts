import type { ExtensionPreferenceField } from "@/modules/extensions/types";

export type ExtensionSettingsSourceKind = "beam" | "extension";

export interface SettingsExtensionsTabProps {
  isActive: boolean;
  hiddenCommandIds: ReadonlySet<string>;
  aliasesById: Record<string, string[]>;
  onSetHidden: (commandId: string, hidden: boolean) => void;
  onSetAliases: (commandId: string, aliases: readonly string[]) => void;
}

export type SelectedExtensionEntry =
  | { kind: "group"; groupId: string }
  | { kind: "command"; groupId: string; commandId: string };

export interface ExtensionCommandEntry {
  key: string;
  commandId: string;
  commandName: string;
  title: string;
  subtitle: string;
  description: string;
  pluginName: string;
  pluginTitle: string;
  owner: string;
  version: string | null;
  iconReference: string | null;
  keywords: string[];
  fields: ExtensionPreferenceField[];
  sourceKind: ExtensionSettingsSourceKind;
}

export interface ExtensionGroupEntry {
  id: string;
  pluginName: string;
  title: string;
  owner: string;
  version: string | null;
  description: string;
  iconReference: string | null;
  keywords: string[];
  fields: ExtensionPreferenceField[];
  commands: ExtensionCommandEntry[];
  sourceKind: ExtensionSettingsSourceKind;
}
