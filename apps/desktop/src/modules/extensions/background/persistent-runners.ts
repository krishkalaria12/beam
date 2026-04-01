import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { open as shellOpen } from "@tauri-apps/plugin-shell";
import type { ManagerRequest } from "@beam/extension-protocol";
import { toast } from "sonner";

import {
  buildDispatchViewEventManagerRequest,
  buildLaunchPluginManagerRequest,
} from "@/modules/extensions/extension-manager/manager-protocol";
import { parseOauthDeepLink } from "@/modules/extensions/extension-manager/deep-link";
import {
  listenToExtensionRuntimeExit,
  listenToExtensionRuntimeMessages,
  listenToExtensionRuntimeStderr,
  sendExtensionRuntimeManagerRequest,
  sendExtensionRuntimeMessage,
  sendExtensionRuntimeRpc,
  startExtensionRuntime,
  stopExtensionRuntime,
} from "@/modules/extensions/extension-manager/runtime-bridge";
import { parseRuntimeRender } from "@/modules/extensions/extension-manager/runtime-render";
import { parseRuntimeOutput } from "@/modules/extensions/extension-manager/runtime-output";
import { parseRuntimeRpc } from "@/modules/extensions/extension-manager/runtime-rpc";
import type { PluginInfo } from "@/modules/extensions/types";
import {
  applyRuntimeCommandsToRuntimeTree,
  createEmptyRuntimeTreeSnapshot,
  type ExtensionUiNode,
  type RuntimeTreeSnapshot,
} from "@/modules/extensions/runtime/runtime-tree";
import type { RuntimeRpc } from "@beam/extension-protocol";

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

