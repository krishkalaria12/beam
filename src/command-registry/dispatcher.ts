import { openApplication } from "@/modules/applications/api/open-application";
import { openFile } from "@/modules/file-search/api/open-file";
import { searchWithBrowser } from "@/modules/search/api/search-with-browser";
import { executeSystemAction } from "@/modules/system-actions/api/execute-system-action";
import { getAwakeStatus, toggleAwake } from "@/modules/system-actions/api/toggle-awake";
import type { SystemAction } from "@/modules/system-actions/types";

import { isCommandMode } from "@/command-registry/modes";
import { COMMAND_PANELS, isCommandPanel } from "@/command-registry/panels";
import type { StaticCommandRegistry } from "@/command-registry/static-registry";
import type { CommandDescriptor, CommandMode, CommandPanel } from "@/command-registry/types";

const TAURI_INVOKE_ALLOWLIST = new Set([
  "execute_system_action",
  "search_with_browser",
  "toggle_awake",
  "get_awake_status",
]);

const SYSTEM_ACTION_ALLOWLIST: ReadonlySet<SystemAction> = new Set([
  "shutdown",
  "reboot",
  "logout",
  "sleep",
  "hibernate",
]);

export type DispatchErrorCode =
  | "COMMAND_NOT_FOUND"
  | "UNSUPPORTED_SCOPE"
  | "INVALID_ACTION"
  | "INVALID_INPUT"
  | "INVALID_BACKEND_COMMAND"
  | "UNSUPPORTED_ACTION"
  | "BACKEND_UNAVAILABLE"
  | "BACKEND_FAILURE";

export type DispatchBackendErrorType =
  | "runtime_unavailable"
  | "invalid_input"
  | "not_found"
  | "permission_denied"
  | "backend_failure";

export interface DispatchBackendError {
  type: DispatchBackendErrorType;
  technicalMessage: string;
  userMessage: string;
}

export type DispatchResult =
  | { ok: true; payload?: Record<string, unknown> }
  | { ok: false; code: DispatchErrorCode; message: string; backend?: DispatchBackendError };

export interface DispatchRuntime {
  setActivePanel: (panel: CommandPanel) => void;
  setCommandSearch: (value: string) => void;
  setQuicklinksView: (view: "create" | "manage") => void;
  setFileSearchQuery: (query: string) => void;
  setDictionaryQuery: (query: string) => void;
  setTranslationQuery: (query: string) => void;
  setSpotifyQuery: (query: string) => void;
  setGithubQuery: (query: string) => void;
  openUrl?: (url: string) => void | Promise<void>;
  customActionHandler?: (request: CustomActionRequest) => Promise<DispatchResult>;
}

export interface DispatchContext {
  query: string;
  mode: CommandMode;
  isDesktopRuntime: boolean;
  registry: StaticCommandRegistry;
  runtime: DispatchRuntime;
}

export interface CustomActionSandboxPolicy {
  allowOpenUrl: boolean;
  allowReadQuery: boolean;
}

export interface CustomActionRequest {
  command: CommandDescriptor;
  extensionId: string;
  extensionCommandId: string;
  payload: Record<string, unknown>;
  mode: CommandMode;
  isDesktopRuntime: boolean;
  query: string | null;
  policy: CustomActionSandboxPolicy;
  openUrl: (url: string) => Promise<DispatchResult>;
}

function ok(payload?: Record<string, unknown>): DispatchResult {
  return { ok: true, payload };
}

function error(code: DispatchErrorCode, message: string): DispatchResult {
  return { ok: false, code, message };
}

function backendError(code: DispatchErrorCode, backend: DispatchBackendError): DispatchResult {
  return { ok: false, code, message: backend.userMessage, backend };
}

function isScopeAllowed(command: CommandDescriptor, mode: CommandMode): boolean {
  return command.scope.includes("all") || command.scope.includes(mode);
}

function toPayloadRecord(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== "object") {
    return {};
  }

  return payload as Record<string, unknown>;
}

