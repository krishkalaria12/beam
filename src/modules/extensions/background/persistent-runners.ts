import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { open as shellOpen } from "@tauri-apps/plugin-shell";
import { SidecarMessageWithPluginsSchema, type Command as ProtocolCommand } from "@flare/protocol";
import type { ManagerRequest } from "@beam/extension-protocol";
import { toast } from "sonner";

import { parseAiAskRequest, parseConfirmAlertRequest, parseLaunchCommandRequest } from "@/modules/extensions/sidecar/custom-message";
import {
  buildDispatchViewEventManagerRequest,
  buildLaunchPluginManagerRequest,
} from "@/modules/extensions/sidecar/manager-protocol";
import {
  listenToExtensionRuntimeExit,
  listenToExtensionRuntimeMessages,
  listenToExtensionRuntimeStderr,
  sendExtensionRuntimeManagerRequest,
  sendExtensionRuntimeMessage,
  startExtensionRuntime,
  stopExtensionRuntime,
} from "@/modules/extensions/sidecar/runtime-bridge";
import type { PluginInfo } from "@/modules/extensions/types";
import {
  applyProtocolCommandsToRuntimeTree,
  createEmptyRuntimeTreeSnapshot,
  type ExtensionUiNode,
  type RuntimeTreeSnapshot,
} from "@/modules/extensions/runtime/runtime-tree";

const MENU_BAR_EVENT = "menu-bar-menu-event";

type LaunchTypeValue = "background" | "userInitiated";
type PersistentMode = "menu-bar" | "no-view" | "view";

type PersistentPluginDescriptor = Pick<
  PluginInfo,
  | "title"
  | "description"
  | "pluginTitle"
  | "pluginName"
  | "commandName"
  | "pluginPath"
  | "mode"
  | "interval"
  | "author"
  | "owner"
  | "icon"
>;

interface SidecarEvent {
  action: string;
  payload: Record<string, unknown>;
}

function buildBackgroundRuntimeId(plugin: PersistentPluginDescriptor): string {
  return `${buildRunnerId(plugin)}.${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 8)}`;
}

interface MenuBarTrayItem {
  id: string;
  title: string;
  enabled: boolean;
  kind: "item" | "submenu" | "separator";
  children?: MenuBarTrayItem[];
}

interface MenuBarTrayPayload {
  runnerId: string;
  title?: string;
  tooltip?: string;
  items: MenuBarTrayItem[];
}

interface LaunchCommandPayload {
  requestId: string;
  name: string;
  type?: string;
  context?: Record<string, unknown>;
  arguments?: Record<string, unknown>;
  extensionName?: string;
}

