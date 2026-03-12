import { isTauri } from "@tauri-apps/api/core";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { open as shellOpen } from "@tauri-apps/plugin-shell";
import { parseRaycastDeepLink } from "@/modules/extensions/sidecar/deep-link";
import {
  normalizeDiscoveredPluginRecord,
  type DiscoveredPluginRecord,
  type ExtensionMode,
} from "@/modules/extensions/sidecar/discovery";
import {
  buildBrowserExtensionStatusManagerRequest,
  buildDispatchToastActionManagerRequest,
  buildDispatchViewEventManagerRequest,
  buildGetPreferencesManagerRequest,
  buildLaunchPluginManagerRequest,
  buildPopViewManagerRequest,
  buildSetPreferencesManagerRequest,
  buildTriggerToastHideManagerRequest,
} from "@/modules/extensions/sidecar/manager-protocol";
import { parseRuntimeRender } from "@/modules/extensions/sidecar/runtime-render";
import { parseRuntimeOutput } from "@/modules/extensions/sidecar/runtime-output";
import { parseRuntimeRpc } from "@/modules/extensions/sidecar/runtime-rpc";
import {
  FOREGROUND_EXTENSION_RUNTIME_ID,
  listenToExtensionRuntimeExit,
  listenToExtensionRuntimeMessages,
  sendExtensionRuntimeRpc,
  listenToExtensionRuntimeStderr,
  sendExtensionRuntimeManagerRequest,
  sendExtensionRuntimeMessage,
  startExtensionRuntime,
  stopExtensionRuntime,
} from "@/modules/extensions/sidecar/runtime-bridge";
import { persistentExtensionRunnerManager } from "@/modules/extensions/background/persistent-runners";
import { useExtensionRuntimeStore } from "@/modules/extensions/runtime/store";
import type { ManagerRequest, ManagerResponse, RuntimeCommand, RuntimeRpc } from "@beam/extension-protocol";

interface RunPluginPayload {
  pluginPath: string;
  mode: ExtensionMode;
  aiAccessStatus: boolean;
  arguments?: Record<string, unknown>;
  launchContext?: Record<string, unknown>;
  launchType?: string;
  commandName?: string;
}

interface SidecarEvent {
  action: string;
  payload: Record<string, unknown>;
}

export type ExtensionSidecarMessageEvent =
  | { type: "go-back-to-plugin-list" }
  | { type: "open"; target: string; application?: string }
  | { type: "focus-element"; elementId: number }
  | { type: "reset-element"; elementId: number }
  | { type: "show-hud"; title: string }
  | { type: "clear-search-bar" }
  | { type: "update-command-metadata"; subtitle?: string }
  | { type: "open-extension-preferences"; extensionName?: string }
  | { type: "open-command-preferences"; extensionName?: string; commandName?: string }
  | { type: "log"; payload: unknown };

type SidecarEventListener = (event: ExtensionSidecarMessageEvent) => void;

interface SidecarRequestFailureLog {
  tag: "extensions-sidecar-request-failure";
  channel:
    | "launch-command"
    | "invoke_command"
    | "oauth-get-tokens"
    | "oauth-set-tokens"
    | "oauth-remove-tokens"
    | "browser-extension-request"
    | "open-target"
    | "show-hud";
  requestId?: string;
  operation: string;
  message: string;
  metadata?: Record<string, unknown>;
}

function toRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  return value as Record<string, unknown>;
}

class ExtensionSidecarService {
  private runtimeStarted = false;
  private startPromise: Promise<void> | null = null;
  private runtimeMessageUnlisten: (() => void) | null = null;
  private runtimeStderrUnlisten: (() => void) | null = null;
  private runtimeExitUnlisten: (() => void) | null = null;
  private listeners = new Set<SidecarEventListener>();
  private oauthTokenStore = new Map<string, Record<string, unknown>>();
  private browserExtensionStatusPollId: ReturnType<typeof setInterval> | null = null;
  private pendingOauthStates = new Set<string>();

  private toErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private logRequestFailure(log: SidecarRequestFailureLog): void {
    console.error(`[extensions-sidecar][request-failure] ${JSON.stringify(log)}`);
    this.emit({ type: "log", payload: log });
  }

