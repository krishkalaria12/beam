import { isTauri } from "@tauri-apps/api/core";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { open as shellOpen } from "@tauri-apps/plugin-shell";
import { SidecarMessageWithPluginsSchema, type Command as ProtocolCommand } from "@flare/protocol";
import {
  parseAiAskRequest,
  parseConfirmAlertRequest,
  parseLaunchCommandRequest,
} from "@/modules/extensions/sidecar/custom-message";
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
  decodeManagerResponse,
  encodeManagerRequest,
} from "@/modules/extensions/sidecar/manager-protocol";
import { persistentExtensionRunnerManager } from "@/modules/extensions/background/persistent-runners";
import { isProtocolCommandType } from "@/modules/extensions/sidecar/protocol";
import { useExtensionRuntimeStore } from "@/modules/extensions/runtime/store";
import type { ManagerRequest, ManagerResponse } from "@beam/extension-protocol";

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
  private runtimeMessageUnlisten: UnlistenFn | null = null;
  private runtimeStderrUnlisten: UnlistenFn | null = null;
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

  private applyProtocolCommands(commands: ProtocolCommand[]): void {
    useExtensionRuntimeStore.getState().applyCommands(commands);
  }

  private sendResponse(action: string, payload: Record<string, unknown>): void {
    void this.writeEvent({ action, payload }).catch((error) => {
      console.error("[extensions-sidecar] response write failed:", error);
    });
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

    this.sendResponse("confirm-alert-response", {
      requestId: payload.requestId,
      result: confirmed,
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

        this.sendResponse("launch-command-response", {
          requestId: payload.requestId,
          result: true,
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

      this.sendResponse("launch-command-response", {
        requestId: payload.requestId,
        result: true,
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
      this.sendResponse("launch-command-response", {
        requestId: payload.requestId,
        error: message,
      });
    }
  }

  private sendInvokeCommandResponse(requestId: string, result?: unknown, error?: string): void {
    this.sendResponse("invoke_command-response", { requestId, result, error });
  }

  private sendOauthResponse(
    action:
      | "oauth-get-tokens-response"
      | "oauth-set-tokens-response"
      | "oauth-remove-tokens-response",
    requestId: string,
    result?: unknown,
    error?: string,
  ): void {
    this.sendResponse(action, { requestId, result, error });
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
      this.sendResponse("oauth-authorize-response", {
        state: parsed.state,
        code: parsed.code,
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

    this.sendResponse("oauth-authorize-response", {
      state: resolvedState,
      error: parsed.error,
    });
    return true;
  }

  private async handleOauthGetTokens(payload: {
    requestId: string;
    providerId: string;
  }): Promise<void> {
    try {
      const cached = await invoke("oauth_get_tokens", { providerId: payload.providerId });
      this.sendOauthResponse("oauth-get-tokens-response", payload.requestId, cached);
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
      this.sendOauthResponse("oauth-get-tokens-response", payload.requestId, fallback, message);
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
      this.sendOauthResponse("oauth-set-tokens-response", payload.requestId, true);
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
      this.sendOauthResponse("oauth-set-tokens-response", payload.requestId, true, message);
    }
  }

  private async handleOauthRemoveTokens(payload: {
    requestId: string;
    providerId: string;
  }): Promise<void> {
    try {
      await invoke("oauth_remove_tokens", { providerId: payload.providerId });
      this.sendOauthResponse("oauth-remove-tokens-response", payload.requestId, true);
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
      this.sendOauthResponse("oauth-remove-tokens-response", payload.requestId, true, message);
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
      this.sendResponse("browser-extension-response", {
        requestId: payload.requestId,
        result,
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
      this.sendResponse("browser-extension-response", {
        requestId: payload.requestId,
        error: message,
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
      this.sendResponse("ai-ask-response", {
        requestId: payload.requestId,
        result: { fullText },
      });
    };

    const rejectOnce = (errorMessage: string) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      this.sendResponse("ai-ask-error", {
        streamRequestId: payload.streamRequestId,
        error: errorMessage,
      });
      this.sendResponse("ai-ask-response", {
        requestId: payload.requestId,
        error: errorMessage,
      });
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

          const fullText =
            typeof event.payload.fullText === "string" ? event.payload.fullText : "";
          this.sendResponse("ai-ask-end", {
            streamRequestId: payload.streamRequestId,
            fullText,
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

  private handleDecodedMessage(raw: unknown): void {
    const confirmAlertRequest = parseConfirmAlertRequest(raw);
    if (confirmAlertRequest) {
      this.handleConfirmAlert(confirmAlertRequest);
      return;
    }

    const launchCommandRequest = parseLaunchCommandRequest(raw);
    if (launchCommandRequest) {
      void this.handleLaunchCommand(launchCommandRequest);
      return;
    }

    const aiAskRequest = parseAiAskRequest(raw);
    if (aiAskRequest) {
      void this.handleAiAsk(aiAskRequest);
      return;
    }

    if (raw && typeof raw === "object" && "type" in raw) {
      const message = raw as { type?: unknown; payload?: unknown };
      if (message.type === "clear-search-bar") {
        this.emit({ type: "clear-search-bar" });
        return;
      }
      if (message.type === "update-command-metadata") {
        const payload = message.payload as { subtitle?: unknown } | undefined;
        const subtitle =
          typeof payload?.subtitle === "string"
            ? payload.subtitle
            : payload?.subtitle === null
              ? undefined
              : undefined;
        this.emit({ type: "update-command-metadata", subtitle });
        return;
      }
      if (message.type === "open-extension-preferences") {
        const payload = message.payload as { extensionName?: unknown } | undefined;
        this.emit({
          type: "open-extension-preferences",
          extensionName: typeof payload?.extensionName === "string" ? payload.extensionName : undefined,
        });
        return;
      }
      if (message.type === "open-command-preferences") {
        const payload = message.payload as { extensionName?: unknown; commandName?: unknown } | undefined;
        this.emit({
          type: "open-command-preferences",
          extensionName: typeof payload?.extensionName === "string" ? payload.extensionName : undefined,
          commandName: typeof payload?.commandName === "string" ? payload.commandName : undefined,
        });
        return;
      }
    }

    if (
      raw &&
      typeof raw === "object" &&
      "type" in raw &&
      (raw as { type?: unknown }).type === "error"
    ) {
      const message = (raw as { payload?: unknown }).payload;
      console.error("[extensions-sidecar] runtime error:", message);
      this.emit({ type: "log", payload: message });
      return;
    }

    const parsed = SidecarMessageWithPluginsSchema.safeParse(raw);
    if (!parsed.success) {
      console.error("[extensions-sidecar] invalid stdout payload:", parsed.error.issues);
      return;
    }

    const message = parsed.data;

    if (message.type === "BATCH_UPDATE") {
      this.applyProtocolCommands(message.payload);
      return;
    }

    if (isProtocolCommandType(message.type)) {
      this.applyProtocolCommands([message as ProtocolCommand]);
      return;
    }

    switch (message.type) {
      case "go-back-to-plugin-list":
        this.emit({ type: "go-back-to-plugin-list" });
        return;
      case "open":
        this.openTarget(message.payload.target, message.payload.application);
        return;
      case "invoke_command":
        void this.handleInvokeCommand({
          requestId: message.payload.requestId,
          command: message.payload.command,
          params:
            message.payload.params && typeof message.payload.params === "object"
              ? (message.payload.params as Record<string, unknown>)
              : undefined,
        });
        return;
      case "browser-extension-request":
        void this.handleBrowserExtensionRequest(message.payload);
        return;
      case "oauth-authorize":
        this.handleOauthAuthorize({
          url: message.payload.url,
        });
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
        this.emit({ type: "show-hud", title: message.payload.title });
        this.emit({
          type: "log",
          payload: {
            tag: "extensions-sidecar-hud-fallback",
            operation: "show_hud",
            message: "Handled via frontend HUD fallback",
            metadata: {
              title: message.payload.title,
            },
          },
        });
        return;
      case "FOCUS_ELEMENT":
        this.emit({ type: "focus-element", elementId: message.payload.elementId });
        return;
      case "RESET_ELEMENT":
        this.emit({ type: "reset-element", elementId: message.payload.elementId });
        return;
      case "log":
        this.emit({ type: "log", payload: message.payload });
        return;
      default:
        return;
    }
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
        this.runtimeMessageUnlisten = await listen("extension-runtime-message", (event) => {
          this.handleDecodedMessage(event.payload);
        });
      }

      if (!this.runtimeStderrUnlisten) {
        this.runtimeStderrUnlisten = await listen<string>("extension-runtime-stderr", (event) => {
          if (typeof event.payload === "string" && event.payload.trim().length > 0) {
            console.error("[extensions-sidecar] stderr:", event.payload);
          }
        });
      }

      await invoke("extension_runtime_start");
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
    void invoke("extension_runtime_stop").catch((error) => {
      console.error("[extensions-sidecar] failed to stop runtime bridge:", error);
    });
  }

  private async writeEvent(event: SidecarEvent): Promise<void> {
    await this.start();
    await invoke("extension_runtime_send_message", {
      action: event.action,
      payload: event.payload,
    });
  }

  private async sendManagerRequest(request: ManagerRequest): Promise<ManagerResponse> {
    await this.start();
    const response = await invoke<number[]>("extension_runtime_send_manager_request", {
      request: encodeManagerRequest(request),
    });
    return decodeManagerResponse(response);
  }

  async runPlugin(payload: RunPluginPayload): Promise<void> {
    const response = await this.sendManagerRequest(buildLaunchPluginManagerRequest(payload));
    if (response.error) {
      throw new Error(response.error.message);
    }
  }
}

export const extensionSidecarService = new ExtensionSidecarService();
