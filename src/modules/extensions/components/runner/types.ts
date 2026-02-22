export type FormValue = string | boolean | number | null;

export interface FlattenedAction {
  nodeId: number;
  type: string;
  title: string;
  shortcut?: string;
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
}