  subscribe(listener: SidecarEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  dispatchEvent(instanceId: number, handlerName: string, args: unknown[] = []): void {
    void this.sendManagerRequest(
      buildDispatchViewEventManagerRequest({
        instanceId,
        handlerName,
        args,
      }),
    ).catch((error) => {
      console.error("[extensions-sidecar] dispatch event failed:", error);
    });
  }

  async getPreferences(pluginName: string): Promise<Record<string, unknown>> {
    const response = await this.sendManagerRequest(
      buildGetPreferencesManagerRequest(pluginName),
    );
    if (response.error) {
      throw new Error(response.error.message);
    }

    return response.getPreferences?.values ?? {};
  }

  async setPreferences(pluginName: string, values: Record<string, unknown>): Promise<void> {
    const response = await this.sendManagerRequest(
      buildSetPreferencesManagerRequest(pluginName, values),
    );
    if (response.error) {
      throw new Error(response.error.message);
    }
  }

  popView(): void {
    void this.sendManagerRequest(buildPopViewManagerRequest()).catch((error) => {
      console.error("[extensions-sidecar] pop view failed:", error);
    });
  }

  dispatchToastAction(toastId: number, actionType: "primary" | "secondary"): void {
    void this.sendManagerRequest(
      buildDispatchToastActionManagerRequest({
        toastId,
        actionType,
      }),
    ).catch((error) => {
      console.error("[extensions-sidecar] dispatch toast action failed:", error);
    });
  }

  triggerToastHide(toastId: number): void {
    void this.sendManagerRequest(buildTriggerToastHideManagerRequest(toastId)).catch((error) => {
      console.error("[extensions-sidecar] trigger toast hide failed:", error);
    });
  }

  open(target: string, application?: string): void {
    this.openTarget(target, application);
  }

  private emit(event: ExtensionSidecarMessageEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private applyRuntimeCommands(commands: RuntimeCommand[]): void {
    useExtensionRuntimeStore.getState().applyCommands(commands);
  }

  private setBrowserExtensionConnectionStatus(isConnected: boolean): void {
    void this.sendManagerRequest(buildBrowserExtensionStatusManagerRequest(isConnected)).catch(
      (error) => {
        console.error("[extensions-sidecar] browser extension status update failed:", error);
      },
    );
  }

  private async refreshBrowserExtensionConnectionStatus(): Promise<void> {
    if (!this.runtimeStarted) {
      return;
    }

    try {
      const isConnected = await invoke<boolean>("browser_extension_check_connection");
      this.setBrowserExtensionConnectionStatus(Boolean(isConnected));
    } catch {
      this.setBrowserExtensionConnectionStatus(false);
    }
  }

  private startBrowserExtensionStatusPolling(): void {
    if (this.browserExtensionStatusPollId !== null) {
      return;
    }

    this.browserExtensionStatusPollId = setInterval(() => {
      void this.refreshBrowserExtensionConnectionStatus();
    }, 5000);
  }

  private stopBrowserExtensionStatusPolling(): void {
    if (this.browserExtensionStatusPollId === null) {
      return;
    }

    clearInterval(this.browserExtensionStatusPollId);
    this.browserExtensionStatusPollId = null;
  }

  private handleConfirmAlert(payload: {
    requestId: string;
    title?: string;
    message?: string;
    primaryActionTitle?: string;
  }): void {
    const title = typeof payload.title === "string" ? payload.title.trim() : "";
    const message = typeof payload.message === "string" ? payload.message.trim() : "";
    const primaryActionTitle =
      typeof payload.primaryActionTitle === "string" ? payload.primaryActionTitle.trim() : "";

    const lines = [title, message].filter((line) => line.length > 0);
    if (primaryActionTitle.length > 0) {
      lines.push(`Action: ${primaryActionTitle}`);
    }
    const prompt = lines.join("\n\n");

    let confirmed = true;
    if (typeof window !== "undefined" && typeof window.confirm === "function") {
      confirmed = window.confirm(prompt || "Continue?");
    }

    this.sendRuntimeRpc({
      response: {
        confirmAlert: {
          requestId: payload.requestId,
          confirmed,
          error: "",
        },
      },
    });
  }

  private async handleLaunchCommand(payload: {
    requestId: string;
    name: string;
    type?: string;
    context?: Record<string, unknown>;
    arguments?: Record<string, unknown>;
    extensionName?: string;
  }): Promise<void> {
    try {
      const discoveredRaw = await invoke<unknown>("get_discovered_plugins");
      if (!Array.isArray(discoveredRaw)) {
        throw new Error("invalid plugin discovery response");
      }

      const discovered = discoveredRaw
        .map((entry) => normalizeDiscoveredPluginRecord(entry))
        .filter((entry): entry is DiscoveredPluginRecord => entry !== null);

      const requestedCommand = payload.name.trim();
      const requestedPluginName = (payload.extensionName ?? "").trim();

      const command =
        discovered.find(
          (entry) =>
            entry.commandName === requestedCommand &&
            requestedPluginName.length > 0 &&
            entry.pluginName === requestedPluginName,
        ) ?? discovered.find((entry) => entry.commandName === requestedCommand);

      if (!command) {
        throw new Error(`command "${payload.name}" was not found`);
      }

      if (
        command.mode === "menu-bar" ||
        (command.mode === "no-view" && typeof command.interval === "string")
      ) {
        await persistentExtensionRunnerManager.runPlugin(
          {
            title: command.title,
            description: command.description,
            pluginTitle: command.pluginTitle,
            pluginName: command.pluginName,
            commandName: command.commandName,
            pluginPath: command.pluginPath,
            mode: command.mode,
            interval: command.interval,
          },
          payload.type === "background" ? "background" : "userInitiated",
        );

        this.sendRuntimeRpc({
          response: {
            launchCommand: {
              requestId: payload.requestId,
              ok: true,
              error: "",
            },
          },
        });
        return;
      }

      useExtensionRuntimeStore.getState().resetForNewPlugin({
        pluginPath: command.pluginPath,
        pluginMode: command.mode,
        title: command.title,
        subtitle:
          [command.pluginTitle, command.description ?? ""]
            .filter((part) => part.trim().length > 0)
            .join(" - ") || undefined,
      });

      await this.runPlugin({
        pluginPath: command.pluginPath,
        mode: command.mode,
        aiAccessStatus: false,
        arguments: toRecord(payload.arguments),
        launchContext: toRecord(payload.context),
        launchType: payload.type,
        commandName: command.commandName,
      });

      this.sendRuntimeRpc({
        response: {
          launchCommand: {
            requestId: payload.requestId,
            ok: true,
            error: "",
          },
        },
      });
    } catch (error) {
      const message = this.toErrorMessage(error);
      this.logRequestFailure({
        tag: "extensions-sidecar-request-failure",
        channel: "launch-command",
        requestId: payload.requestId,
        operation: payload.name,
        message,
        metadata: {
          extensionName: payload.extensionName,
          type: payload.type,
          hasArguments: Boolean(payload.arguments),
          hasContext: Boolean(payload.context),
        },
      });
      this.sendRuntimeRpc({
        response: {
          launchCommand: {
            requestId: payload.requestId,
            ok: false,
            error: message,
          },
        },
      });
    }
  }

  private sendInvokeCommandResponse(requestId: string, result?: unknown, error?: string): void {
    this.sendRuntimeRpc({
      response: {
        invokeCommand: {
          requestId,
          result,
          error: error ?? "",
        },
      },
    });
  }

  private sendOauthResponse(
    kind: "get" | "set" | "remove",
    requestId: string,
    result?: unknown,
    error?: string,
  ): void {
    if (kind === "get") {
      this.sendRuntimeRpc({
        response: {
          oauthGetTokens: {
            requestId,
            result: result && typeof result === "object" ? (result as Record<string, unknown>) : undefined,
            error: error ?? "",
          },
        },
      });
      return;
    }

    if (kind === "set") {
      this.sendRuntimeRpc({
        response: {
          oauthSetTokens: {
            requestId,
            ok: Boolean(result),
            error: error ?? "",
          },
        },
      });
      return;
    }

    this.sendRuntimeRpc({
      response: {
        oauthRemoveTokens: {
          requestId,
          ok: Boolean(result),
          error: error ?? "",
        },
      },
    });
  }

  private async handleInvokeCommand(payload: {
    requestId: string;
    command: string;
    params?: Record<string, unknown>;
  }): Promise<void> {
    try {
      const result = await invoke(payload.command, payload.params ?? {});
      this.sendInvokeCommandResponse(payload.requestId, result);
    } catch (error) {
      const message = this.toErrorMessage(error);
      this.logRequestFailure({
        tag: "extensions-sidecar-request-failure",
        channel: "invoke_command",
        requestId: payload.requestId,
        operation: payload.command,
        message,
      });
      this.sendInvokeCommandResponse(payload.requestId, undefined, message);
    }
  }

  private handleOauthAuthorize(payload: { url: string }): void {
    this.openTarget(payload.url);
    try {
      const state = new URL(payload.url).searchParams.get("state") ?? "";
      if (state) {
        this.pendingOauthStates.add(state);
      }
    } catch {
      // Ignore malformed OAuth URL; extension will timeout and handle the error.
    }
  }

  handleDeepLink(url: string): boolean {
    const parsed = parseRaycastDeepLink(url);
    if (!parsed.handled) {
      return false;
    }

    if (parsed.kind === "extensions-store" || parsed.kind === "extensions-command") {
      return false;
    }

    if (!this.runtimeStarted) {
      return false;
    }

    if (parsed.kind === "success") {
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
      this.pendingOauthStates.delete(resolvedState);
    } else if (this.pendingOauthStates.size === 1) {
      resolvedState = this.pendingOauthStates.values().next().value as string | undefined;
      if (resolvedState) {
        this.pendingOauthStates.delete(resolvedState);
      }
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

  private async handleOauthGetTokens(payload: {
    requestId: string;
    providerId: string;
  }): Promise<void> {
    try {
      const cached = await invoke("oauth_get_tokens", { providerId: payload.providerId });
      this.sendOauthResponse("get", payload.requestId, cached);
    } catch (error) {
      const fallback = this.oauthTokenStore.get(payload.providerId);
      const message = this.toErrorMessage(error);
      this.logRequestFailure({
        tag: "extensions-sidecar-request-failure",
        channel: "oauth-get-tokens",
        requestId: payload.requestId,
        operation: "oauth_get_tokens",
        message,
        metadata: {
          providerId: payload.providerId,
          fallbackUsed: Boolean(fallback),
        },
      });
      this.sendOauthResponse("get", payload.requestId, fallback, message);
    }
  }

  private async handleOauthSetTokens(payload: {
    requestId: string;
    providerId: string;
    tokens: Record<string, unknown>;
  }): Promise<void> {
    try {
      await invoke("oauth_set_tokens", {
        providerId: payload.providerId,
        tokens: payload.tokens,
      });
      this.sendOauthResponse("set", payload.requestId, true);
    } catch (error) {
      this.oauthTokenStore.set(payload.providerId, payload.tokens);
      const message = this.toErrorMessage(error);
      this.logRequestFailure({
        tag: "extensions-sidecar-request-failure",
        channel: "oauth-set-tokens",
        requestId: payload.requestId,
        operation: "oauth_set_tokens",
        message,
        metadata: {
          providerId: payload.providerId,
          fallbackUsed: true,
        },
      });
      this.sendOauthResponse("set", payload.requestId, true, message);
    }
  }

  private async handleOauthRemoveTokens(payload: {
    requestId: string;
    providerId: string;
  }): Promise<void> {
    try {
      await invoke("oauth_remove_tokens", { providerId: payload.providerId });
      this.sendOauthResponse("remove", payload.requestId, true);
    } catch (error) {
      this.oauthTokenStore.delete(payload.providerId);
      const message = this.toErrorMessage(error);
      this.logRequestFailure({
        tag: "extensions-sidecar-request-failure",
        channel: "oauth-remove-tokens",
        requestId: payload.requestId,
        operation: "oauth_remove_tokens",
        message,
        metadata: {
          providerId: payload.providerId,
          fallbackUsed: true,
        },
      });
      this.sendOauthResponse("remove", payload.requestId, true, message);
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
      const message = this.toErrorMessage(error);
      this.logRequestFailure({
        tag: "extensions-sidecar-request-failure",
        channel: "browser-extension-request",
        requestId: payload.requestId,
        operation: payload.method,
        message,
      });
      this.sendRuntimeRpc({
        response: {
          browserExtension: {
            requestId: payload.requestId,
            result: undefined,
            error: message,
          },
        },
      });
    } finally {
      void this.refreshBrowserExtensionConnectionStatus();
    }
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

    const rejectOnce = (errorMessage: string) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      this.sendRuntimeRpc({
        response: {
          aiAskError: {
            streamRequestId: payload.streamRequestId,
            error: errorMessage,
          },
        },
      });
      this.sendRuntimeRpc({
        response: {
          aiAsk: {
            requestId: payload.requestId,
            fullText: "",
            error: errorMessage,
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

          const fullText =
            typeof event.payload.fullText === "string" ? event.payload.fullText : "";
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

          const errorMessage =
            typeof event.payload.error === "string" && event.payload.error.length > 0
              ? event.payload.error
              : "AI request failed.";
          rejectOnce(errorMessage);
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
      const message = this.toErrorMessage(error);
      this.logRequestFailure({
        tag: "extensions-sidecar-request-failure",
        channel: "invoke_command",
        requestId: payload.requestId,
        operation: "ai_ask_stream",
        message,
        metadata: {
          streamRequestId: payload.streamRequestId,
        },
      });
      rejectOnce(message);
    }
  }

  private openTarget(target: string, application?: string): void {
    this.emit({ type: "open", target, application });
    void shellOpen(target, application).catch((error) => {
      if (
        typeof window !== "undefined" &&
        (target.startsWith("http://") || target.startsWith("https://"))
      ) {
        window.open(target, "_blank", "noopener,noreferrer");
      }
      this.logRequestFailure({
        tag: "extensions-sidecar-request-failure",
        channel: "open-target",
        operation: "shellOpen",
        message: this.toErrorMessage(error),
        metadata: {
          target,
          application,
        },
      });
    });
  }

  private sendRuntimeRpc(message: RuntimeRpc): void {
    void sendExtensionRuntimeRpc(FOREGROUND_EXTENSION_RUNTIME_ID, message).catch((error) => {
      console.error("[extensions-sidecar] runtime rpc response write failed:", error);
    });
  }

  private handleDecodedMessage(raw: unknown): void {
    const runtimeRender = parseRuntimeRender(raw);
    if (runtimeRender?.kind === "batch") {
      this.applyRuntimeCommands(runtimeRender.commands);
      return;
    }

    if (runtimeRender?.kind === "command") {
      this.applyRuntimeCommands([runtimeRender.command]);
      return;
    }

    if (runtimeRender?.kind === "log") {
      this.emit({ type: "log", payload: runtimeRender.payload });
      return;
    }

    if (runtimeRender?.kind === "error") {
      console.error("[extensions-sidecar] runtime error:", runtimeRender.message, runtimeRender.stack);
      this.emit({
        type: "log",
        payload: {
          message: runtimeRender.message,
          stack: runtimeRender.stack,
        },
      });
      return;
    }

    const runtimeOutput = parseRuntimeOutput(raw);
    if (runtimeOutput?.clearSearchBar) {
      this.emit({ type: "clear-search-bar" });
      return;
    }

    if (runtimeOutput?.updateCommandMetadata) {
      this.emit({
        type: "update-command-metadata",
        subtitle: runtimeOutput.updateCommandMetadata.subtitle,
      });
      return;
    }

    if (runtimeOutput?.openExtensionPreferences) {
      this.emit({
        type: "open-extension-preferences",
        extensionName: runtimeOutput.openExtensionPreferences.extensionName || undefined,
      });
      return;
    }

    if (runtimeOutput?.openCommandPreferences) {
      this.emit({
        type: "open-command-preferences",
        extensionName: runtimeOutput.openCommandPreferences.extensionName || undefined,
        commandName: runtimeOutput.openCommandPreferences.commandName || undefined,
      });
      return;
    }

    if (runtimeOutput?.goBackToPluginList) {
      this.emit({ type: "go-back-to-plugin-list" });
      return;
    }

    if (runtimeOutput?.open) {
      this.openTarget(runtimeOutput.open.target, runtimeOutput.open.application || undefined);
      return;
    }

    if (runtimeOutput?.showHud) {
      this.emit({ type: "show-hud", title: runtimeOutput.showHud.text });
      return;
    }

    if (runtimeOutput?.focusElement) {
      this.emit({ type: "focus-element", elementId: runtimeOutput.focusElement.elementId });
      return;
    }

    if (runtimeOutput?.resetElement) {
      this.emit({ type: "reset-element", elementId: runtimeOutput.resetElement.elementId });
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
      this.handleOauthAuthorize({
        url: runtimeRpc.request.oauthAuthorize.url,
      });
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
      this.handleConfirmAlert({
        requestId: runtimeRpc.request.confirmAlert.requestId,
        title: runtimeRpc.request.confirmAlert.title || undefined,
        message: runtimeRpc.request.confirmAlert.message || undefined,
        primaryActionTitle: runtimeRpc.request.confirmAlert.primaryActionTitle || undefined,
      });
      return;
    }

    if (runtimeRpc?.request?.launchCommand) {
      void this.handleLaunchCommand({
        requestId: runtimeRpc.request.launchCommand.requestId,
        name: runtimeRpc.request.launchCommand.name,
        type: runtimeRpc.request.launchCommand.type || undefined,
        context: toRecord(runtimeRpc.request.launchCommand.context),
        arguments: toRecord(runtimeRpc.request.launchCommand.arguments),
        extensionName: runtimeRpc.request.launchCommand.extensionName || undefined,
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

    console.error("[extensions-sidecar] invalid stdout payload:", raw);
  }

  async start(): Promise<void> {
    if (!isTauri()) {
      throw new Error("desktop runtime is required");
    }
    if (this.runtimeStarted) {
      return;
    }
    if (this.startPromise) {
      return this.startPromise;
    }

    this.startPromise = (async () => {
      if (!this.runtimeMessageUnlisten) {
        this.runtimeMessageUnlisten = await listenToExtensionRuntimeMessages((runtimeId, message) => {
          if (runtimeId !== FOREGROUND_EXTENSION_RUNTIME_ID) {
            return;
          }

          this.handleDecodedMessage(message);
        });
      }

      if (!this.runtimeStderrUnlisten) {
        this.runtimeStderrUnlisten = await listenToExtensionRuntimeStderr((runtimeId, line) => {
          if (runtimeId !== FOREGROUND_EXTENSION_RUNTIME_ID) {
            return;
          }

          console.error("[extensions-sidecar] stderr:", line);
        });
      }

      if (!this.runtimeExitUnlisten) {
        this.runtimeExitUnlisten = await listenToExtensionRuntimeExit((runtimeId) => {
          if (runtimeId !== FOREGROUND_EXTENSION_RUNTIME_ID) {
            return;
          }

          this.runtimeStarted = false;
          this.stopBrowserExtensionStatusPolling();
        });
      }

      await startExtensionRuntime(FOREGROUND_EXTENSION_RUNTIME_ID);
      this.runtimeStarted = true;
      void this.refreshBrowserExtensionConnectionStatus();
      this.startBrowserExtensionStatusPolling();
    })();

    try {
      await this.startPromise;
    } finally {
      this.startPromise = null;
    }
  }

  stop(): void {
    this.runtimeStarted = false;
    this.stopBrowserExtensionStatusPolling();
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
    void stopExtensionRuntime(FOREGROUND_EXTENSION_RUNTIME_ID).catch((error) => {
      console.error("[extensions-sidecar] failed to stop runtime bridge:", error);
    });
  }

  private async writeEvent(event: SidecarEvent): Promise<void> {
    await this.start();
    await sendExtensionRuntimeMessage(FOREGROUND_EXTENSION_RUNTIME_ID, event.action, event.payload);
  }

  private async sendManagerRequest(request: ManagerRequest): Promise<ManagerResponse> {
    await this.start();
    return sendExtensionRuntimeManagerRequest(FOREGROUND_EXTENSION_RUNTIME_ID, request);
  }

  async runPlugin(payload: RunPluginPayload): Promise<void> {
    const response = await this.sendManagerRequest(buildLaunchPluginManagerRequest(payload));
    if (response.error) {
      throw new Error(response.error.message);
    }
  }
}

export const extensionSidecarService = new ExtensionSidecarService();
