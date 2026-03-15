export type DmenuSearchMode = "beam-fuzzy" | "compat";

export interface DmenuSessionRow {
  id: string;
  index: number;
  rawText: string;
  displayText: string;
  plainText: string;
  icon?: string;
  meta: string;
  info?: string;
  nonselectable: boolean;
  active: boolean;
  urgent: boolean;
}

export interface DmenuSession {
  requestId: string;
  prompt?: string;
  message?: string;
  lines: number;
  password: boolean;
  onlyMatch: boolean;
  noCustom: boolean;
  markupRows: boolean;
  caseInsensitive: boolean;
  selectText?: string;
  initialQuery: string;
  searchMode: DmenuSearchMode;
  rows: DmenuSessionRow[];
  restoreWindowHidden: boolean;
}

export interface DmenuResolvePayload {
  requestId: string;
  accepted: boolean;
  selectedIndex?: number;
  selectedText?: string;
  filterText: string;
}