interface ExtensionManagerEventEnvelope {
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

function findNode(
  snapshot: RuntimeTreeSnapshot,
  id: number | undefined,
): ExtensionUiNode | undefined {
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
  return node.children
    .map((childId) => collectNodeText(snapshot, childId))
    .join(" ")
    .trim();
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
    const title =
      asString(node.props.title) || collectNodeText(snapshot, node.children[0]) || "Menu";
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
    const title =
      asString(node.props.title) || collectNodeText(snapshot, node.children[0]) || "Item";
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
  private propTemplates = new Map<
    number,
    { props: Record<string, unknown>; namedChildren?: Record<string, number> }
  >();
  private callbacks: RunnerManagerCallbacks;
  private onExit?: () => void;
  private pendingOauthStates = new Set<string>();
  private oauthKickoffListeners = new Set<() => void>();

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
    this.pendingOauthStates.clear();

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
    this.pendingOauthStates.clear();

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

  private async writeEvent(event: ExtensionManagerEventEnvelope): Promise<void> {
    if (!this.runtimeStarted) {
      throw new Error(`persistent runner "${this.runnerId}" is not running`);
    }

    await sendExtensionRuntimeMessage(this.runtimeId, event.action, event.payload);
  }

  private async sendManagerRequest(request: ManagerRequest): Promise<void> {
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
      this.sendRuntimeRpc({
        response: {
          invokeCommand: {
            requestId: payload.requestId,
            result,
            error: "",
          },
        },
      });
    } catch (error) {
      this.sendRuntimeRpc({
        response: {
          invokeCommand: {
            requestId: payload.requestId,
            result: undefined,
            error: error instanceof Error ? error.message : String(error),
          },
        },
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
      this.sendRuntimeRpc({
        response: {
          browserExtension: {
            requestId: payload.requestId,
            result,
            error: "",
          },
        },
      });
    } catch (error) {
      this.sendRuntimeRpc({
        response: {
          browserExtension: {
            requestId: payload.requestId,
            result: undefined,
            error: error instanceof Error ? error.message : String(error),
          },
        },
      });
    }
  }

  private async handleOauthGetTokens(payload: {
    requestId: string;
    providerId: string;
  }): Promise<void> {
    try {
      const result = await invoke("oauth_get_tokens", { providerId: payload.providerId });
      this.sendRuntimeRpc({
        response: {
          oauthGetTokens: {
            requestId: payload.requestId,
            result:
              result && typeof result === "object"
                ? (result as Record<string, unknown>)
                : undefined,
            error: "",
          },
        },
      });
    } catch (error) {
      this.sendRuntimeRpc({
        response: {
          oauthGetTokens: {
            requestId: payload.requestId,
            result: undefined,
            error: error instanceof Error ? error.message : String(error),
          },
        },
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
      this.sendRuntimeRpc({
        response: {
          oauthSetTokens: {
            requestId: payload.requestId,
            ok: true,
            error: "",
          },
        },
      });
    } catch (error) {
      this.sendRuntimeRpc({
        response: {
          oauthSetTokens: {
            requestId: payload.requestId,
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          },
        },
      });
    }
  }

  private async handleOauthRemoveTokens(payload: {
    requestId: string;
    providerId: string;
  }): Promise<void> {
    try {
      await invoke("oauth_remove_tokens", { providerId: payload.providerId });
      this.sendRuntimeRpc({
        response: {
          oauthRemoveTokens: {
            requestId: payload.requestId,
            ok: true,
            error: "",
          },
        },
      });
    } catch (error) {
      this.sendRuntimeRpc({
        response: {
          oauthRemoveTokens: {
            requestId: payload.requestId,
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          },
        },
      });
    }
  }

  private handleOauthAuthorize(payload: { url: string }): void {
    try {
      const state = new URL(payload.url).searchParams.get("state") ?? "";
      if (state) {
        this.pendingOauthStates.add(state);
      }
    } catch {
      // Ignore malformed OAuth URLs and let the runtime timeout naturally.
    }

    for (const listener of this.oauthKickoffListeners) {
      listener();
    }
    this.oauthKickoffListeners.clear();

    void shellOpen(payload.url).catch((error) => {
      console.error(`[persistent-runner:${this.runnerId}] oauth open failed`, error);
    });
  }

  waitForOauthKickoff(timeoutMs: number): Promise<boolean> {
    if (this.pendingOauthStates.size > 0) {
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      const onKickoff = () => {
        clearTimeout(timeoutId);
        this.oauthKickoffListeners.delete(onKickoff);
        resolve(true);
      };

      const timeoutId = setTimeout(() => {
        this.oauthKickoffListeners.delete(onKickoff);
        resolve(false);
      }, timeoutMs);

      this.oauthKickoffListeners.add(onKickoff);
    });
  }

  handleDeepLink(url: string): boolean {
    const parsed = parseOauthDeepLink(url);
    if (!parsed.handled || !this.runtimeStarted) {
      return false;
    }

    if (parsed.kind === "success") {
      if (!this.pendingOauthStates.has(parsed.state)) {
        return false;
      }

      this.pendingOauthStates.delete(parsed.state);
      this.sendRuntimeRpc({
        response: {
          oauthAuthorize: {
            state: parsed.state,
            code: parsed.code,
            error: "",
          },
        },
      });
      return true;
    }

    let resolvedState = parsed.state;
    if (resolvedState) {
      if (!this.pendingOauthStates.has(resolvedState)) {
        return false;
      }

      this.pendingOauthStates.delete(resolvedState);
    } else if (this.pendingOauthStates.size === 1) {
      resolvedState = this.pendingOauthStates.values().next().value as string | undefined;
      if (resolvedState) {
        this.pendingOauthStates.delete(resolvedState);
      }
    } else {
      return false;
    }

    this.sendRuntimeRpc({
      response: {
        oauthAuthorize: {
          state: resolvedState ?? "",
          code: "",
          error: parsed.error,
        },
      },
    });
    return true;
  }

  private sendRuntimeRpc(message: RuntimeRpc): void {
    void sendExtensionRuntimeRpc(this.runtimeId, message).catch((error) => {
      console.error(`[persistent-runner:${this.runnerId}] failed to send runtime rpc`, error);
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
      this.sendRuntimeRpc({
        response: {
          aiAsk: {
            requestId: payload.requestId,
            fullText,
            error: "",
          },
        },
      });
    };

    const rejectOnce = (message: string) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      this.sendRuntimeRpc({
        response: {
          aiAskError: {
            streamRequestId: payload.streamRequestId,
            error: message,
          },
        },
      });
      this.sendRuntimeRpc({
        response: {
          aiAsk: {
            requestId: payload.requestId,
            fullText: "",
            error: message,
          },
        },
      });
    };

    try {
      unlisteners.push(
        await listen<{ requestId?: string; text?: string }>("ai-stream-chunk", (event) => {
          if (event.payload.requestId !== payload.streamRequestId) {
            return;
          }
          this.sendRuntimeRpc({
            response: {
              aiAskChunk: {
                streamRequestId: payload.streamRequestId,
                chunk: typeof event.payload.text === "string" ? event.payload.text : "",
              },
            },
          });
        }),
      );

      unlisteners.push(
        await listen<{ requestId?: string; fullText?: string }>("ai-stream-end", (event) => {
          if (event.payload.requestId !== payload.streamRequestId) {
            return;
          }
          const fullText = typeof event.payload.fullText === "string" ? event.payload.fullText : "";
          this.sendRuntimeRpc({
            response: {
              aiAskEnd: {
                streamRequestId: payload.streamRequestId,
                fullText,
              },
            },
          });
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
    const runtimeOutput = parseRuntimeOutput(raw);
    if (runtimeOutput?.openExtensionPreferences || runtimeOutput?.openCommandPreferences) {
      this.callbacks.openExtensions?.();
      return;
    }

    if (runtimeOutput?.goBackToPluginList) {
      if (this.onExit) {
        void this.onExit();
      } else {
        void this.stop();
      }
      return;
    }

    if (runtimeOutput?.open) {
      void shellOpen(runtimeOutput.open.target, runtimeOutput.open.application || undefined).catch(
        (error) => {
          console.error(`[persistent-runner:${this.runnerId}] open failed`, error);
        },
      );
      return;
    }

    if (runtimeOutput?.showHud) {
      toast.message(runtimeOutput.showHud.text);
      return;
    }

    const runtimeRpc = parseRuntimeRpc(raw);
    if (runtimeRpc?.request?.invokeCommand) {
      void this.handleInvokeCommand({
        requestId: runtimeRpc.request.invokeCommand.requestId,
        command: runtimeRpc.request.invokeCommand.command,
        params: toRecord(runtimeRpc.request.invokeCommand.params),
      });
      return;
    }

    if (runtimeRpc?.request?.browserExtension) {
      void this.handleBrowserExtensionRequest({
        requestId: runtimeRpc.request.browserExtension.requestId,
        method: runtimeRpc.request.browserExtension.method,
        params: runtimeRpc.request.browserExtension.params,
      });
      return;
    }

    if (runtimeRpc?.request?.oauthAuthorize) {
      this.handleOauthAuthorize({ url: runtimeRpc.request.oauthAuthorize.url });
      return;
    }

    if (runtimeRpc?.request?.oauthGetTokens) {
      void this.handleOauthGetTokens({
        requestId: runtimeRpc.request.oauthGetTokens.requestId,
        providerId: runtimeRpc.request.oauthGetTokens.providerId,
      });
      return;
    }

    if (runtimeRpc?.request?.oauthSetTokens) {
      void this.handleOauthSetTokens({
        requestId: runtimeRpc.request.oauthSetTokens.requestId,
        providerId: runtimeRpc.request.oauthSetTokens.providerId,
        tokens: runtimeRpc.request.oauthSetTokens.tokens ?? {},
      });
      return;
    }

    if (runtimeRpc?.request?.oauthRemoveTokens) {
      void this.handleOauthRemoveTokens({
        requestId: runtimeRpc.request.oauthRemoveTokens.requestId,
        providerId: runtimeRpc.request.oauthRemoveTokens.providerId,
      });
      return;
    }

    if (runtimeRpc?.request?.confirmAlert) {
      const lines = [
        runtimeRpc.request.confirmAlert.title,
        runtimeRpc.request.confirmAlert.message,
      ].filter(Boolean);
      const confirmed =
        typeof window !== "undefined" && typeof window.confirm === "function"
          ? window.confirm(lines.join("\n\n") || "Continue?")
          : true;
      this.sendRuntimeRpc({
        response: {
          confirmAlert: {
            requestId: runtimeRpc.request.confirmAlert.requestId,
            confirmed,
            error: "",
          },
        },
      });
      return;
    }

    if (runtimeRpc?.request?.launchCommand) {
      const launchRequest = runtimeRpc.request.launchCommand;
      if (!this.callbacks.launchCommand) {
        this.sendRuntimeRpc({
          response: {
            launchCommand: {
              requestId: launchRequest.requestId,
              ok: false,
              error: "Launch command callback is not configured.",
            },
          },
        });
        return;
      }

      void this.callbacks
        .launchCommand({
          requestId: launchRequest.requestId,
          name: launchRequest.name,
          type: launchRequest.type || undefined,
          context: toRecord(launchRequest.context),
          arguments: toRecord(launchRequest.arguments),
          extensionName: launchRequest.extensionName || undefined,
        })
        .then(() => {
          this.sendRuntimeRpc({
            response: {
              launchCommand: {
                requestId: launchRequest.requestId,
                ok: true,
                error: "",
              },
            },
          });
        })
        .catch((error) => {
          this.sendRuntimeRpc({
            response: {
              launchCommand: {
                requestId: launchRequest.requestId,
                ok: false,
                error: error instanceof Error ? error.message : String(error),
              },
            },
          });
        });
      return;
    }

    if (runtimeRpc?.request?.aiAsk) {
      void this.handleAiAsk({
        requestId: runtimeRpc.request.aiAsk.requestId,
        streamRequestId: runtimeRpc.request.aiAsk.streamRequestId,
        prompt: runtimeRpc.request.aiAsk.prompt,
        options: toRecord(runtimeRpc.request.aiAsk.options),
      });
      return;
    }

    const runtimeRender = parseRuntimeRender(raw);
    if (runtimeRender?.kind === "batch") {
      this.tree = applyRuntimeCommandsToRuntimeTree(
        this.tree,
        runtimeRender.commands,
        this.propTemplates,
      );
      void this.syncMenuBarTray();
      return;
    }

    if (runtimeRender?.kind === "command") {
      this.tree = applyRuntimeCommandsToRuntimeTree(
        this.tree,
        [runtimeRender.command],
        this.propTemplates,
      );
      void this.syncMenuBarTray();
      return;
    }

    if (runtimeRender?.kind === "log") {
      console.log(`[persistent-runner:${this.runnerId}]`, runtimeRender.payload);
      return;
    }

    if (runtimeRender?.kind === "error") {
      console.error(
        `[persistent-runner:${this.runnerId}]`,
        runtimeRender.message,
        runtimeRender.stack,
      );
      return;
    }

    console.error(`[persistent-runner:${this.runnerId}] invalid stdout payload`, raw);
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

  handleDeepLink(url: string): boolean {
    for (const session of this.activeSessions.values()) {
      if (session.handleDeepLink(url)) {
        return true;
      }
    }

    return false;
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
      return (
        mode === "menu-bar" ||
        (mode === "no-view" && normalizeIntervalToMs(plugin.interval) !== null)
      );
    });

    for (const plugin of eligible) {
      const mode = plugin.mode?.trim().toLowerCase();
      if (mode === "menu-bar") {
        await this.startMenuBar(plugin, "background");

        const runner = this.menuBarSessions.get(buildRunnerId(plugin));
        if (runner && (await runner.waitForOauthKickoff(1500))) {
          break;
        }
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

  private async startMenuBar(
    plugin: PersistentPluginDescriptor,
    launchType: LaunchTypeValue,
  ): Promise<void> {
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

  private async runBackgroundJob(
    plugin: PersistentPluginDescriptor,
    launchType: LaunchTypeValue,
  ): Promise<void> {
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
