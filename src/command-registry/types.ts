export type CommandScope =
  | "normal"
  | "compressed"
  | "quicklink-trigger"
  | "system-trigger"
  | "all";

export type CommandKind =
  | "panel"
  | "action"
  | "backend-action"
  | "provider-item";

export type CommandActionType =
  | "OPEN_PANEL"
  | "INVOKE_TAURI"
  | "OPEN_APP"
  | "OPEN_FILE"
  | "OPEN_URL"
  | "CUSTOM";

export interface CommandAction {
  type: CommandActionType;
  payload?: Record<string, unknown>;
}

export interface CommandDescriptor {
  id: string;
  title: string;
  subtitle?: string;
  keywords: readonly string[];
  endText?: string;
  icon?: string;
  kind: CommandKind;
  scope: readonly CommandScope[];
  requiresQuery?: boolean;
  priority?: number;
  hidden?: boolean;
  action?: CommandAction;
}

export type CommandMode =
  | "normal"
  | "compressed"
  | "quicklink-trigger"
  | "system-trigger";

export type CommandPanel =
  | "commands"
  | "clipboard"
  | "emoji"
  | "settings"
  | "calculator-history"
  | "file-search"
  | "dictionary"
  | "quicklinks"
  | "speed-test"
  | "translation";

export interface CommandContext {
  rawQuery: string;
  query: string;
  quicklinkKeyword: string;
  mode: CommandMode;
  activePanel: CommandPanel;
  isDesktopRuntime: boolean;
}

export interface BuildCommandContextInput {
  search: string;
  isCompressed: boolean;
  activePanel: CommandPanel;
  isDesktopRuntime: boolean;
}

export interface ProviderResolveInput {
  context: CommandContext;
  signal: AbortSignal;
}

export interface CommandProvider {
  id: string;
  scope?: readonly CommandMode[];
  provide(input: ProviderResolveInput): Promise<readonly CommandDescriptor[]>;
}

export interface CommandProviderError {
  providerId: string;
  message: string;
}

export interface CommandProviderResolution {
  commands: CommandDescriptor[];
  errors: CommandProviderError[];
}

export interface CommandValidationError {
  code:
    | "INVALID_ID"
    | "DUPLICATE_ID"
    | "INVALID_TITLE"
    | "INVALID_KEYWORDS"
    | "INVALID_SCOPE"
    | "INVALID_ACTION"
    | "INVALID_PRIORITY";
  message: string;
}
