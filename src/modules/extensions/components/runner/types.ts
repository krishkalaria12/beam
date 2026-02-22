export interface KeyboardShortcutDefinition {
  key: string;
  modifiers: Array<"cmd" | "ctrl" | "opt" | "shift">;
}

export type FormValue = string | boolean | number | null | string[];

export interface FlattenedAction {
  nodeId: number;
  type: string;
  title: string;
  shortcut?: string;
  shortcutDefinition?: KeyboardShortcutDefinition;
  style?: string;
  hasOnAction: boolean;
  hasOnSubmit: boolean;
  props: Record<string, unknown>;
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
  options: Array<{ value: string; title: string }>;
  defaultValue: FormValue;
  controlledValue?: FormValue;
  hasOnChange: boolean;
  hasOnBlur: boolean;
  error?: string;
  info?: string;
}