function getStringField(payload: Record<string, unknown>, key: string): string | undefined {
  const value = payload[key];
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function getRecordField(payload: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = payload[key];
  if (!value || typeof value !== "object") {
    return {};
  }

  return value as Record<string, unknown>;
}

function getBooleanField(payload: Record<string, unknown>, key: string, fallback = false): boolean {
  const value = payload[key];
  if (typeof value === "boolean") {
    return value;
  }

  return fallback;
}

function getModeListField(payload: Record<string, unknown>, key: string): CommandMode[] {
  const value = payload[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is CommandMode => isCommandMode(entry));
}

export function mapDispatchBackendError(err: unknown, fallback: string): DispatchBackendError {
  const technicalMessage =
    err instanceof Error && err.message.trim().length > 0 ? err.message : fallback;
  const normalized = technicalMessage.toLowerCase();

  if (
    normalized.includes("desktop runtime is required") ||
    normalized.includes("not running in tauri")
  ) {
    return {
      type: "runtime_unavailable",
      technicalMessage,
      userMessage: "This command requires the desktop runtime.",
    };
  }

  if (
    normalized.includes("missing") ||
    normalized.includes("invalid") ||
    normalized.includes("required")
  ) {
    return {
      type: "invalid_input",
      technicalMessage,
      userMessage: "This command received invalid input.",
    };
  }

  if (normalized.includes("not found")) {
    return {
      type: "not_found",
      technicalMessage,
      userMessage: "Required resource was not found.",
    };
  }

  if (
    normalized.includes("permission") ||
    normalized.includes("denied") ||
    normalized.includes("forbidden")
  ) {
    return {
      type: "permission_denied",
      technicalMessage,
      userMessage: "Permission denied while executing command.",
    };
  }

  return {
    type: "backend_failure",
    technicalMessage,
    userMessage: "Backend action failed.",
  };
}

function mapDesktopUnavailable(commandId: string): DispatchResult {
  return error("BACKEND_UNAVAILABLE", `Command "${commandId}" requires desktop runtime.`);
}

function isPrivilegedAction(command: CommandDescriptor): boolean {
  return (
    command.action?.type === "INVOKE_TAURI" ||
    command.action?.type === "OPEN_APP" ||
    command.action?.type === "OPEN_FILE"
  );
}

async function dispatchPanelAction(
  command: CommandDescriptor,
  context: DispatchContext,
): Promise<DispatchResult> {
  const payload = toPayloadRecord(command.action?.payload);
  const panel = getStringField(payload, "panel");

  if (!panel || !isCommandPanel(panel)) {
    return error("INVALID_INPUT", "Panel action is missing a valid target panel.");
  }

  if (panel === COMMAND_PANELS.QUICKLINKS) {
    const view = getStringField(payload, "view");
    if (view === "create" || view === "manage") {
      context.runtime.setQuicklinksView(view);
    }
  }

  if (panel === COMMAND_PANELS.FILE_SEARCH) {
    context.runtime.setFileSearchQuery(context.query);
  }
  if (panel === COMMAND_PANELS.DICTIONARY) {
    context.runtime.setDictionaryQuery(context.query);
  }
  if (panel === COMMAND_PANELS.TRANSLATION) {
    context.runtime.setTranslationQuery(context.query);
  }
  if (panel === COMMAND_PANELS.SPOTIFY) {
    context.runtime.setSpotifyQuery(context.query);
  }
  if (panel === COMMAND_PANELS.GITHUB) {
    context.runtime.setGithubQuery(context.query);
  }

  context.runtime.setActivePanel(panel);

  if (
    panel !== COMMAND_PANELS.FILE_SEARCH &&
    panel !== COMMAND_PANELS.DICTIONARY &&
    panel !== COMMAND_PANELS.TRANSLATION &&
    panel !== COMMAND_PANELS.SPOTIFY &&
    panel !== COMMAND_PANELS.GITHUB
  ) {
    context.runtime.setCommandSearch("");
  }

  return ok({ panel });
}

async function dispatchInvokeAction(
  command: CommandDescriptor,
  context: DispatchContext,
): Promise<DispatchResult> {
  const payload = toPayloadRecord(command.action?.payload);
  const commandName = getStringField(payload, "command");
  const args = getRecordField(payload, "args");

  if (!commandName) {
    return error("INVALID_INPUT", "Backend action is missing command name.");
  }

  if (!TAURI_INVOKE_ALLOWLIST.has(commandName)) {
    return error("INVALID_BACKEND_COMMAND", `Backend command "${commandName}" is not allowlisted.`);
  }

  try {
    if (commandName === "execute_system_action") {
      const action = getStringField(args, "action");
      if (!action || !SYSTEM_ACTION_ALLOWLIST.has(action as SystemAction)) {
        return error("INVALID_INPUT", "System action command is missing action.");
      }

      await executeSystemAction(action as SystemAction);
      context.runtime.setCommandSearch("");
      return ok({ commandName, action });
    }

    if (commandName === "search_with_browser") {
      const site = getStringField(args, "site");
      if (site !== "google" && site !== "duckduckgo") {
        return error("INVALID_INPUT", "Search command is missing valid search site.");
      }
      const normalizedQuery = context.query.trim();
      if (normalizedQuery.length === 0) {
        return error("INVALID_INPUT", "Search command requires a non-empty query.");
      }

      await searchWithBrowser({
        site,
        query: normalizedQuery,
      });
      context.runtime.setCommandSearch("");
      return ok({ commandName, site });
    }

    if (commandName === "toggle_awake") {
      const isAwake = await toggleAwake();
      context.runtime.setCommandSearch("");
      return ok({ commandName, isAwake });
    }

    if (commandName === "get_awake_status") {
      const isAwake = await getAwakeStatus();
      return ok({ commandName, isAwake });
    }

    return error(
      "UNSUPPORTED_ACTION",
      `Backend command "${commandName}" is not handled by dispatcher.`,
    );
  } catch (err) {
    const mapped = mapDispatchBackendError(err, "Backend action failed.");
    const code = mapped.type === "runtime_unavailable" ? "BACKEND_UNAVAILABLE" : "BACKEND_FAILURE";
    return backendError(code, mapped);
  }
}

async function dispatchOpenAppAction(
  command: CommandDescriptor,
  context: DispatchContext,
): Promise<DispatchResult> {
  const payload = toPayloadRecord(command.action?.payload);
  const execPath = getStringField(payload, "execPath");

  if (!execPath) {
    return error("INVALID_INPUT", "Open app action is missing execPath.");
  }

  try {
    await openApplication(execPath);
    context.runtime.setCommandSearch("");
    return ok({ execPath });
  } catch (err) {
    const mapped = mapDispatchBackendError(err, "Could not open application.");
    const code = mapped.type === "runtime_unavailable" ? "BACKEND_UNAVAILABLE" : "BACKEND_FAILURE";
    return backendError(code, mapped);
  }
}

async function dispatchOpenFileAction(
  command: CommandDescriptor,
  context: DispatchContext,
): Promise<DispatchResult> {
  const payload = toPayloadRecord(command.action?.payload);
  const filePath = getStringField(payload, "filePath");

  if (!filePath) {
    return error("INVALID_INPUT", "Open file action is missing filePath.");
  }

  try {
    await openFile(filePath);
    context.runtime.setCommandSearch("");
    return ok({ filePath });
  } catch (err) {
    const mapped = mapDispatchBackendError(err, "Could not open file.");
    const code = mapped.type === "runtime_unavailable" ? "BACKEND_UNAVAILABLE" : "BACKEND_FAILURE";
    return backendError(code, mapped);
  }
}

async function dispatchOpenUrlAction(
  command: CommandDescriptor,
  context: DispatchContext,
): Promise<DispatchResult> {
  const payload = toPayloadRecord(command.action?.payload);
  const url = getStringField(payload, "url");

  if (!url) {
    return error("INVALID_INPUT", "Open URL action is missing url.");
  }

  try {
    if (context.runtime.openUrl) {
      await context.runtime.openUrl(url);
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
    context.runtime.setCommandSearch("");
    return ok({ url });
  } catch (err) {
    const mapped = mapDispatchBackendError(err, "Could not open URL.");
    return backendError("BACKEND_FAILURE", mapped);
  }
}

async function dispatchCustomAction(
  command: CommandDescriptor,
  context: DispatchContext,
): Promise<DispatchResult> {
  if (!context.runtime.customActionHandler) {
    return error(
      "UNSUPPORTED_ACTION",
      "Custom command action is not configured in dispatcher runtime.",
    );
  }

  const payload = toPayloadRecord(command.action?.payload);
  const extensionId = getStringField(payload, "extensionId");
  const extensionCommandId = getStringField(payload, "extensionCommandId");
  const requiresDesktopRuntime = getBooleanField(payload, "requiresDesktopRuntime", false);
  const allowedModes = getModeListField(payload, "allowedModes");
  const sandboxPayload = getRecordField(payload, "sandbox");
  const policy: CustomActionSandboxPolicy = {
    allowOpenUrl: getBooleanField(sandboxPayload, "allowOpenUrl", false),
    allowReadQuery: getBooleanField(sandboxPayload, "allowReadQuery", true),
  };

  if (!extensionId || !extensionCommandId) {
    return error("INVALID_INPUT", "Custom command action is missing extension identifiers.");
  }

  if (requiresDesktopRuntime && !context.isDesktopRuntime) {
    return mapDesktopUnavailable(command.id);
  }

  if (allowedModes.length > 0 && !allowedModes.includes(context.mode)) {
    return error(
      "UNSUPPORTED_SCOPE",
      `Extension command "${command.id}" is not available in mode "${context.mode}".`,
    );
  }

  const openUrl = async (url: string): Promise<DispatchResult> => {
    if (!policy.allowOpenUrl) {
      return error(
        "UNSUPPORTED_ACTION",
        `Extension command "${command.id}" is not allowed to open URLs.`,
      );
    }

    if (typeof url !== "string" || url.trim().length === 0) {
      return error("INVALID_INPUT", "Custom action URL is missing.");
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return error("INVALID_INPUT", "Custom action URL is invalid.");
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return error("UNSUPPORTED_ACTION", "Custom action URL protocol is not allowed.");
    }

    try {
      if (context.runtime.openUrl) {
        await context.runtime.openUrl(parsed.toString());
      } else {
        window.open(parsed.toString(), "_blank", "noopener,noreferrer");
      }
      return ok({ url: parsed.toString() });
    } catch (err) {
      const mapped = mapDispatchBackendError(err, "Could not open URL.");
      return backendError("BACKEND_FAILURE", mapped);
    }
  };

  try {
    return await context.runtime.customActionHandler({
      command,
      extensionId,
      extensionCommandId,
      payload,
      mode: context.mode,
      isDesktopRuntime: context.isDesktopRuntime,
      query: policy.allowReadQuery ? context.query : null,
      policy,
      openUrl,
    });
  } catch (err) {
    const mapped = mapDispatchBackendError(err, "Custom action failed.");
    return backendError("BACKEND_FAILURE", mapped);
  }
}

export async function dispatchCommand(
  commandId: string,
  context: DispatchContext,
): Promise<DispatchResult> {
  const command = context.registry.getById(commandId);
  if (!command) {
    return error("COMMAND_NOT_FOUND", `Command "${commandId}" was not found.`);
  }

  if (!isScopeAllowed(command, context.mode)) {
    return error(
      "UNSUPPORTED_SCOPE",
      `Command "${commandId}" is not available for mode "${context.mode}".`,
    );
  }

  if (!command.action) {
    return error("INVALID_ACTION", `Command "${commandId}" has no executable action definition.`);
  }

  if (isPrivilegedAction(command) && !context.isDesktopRuntime) {
    return mapDesktopUnavailable(commandId);
  }

  if (command.action.type === "OPEN_PANEL") {
    return dispatchPanelAction(command, context);
  }
  if (command.action.type === "INVOKE_TAURI") {
    return dispatchInvokeAction(command, context);
  }
  if (command.action.type === "OPEN_APP") {
    return dispatchOpenAppAction(command, context);
  }
  if (command.action.type === "OPEN_FILE") {
    return dispatchOpenFileAction(command, context);
  }
  if (command.action.type === "OPEN_URL") {
    return dispatchOpenUrlAction(command, context);
  }
  if (command.action.type === "CUSTOM") {
    return dispatchCustomAction(command, context);
  }

  return error(
    "UNSUPPORTED_ACTION",
    `Action type "${command.action.type}" is not handled by dispatcher.`,
  );
}