interface RunnerManagerCallbacks {
  launchCommand?: (payload: LaunchCommandPayload) => Promise<void>;
  openExtensions?: () => void;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function normalizeIntervalToMs(interval: string | null | undefined): number | null {
  const value = interval?.trim().toLowerCase() ?? "";
  if (!value) {
    return null;
  }

  const match = value.match(/^(\d+)(s|m|h|d)$/);
  if (!match) {
    return null;
  }

  const amount = Number.parseInt(match[1], 10);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  const unit = match[2];
  const multiplier =
    unit === "s" ? 1000 : unit === "m" ? 60_000 : unit === "h" ? 3_600_000 : 86_400_000;

  return amount * multiplier;
}

function buildRunnerId(plugin: PersistentPluginDescriptor): string {
  const owner =
    plugin.owner?.trim().toLowerCase() ||
    (typeof plugin.author === "string"
      ? plugin.author.trim().toLowerCase()
      : plugin.author?.name?.trim().toLowerCase() || "extension");
  return `${owner}.${plugin.pluginName}.${plugin.commandName}`.replace(/[^a-z0-9._-]+/g, "-");
}

function findNode(snapshot: RuntimeTreeSnapshot, id: number | undefined): ExtensionUiNode | undefined {
  if (id === undefined) {
    return undefined;
  }
  return snapshot.uiTree.get(id);
}

function collectNodeText(snapshot: RuntimeTreeSnapshot, nodeId: number | undefined): string {
  const node = findNode(snapshot, nodeId);
  if (!node) {
    return "";
  }
  if (node.type === "TEXT") {
    return node.text?.trim() ?? "";
  }
  return node.children.map((childId) => collectNodeText(snapshot, childId)).join(" ").trim();
}

function buildMenuBarItem(snapshot: RuntimeTreeSnapshot, nodeId: number): MenuBarTrayItem[] {
  const node = findNode(snapshot, nodeId);
  if (!node) {
    return [];
  }

  if (node.type === "MenuBarExtra.Section") {
    const title = asString(node.props.title);
    const children = node.children.flatMap((childId) => buildMenuBarItem(snapshot, childId));
    const items: MenuBarTrayItem[] = [];
    if (title) {
      items.push({
        id: `${node.id}__section`,
        title,
        enabled: false,
        kind: "item",
      });
    }
    if (items.length > 0 && children.length > 0) {
      items.push({
        id: `${node.id}__separator`,
        title: "",
        enabled: false,
        kind: "separator",
      });
    }
    items.push(...children);
    return items;
  }

  if (node.type === "MenuBarExtra.Submenu") {
    const title = asString(node.props.title) || collectNodeText(snapshot, node.children[0]) || "Menu";
    return [
      {
        id: String(node.id),
        title,
        enabled: true,
        kind: "submenu",
        children: node.children.flatMap((childId) => buildMenuBarItem(snapshot, childId)),
      },
    ];
  }

  if (node.type === "MenuBarExtra.Item") {
    const title = asString(node.props.title) || collectNodeText(snapshot, node.children[0]) || "Item";
    return [
      {
        id: String(node.id),
        title,
        enabled: node.props.onAction !== false,
        kind: "item",
      },
    ];
  }

  return node.children.flatMap((childId) => buildMenuBarItem(snapshot, childId));
}

function buildMenuBarTrayPayload(
  runnerId: string,
  fallbackTitle: string,
  snapshot: RuntimeTreeSnapshot,
): MenuBarTrayPayload | null {
  const root = snapshot.rootNodeId ? snapshot.uiTree.get(snapshot.rootNodeId) : undefined;
  if (!root || root.type !== "MenuBarExtra") {
    return null;
  }

  const title = asString(root.props.title) || fallbackTitle;
  const tooltip = asString(root.props.tooltip) || undefined;
  const items = root.children.flatMap((childId) => buildMenuBarItem(snapshot, childId));

  return {
    runnerId,
    title,
    tooltip,
    items,
  };
}

class PersistentRunnerSession {
  readonly runtimeId: string;
  readonly runnerId: string;
  readonly plugin: PersistentPluginDescriptor;
  readonly mode: PersistentMode;
  private runtimeStarted = false;
  private tree = createEmptyRuntimeTreeSnapshot();
  private propTemplates = new Map<number, { props: Record<string, unknown>; namedChildren?: Record<string, number> }>();
  private callbacks: RunnerManagerCallbacks;
  private onExit?: () => void;

  constructor(
    runtimeId: string,
    plugin: PersistentPluginDescriptor,
    callbacks: RunnerManagerCallbacks,
    onExit?: () => void,
  ) {
    this.runtimeId = runtimeId;
    this.plugin = plugin;
    this.runnerId = buildRunnerId(plugin);
    this.mode = (plugin.mode?.trim().toLowerCase() as PersistentMode) || "view";
    this.callbacks = callbacks;
    this.onExit = onExit;
  }

  async start(launchType: LaunchTypeValue): Promise<void> {
    if (!isTauri()) {
      throw new Error("desktop runtime is required");
    }

    await this.stop();
    await startExtensionRuntime(this.runtimeId);
    this.runtimeStarted = true;
    await this.sendManagerRequest(
      buildLaunchPluginManagerRequest({
        pluginPath: this.plugin.pluginPath,
        mode: this.mode,
        aiAccessStatus: false,
        launchType,
        commandName: this.plugin.commandName,
      }),
    );
  }

  async stop(): Promise<void> {
    if (this.runtimeStarted) {
      try {
        await stopExtensionRuntime(this.runtimeId);
      } catch (error) {
        console.error(`[persistent-runner:${this.runnerId}] failed to stop runtime`, error);
      }
    }

    this.runtimeStarted = false;
    this.tree = createEmptyRuntimeTreeSnapshot();
    this.propTemplates.clear();

    if (this.mode === "menu-bar") {
      try {
        await invoke("menu_bar_remove_tray", { runnerId: this.runnerId });
      } catch (error) {
        console.error(`[persistent-runner:${this.runnerId}] failed to remove tray`, error);
      }
    }
  }

  async dispatchMenuAction(itemId: string): Promise<void> {
    const parsedId = Number.parseInt(itemId, 10);
    if (!Number.isFinite(parsedId)) {
      return;
    }

    await this.sendManagerRequest(
      buildDispatchViewEventManagerRequest({
        instanceId: parsedId,
        handlerName: "onAction",
        args: [],
      }),
    );
  }

