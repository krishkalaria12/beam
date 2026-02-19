import { openApplication } from "@/modules/applications/api/open-application";
import { openFile } from "@/modules/file-search/api/open-file";
import { searchWithBrowser } from "@/modules/search/api/search-with-browser";
import { executeSystemAction } from "@/modules/system-actions/api/execute-system-action";
import type { SystemAction } from "@/modules/system-actions/types";

import type { StaticCommandRegistry } from "@/command-registry/static-registry";
import type {
  CommandDescriptor,
  CommandMode,
  CommandPanel,
} from "@/command-registry/types";

const TAURI_INVOKE_ALLOWLIST = new Set([
  "execute_system_action",
  "search_with_browser",
]);

const VALID_PANELS: ReadonlySet<CommandPanel> = new Set([
  "commands",
  "clipboard",
  "emoji",
  "settings",
  "calculator-history",
  "file-search",
  "dictionary",
  "quicklinks",
  "speed-test",
  "translation",
]);

export type DispatchErrorCode =
  | "COMMAND_NOT_FOUND"
  | "UNSUPPORTED_SCOPE"
  | "INVALID_ACTION"
  | "INVALID_INPUT"
  | "INVALID_BACKEND_COMMAND"
  | "UNSUPPORTED_ACTION"
  | "BACKEND_FAILURE";

export type DispatchResult =
  | { ok: true; payload?: Record<string, unknown> }
  | { ok: false; code: DispatchErrorCode; message: string };

export interface DispatchRuntime {
  setActivePanel: (panel: CommandPanel) => void;
  setCommandSearch: (value: string) => void;
  setQuicklinksView: (view: "create" | "manage") => void;
  setFileSearchQuery: (query: string) => void;
  setDictionaryQuery: (query: string) => void;
  setTranslationQuery: (query: string) => void;
  openUrl?: (url: string) => void | Promise<void>;
  customActionHandler?: (
    command: CommandDescriptor,
    context: DispatchContext,
  ) => Promise<DispatchResult>;
}

export interface DispatchContext {
  query: string;
  mode: CommandMode;
  registry: StaticCommandRegistry;
  runtime: DispatchRuntime;
}

function ok(payload?: Record<string, unknown>): DispatchResult {
  return { ok: true, payload };
}

function error(code: DispatchErrorCode, message: string): DispatchResult {
  return { ok: false, code, message };
}

function toMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim().length > 0) {
    return err.message;
  }
  return fallback;
}

function isScopeAllowed(command: CommandDescriptor, mode: CommandMode): boolean {
  return command.scope.includes("all") || command.scope.includes(mode);
}

function toPayloadRecord(
  payload: unknown,
): Record<string, unknown> {
  if (!payload || typeof payload !== "object") {
    return {};
  }

  return payload as Record<string, unknown>;
}

async function dispatchPanelAction(
  command: CommandDescriptor,
  context: DispatchContext,
): Promise<DispatchResult> {
  const payload = toPayloadRecord(command.action?.payload);
  const panel = payload.panel;

  if (typeof panel !== "string" || !VALID_PANELS.has(panel as CommandPanel)) {
    return error("INVALID_INPUT", "Panel action is missing a valid target panel.");
  }

  if (panel === "quicklinks") {
    const view = payload.view;
    if (view === "create" || view === "manage") {
      context.runtime.setQuicklinksView(view);
    }
  }

  if (panel === "file-search") {
    context.runtime.setFileSearchQuery(context.query);
  }
  if (panel === "dictionary") {
    context.runtime.setDictionaryQuery(context.query);
  }
  if (panel === "translation") {
    context.runtime.setTranslationQuery(context.query);
  }

  context.runtime.setActivePanel(panel as CommandPanel);

  if (
    panel !== "file-search" &&
    panel !== "dictionary" &&
    panel !== "translation"
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
  const commandName = payload.command;
  const args = toPayloadRecord(payload.args);

  if (typeof commandName !== "string" || commandName.trim().length === 0) {
    return error("INVALID_INPUT", "Backend action is missing command name.");
  }

  if (!TAURI_INVOKE_ALLOWLIST.has(commandName)) {
    return error(
      "INVALID_BACKEND_COMMAND",
      `Backend command "${commandName}" is not allowlisted.`,
    );
  }

  try {
    if (commandName === "execute_system_action") {
      const action = args.action;
      if (typeof action !== "string") {
        return error("INVALID_INPUT", "System action command is missing action.");
      }

      await executeSystemAction(action as SystemAction);
      context.runtime.setCommandSearch("");
      return ok({ commandName, action });
    }

    if (commandName === "search_with_browser") {
      const site = args.site;
      if (site !== "google" && site !== "duckduckgo") {
        return error("INVALID_INPUT", "Search command is missing valid search site.");
      }
      if (context.query.trim().length === 0) {
        return error("INVALID_INPUT", "Search command requires a non-empty query.");
      }

      await searchWithBrowser({
        site,
        query: context.query,
      });
      context.runtime.setCommandSearch("");
      return ok({ commandName, site });
    }

    return error(
      "UNSUPPORTED_ACTION",
      `Backend command "${commandName}" is not handled by dispatcher.`,
    );
  } catch (err) {
    return error("BACKEND_FAILURE", toMessage(err, "Backend action failed."));
  }
}

async function dispatchOpenAppAction(
  command: CommandDescriptor,
  context: DispatchContext,
): Promise<DispatchResult> {
  const payload = toPayloadRecord(command.action?.payload);
  const execPath = payload.execPath;

  if (typeof execPath !== "string" || execPath.trim().length === 0) {
    return error("INVALID_INPUT", "Open app action is missing execPath.");
  }

  try {
    await openApplication(execPath);
    context.runtime.setCommandSearch("");
    return ok({ execPath });
  } catch (err) {
    return error("BACKEND_FAILURE", toMessage(err, "Could not open application."));
  }
}

async function dispatchOpenFileAction(
  command: CommandDescriptor,
  context: DispatchContext,
): Promise<DispatchResult> {
  const payload = toPayloadRecord(command.action?.payload);
  const filePath = payload.filePath;

  if (typeof filePath !== "string" || filePath.trim().length === 0) {
    return error("INVALID_INPUT", "Open file action is missing filePath.");
  }

  try {
    await openFile(filePath);
    context.runtime.setCommandSearch("");
    return ok({ filePath });
  } catch (err) {
    return error("BACKEND_FAILURE", toMessage(err, "Could not open file."));
  }
}

async function dispatchOpenUrlAction(
  command: CommandDescriptor,
  context: DispatchContext,
): Promise<DispatchResult> {
  const payload = toPayloadRecord(command.action?.payload);
  const url = payload.url;

  if (typeof url !== "string" || url.trim().length === 0) {
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
    return error("BACKEND_FAILURE", toMessage(err, "Could not open URL."));
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

  try {
    return await context.runtime.customActionHandler(command, context);
  } catch (err) {
    return error("BACKEND_FAILURE", toMessage(err, "Custom action failed."));
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
    return error(
      "INVALID_ACTION",
      `Command "${commandId}" has no executable action definition.`,
    );
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