  async handleRuntimeExit(): Promise<void> {
    this.runtimeStarted = false;
    this.tree = createEmptyRuntimeTreeSnapshot();
    this.propTemplates.clear();

    if (this.mode === "menu-bar") {
      try {
        await invoke("menu_bar_remove_tray", { runnerId: this.runnerId });
      } catch (error) {
        console.error(`[persistent-runner:${this.runnerId}] failed to remove tray`, error);
      }
    }
  }

  handleRuntimeStderr(line: string): void {
    console.error(`[persistent-runner:${this.runnerId}] stderr:`, line);
  }

  private async writeEvent(event: SidecarEvent): Promise<void> {
    if (!this.runtimeStarted) {
      throw new Error(`persistent runner "${this.runnerId}" is not running`);
    }

    await sendExtensionRuntimeMessage(this.runtimeId, event.action, event.payload);
  }

  private async sendManagerRequest(
    request: ManagerRequest,
  ): Promise<void> {
    const response = await sendExtensionRuntimeManagerRequest(this.runtimeId, request);
    if (response.error) {
      throw new Error(response.error.message);
    }
  }

  private async handleInvokeCommand(payload: {
    requestId: string;
    command: string;
    params?: Record<string, unknown>;
  }): Promise<void> {
    try {
      const result = await invoke(payload.command, payload.params ?? {});
      this.sendResponse("invoke_command-response", { requestId: payload.requestId, result });
    } catch (error) {
      this.sendResponse("invoke_command-response", {
        requestId: payload.requestId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async handleBrowserExtensionRequest(payload: {
    requestId: string;
    method: string;
    params: unknown;
  }): Promise<void> {
    try {
      const result = await invoke("browser_extension_request", {
        method: payload.method,
        params: payload.params,
      });
      this.sendResponse("browser-extension-response", { requestId: payload.requestId, result });
    } catch (error) {
      this.sendResponse("browser-extension-response", {
        requestId: payload.requestId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async handleOauthGetTokens(payload: { requestId: string; providerId: string }): Promise<void> {
    try {
      const result = await invoke("oauth_get_tokens", { providerId: payload.providerId });
      this.sendResponse("oauth-get-tokens-response", { requestId: payload.requestId, result });
    } catch (error) {
      this.sendResponse("oauth-get-tokens-response", {
        requestId: payload.requestId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async handleOauthSetTokens(payload: {
    requestId: string;
    providerId: string;
    tokens: Record<string, unknown>;
  }): Promise<void> {
    try {
      await invoke("oauth_set_tokens", { providerId: payload.providerId, tokens: payload.tokens });
      this.sendResponse("oauth-set-tokens-response", { requestId: payload.requestId, result: true });
    } catch (error) {
      this.sendResponse("oauth-set-tokens-response", {
        requestId: payload.requestId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async handleOauthRemoveTokens(payload: {
    requestId: string;
    providerId: string;
  }): Promise<void> {
    try {
      await invoke("oauth_remove_tokens", { providerId: payload.providerId });
      this.sendResponse("oauth-remove-tokens-response", { requestId: payload.requestId, result: true });
    } catch (error) {
      this.sendResponse("oauth-remove-tokens-response", {
        requestId: payload.requestId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private handleOauthAuthorize(payload: { url: string }): void {
    void shellOpen(payload.url).catch((error) => {
      console.error(`[persistent-runner:${this.runnerId}] oauth open failed`, error);
    });
  }

  private async handleAiAsk(payload: {
    requestId: string;
    streamRequestId: string;
    prompt: string;
    options?: Record<string, unknown>;
  }): Promise<void> {
    let settled = false;
    const unlisteners: UnlistenFn[] = [];

    const cleanup = () => {
      while (unlisteners.length > 0) {
        const unlisten = unlisteners.pop();
        if (unlisten) {
          unlisten();
        }
      }
    };

    const resolveOnce = (fullText: string) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      this.sendResponse("ai-ask-response", {
        requestId: payload.requestId,
        result: { fullText },
      });
    };

    const rejectOnce = (message: string) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      this.sendResponse("ai-ask-error", {
        streamRequestId: payload.streamRequestId,
        error: message,
      });
      this.sendResponse("ai-ask-response", { requestId: payload.requestId, error: message });
    };

    try {
      unlisteners.push(
        await listen<{ requestId?: string; text?: string }>("ai-stream-chunk", (event) => {
          if (event.payload.requestId !== payload.streamRequestId) {
            return;
          }
          this.sendResponse("ai-ask-chunk", {
            streamRequestId: payload.streamRequestId,
            chunk: typeof event.payload.text === "string" ? event.payload.text : "",
          });
        }),
      );

      unlisteners.push(
        await listen<{ requestId?: string; fullText?: string }>("ai-stream-end", (event) => {
          if (event.payload.requestId !== payload.streamRequestId) {
            return;
          }
          const fullText = typeof event.payload.fullText === "string" ? event.payload.fullText : "";
          this.sendResponse("ai-ask-end", { streamRequestId: payload.streamRequestId, fullText });
          resolveOnce(fullText);
        }),
      );

      unlisteners.push(
        await listen<{ requestId?: string; error?: string }>("ai-stream-error", (event) => {
          if (event.payload.requestId !== payload.streamRequestId) {
            return;
          }
          rejectOnce(
            typeof event.payload.error === "string" ? event.payload.error : "AI request failed.",
          );
        }),
      );

      await invoke("ai_ask_stream", {
        requestId: payload.streamRequestId,
        prompt: payload.prompt,
        options: payload.options ?? {},
      });

      if (!settled) {
        resolveOnce("");
      }
    } catch (error) {
      rejectOnce(error instanceof Error ? error.message : String(error));
    }
  }

  private sendResponse(action: string, payload: Record<string, unknown>): void {
    void this.writeEvent({ action, payload }).catch((error) => {
      console.error(`[persistent-runner:${this.runnerId}] failed to send response`, error);
    });
  }

  private async syncMenuBarTray(): Promise<void> {
    if (this.mode !== "menu-bar") {
      return;
    }

    const payload = buildMenuBarTrayPayload(this.runnerId, this.plugin.title, this.tree);
    if (!payload) {
      return;
    }

    try {
      await invoke("menu_bar_upsert_tray", { payload });
    } catch (error) {
      console.error(`[persistent-runner:${this.runnerId}] failed to upsert tray`, error);
    }
  }

  handleRuntimeMessage(raw: unknown): void {
    const rawRecord = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
    const rawType = typeof rawRecord?.type === "string" ? rawRecord.type : null;
    if (rawType === "open-extension-preferences" || rawType === "open-command-preferences") {
      this.callbacks.openExtensions?.();
      return;
    }

    const confirmAlertRequest = parseConfirmAlertRequest(raw);
    if (confirmAlertRequest) {
      const lines = [confirmAlertRequest.title, confirmAlertRequest.message].filter(Boolean);
      const confirmed =
        typeof window !== "undefined" && typeof window.confirm === "function"
          ? window.confirm(lines.join("\n\n") || "Continue?")
          : true;
      this.sendResponse("confirm-alert-response", {
        requestId: confirmAlertRequest.requestId,
        result: confirmed,
      });
      return;
    }

    const launchCommandRequest = parseLaunchCommandRequest(raw);
    if (launchCommandRequest) {
      if (!this.callbacks.launchCommand) {
        this.sendResponse("launch-command-response", {
          requestId: launchCommandRequest.requestId,
          error: "Launch command callback is not configured.",
        });
        return;
      }

      void this.callbacks
        .launchCommand(launchCommandRequest)
        .then(() => {
          this.sendResponse("launch-command-response", {
            requestId: launchCommandRequest.requestId,
            result: true,
          });
        })
        .catch((error) => {
          this.sendResponse("launch-command-response", {
            requestId: launchCommandRequest.requestId,
            error: error instanceof Error ? error.message : String(error),
          });
        });
      return;
    }

    const aiAskRequest = parseAiAskRequest(raw);
    if (aiAskRequest) {
      void this.handleAiAsk(aiAskRequest);
      return;
    }

    const parsed = SidecarMessageWithPluginsSchema.safeParse(raw);
    if (!parsed.success) {
      console.error(`[persistent-runner:${this.runnerId}] invalid stdout payload`, parsed.error.issues);
      return;
    }

    const message = parsed.data;
    if (message.type === "BATCH_UPDATE") {
      this.tree = applyProtocolCommandsToRuntimeTree(this.tree, message.payload, this.propTemplates);
      void this.syncMenuBarTray();
      return;
    }

    if (
      message.type === "CREATE_INSTANCE" ||
      message.type === "CREATE_TEXT_INSTANCE" ||
      message.type === "APPEND_CHILD" ||
      message.type === "INSERT_BEFORE" ||
      message.type === "REMOVE_CHILD" ||
      message.type === "UPDATE_PROPS" ||
      message.type === "UPDATE_TEXT" ||
      message.type === "REPLACE_CHILDREN" ||
      message.type === "CLEAR_CONTAINER" ||
      message.type === "SHOW_TOAST" ||
      message.type === "UPDATE_TOAST" ||
      message.type === "HIDE_TOAST" ||
      message.type === "DEFINE_PROPS_TEMPLATE" ||
      message.type === "APPLY_PROPS_TEMPLATE"
    ) {
      this.tree = applyProtocolCommandsToRuntimeTree(this.tree, [message as ProtocolCommand], this.propTemplates);
      void this.syncMenuBarTray();
      return;
    }

    switch (message.type) {
      case "go-back-to-plugin-list":
        if (this.onExit) {
          void this.onExit();
        } else {
          void this.stop();
        }
        return;
      case "open":
        void shellOpen(message.payload.target, message.payload.application).catch((error) => {
          console.error(`[persistent-runner:${this.runnerId}] open failed`, error);
        });
        return;
      case "invoke_command":
        void this.handleInvokeCommand({
          requestId: message.payload.requestId,
          command: message.payload.command,
          params: message.payload.params ? toRecord(message.payload.params) : undefined,
        });
        return;
      case "browser-extension-request":
        void this.handleBrowserExtensionRequest(message.payload);
        return;
      case "oauth-authorize":
        this.handleOauthAuthorize({ url: message.payload.url });
        return;
      case "oauth-get-tokens":
        void this.handleOauthGetTokens(message.payload);
        return;
      case "oauth-set-tokens":
        void this.handleOauthSetTokens(message.payload);
        return;
      case "oauth-remove-tokens":
        void this.handleOauthRemoveTokens(message.payload);
        return;
      case "SHOW_HUD":
        toast.message(message.payload.title);
        return;
      case "log":
        console.log(`[persistent-runner:${this.runnerId}]`, message.payload);
        return;
      default:
        return;
    }
  }
}

class PersistentExtensionRunnerManager {
  private callbacks: RunnerManagerCallbacks = {};
  private activeSessions = new Map<string, PersistentRunnerSession>();
  private menuBarSessions = new Map<string, PersistentRunnerSession>();
  private scheduledTimers = new Map<string, ReturnType<typeof setInterval>>();
  private bootstrappedKey = "";
  private runtimeMessageUnlisten: UnlistenFn | null = null;
  private runtimeStderrUnlisten: UnlistenFn | null = null;
  private runtimeExitUnlisten: UnlistenFn | null = null;
  private bridgeListenersPromise: Promise<void> | null = null;

  setCallbacks(callbacks: RunnerManagerCallbacks): void {
    this.callbacks = callbacks;
  }

  private async ensureBridgeListeners(): Promise<void> {
    if (this.runtimeMessageUnlisten && this.runtimeStderrUnlisten && this.runtimeExitUnlisten) {
      return;
    }

    if (this.bridgeListenersPromise) {
      return this.bridgeListenersPromise;
    }

    this.bridgeListenersPromise = (async () => {
      this.runtimeMessageUnlisten = await listenToExtensionRuntimeMessages((runtimeId, message) => {
        this.activeSessions.get(runtimeId)?.handleRuntimeMessage(message);
      });

      this.runtimeStderrUnlisten = await listenToExtensionRuntimeStderr((runtimeId, line) => {
        this.activeSessions.get(runtimeId)?.handleRuntimeStderr(line);
      });

      this.runtimeExitUnlisten = await listenToExtensionRuntimeExit((runtimeId) => {
        const session = this.activeSessions.get(runtimeId);
        if (!session) {
          return;
        }

        this.activeSessions.delete(runtimeId);
        if (this.menuBarSessions.get(runtimeId) === session) {
          this.menuBarSessions.delete(runtimeId);
        }

        void session.handleRuntimeExit();
      });
    })();

    try {
      await this.bridgeListenersPromise;
    } finally {
      this.bridgeListenersPromise = null;
    }
  }

  async bootstrap(plugins: PluginInfo[]): Promise<void> {
    await this.ensureBridgeListeners();

    const nextKey = plugins
      .map((plugin) => `${plugin.pluginPath}:${plugin.mode ?? ""}:${plugin.interval ?? ""}`)
      .sort()
      .join("|");
    if (nextKey === this.bootstrappedKey) {
      return;
    }

    this.bootstrappedKey = nextKey;
    this.clearSchedules();

    const eligible = plugins.filter((plugin) => {
      const mode = plugin.mode?.trim().toLowerCase();
      return mode === "menu-bar" || (mode === "no-view" && normalizeIntervalToMs(plugin.interval) !== null);
    });

    for (const plugin of eligible) {
      const mode = plugin.mode?.trim().toLowerCase();
      if (mode === "menu-bar") {
        await this.startMenuBar(plugin, "background");
      }

      const intervalMs = normalizeIntervalToMs(plugin.interval);
      if (mode === "no-view" && intervalMs !== null) {
        const timerId = setInterval(() => {
          void this.runBackgroundJob(plugin, "background");
        }, intervalMs);
        this.scheduledTimers.set(buildRunnerId(plugin), timerId);
        void this.runBackgroundJob(plugin, "background");
      }
    }
  }

  async runPlugin(plugin: PersistentPluginDescriptor, launchType: LaunchTypeValue): Promise<void> {
    await this.ensureBridgeListeners();

    const mode = plugin.mode?.trim().toLowerCase();
    if (mode === "menu-bar") {
      await this.startMenuBar(plugin, launchType);
      return;
    }

    if (mode === "no-view" && normalizeIntervalToMs(plugin.interval) !== null) {
      await this.runBackgroundJob(plugin, launchType);
    }
  }

  async dispatchMenuAction(runnerId: string, itemId: string): Promise<void> {
    const session = this.menuBarSessions.get(runnerId);
    if (!session) {
      return;
    }

    await session.dispatchMenuAction(itemId);
  }

  async stopAll(): Promise<void> {
    this.clearSchedules();
    const stops = [...this.activeSessions.values()].map((session) => session.stop());
    this.activeSessions.clear();
    this.menuBarSessions.clear();
    await Promise.all(stops);

    if (this.runtimeMessageUnlisten) {
      this.runtimeMessageUnlisten();
      this.runtimeMessageUnlisten = null;
    }
    if (this.runtimeStderrUnlisten) {
      this.runtimeStderrUnlisten();
      this.runtimeStderrUnlisten = null;
    }
    if (this.runtimeExitUnlisten) {
      this.runtimeExitUnlisten();
      this.runtimeExitUnlisten = null;
    }
  }

  private clearSchedules(): void {
    for (const timerId of this.scheduledTimers.values()) {
      clearInterval(timerId);
    }
    this.scheduledTimers.clear();
  }

  private async startMenuBar(plugin: PersistentPluginDescriptor, launchType: LaunchTypeValue): Promise<void> {
    const runnerId = buildRunnerId(plugin);
    const existing = this.menuBarSessions.get(runnerId);
    if (existing) {
      this.activeSessions.delete(existing.runtimeId);
      await existing.stop();
    }

    const session = new PersistentRunnerSession(runnerId, plugin, this.callbacks);
    this.activeSessions.set(session.runtimeId, session);
    this.menuBarSessions.set(runnerId, session);
    try {
      await session.start(launchType);
    } catch (error) {
      this.activeSessions.delete(session.runtimeId);
      this.menuBarSessions.delete(runnerId);
      throw error;
    }
  }

  private async runBackgroundJob(plugin: PersistentPluginDescriptor, launchType: LaunchTypeValue): Promise<void> {
    const runtimeId = buildBackgroundRuntimeId(plugin);
    const session = new PersistentRunnerSession(runtimeId, plugin, this.callbacks, async () => {
      this.activeSessions.delete(runtimeId);
      await session.stop();
    });

    this.activeSessions.set(runtimeId, session);
    try {
      await session.start(launchType);
    } catch (error) {
      this.activeSessions.delete(runtimeId);
      throw error;
    }
  }
}

export const persistentExtensionRunnerManager = new PersistentExtensionRunnerManager();

export async function listenForPersistentMenuBarEvents(): Promise<() => void> {
  if (!isTauri()) {
    return () => {};
  }

  const unlisten = await listen<{ runnerId?: string; itemId?: string }>(MENU_BAR_EVENT, (event) => {
    const runnerId = asString(event.payload.runnerId);
    const itemId = asString(event.payload.itemId);
    if (!runnerId || !itemId) {
      return;
    }

    void persistentExtensionRunnerManager.dispatchMenuAction(runnerId, itemId);
  });

  return unlisten;
}
