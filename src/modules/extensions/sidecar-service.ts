import { isTauri } from "@tauri-apps/api/core";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { appCacheDir, appLocalDataDir } from "@tauri-apps/api/path";
import { Command, open as shellOpen, type Child } from "@tauri-apps/plugin-shell";
import { SidecarMessageWithPluginsSchema, type Command as ProtocolCommand } from "@flare/protocol";
import { Unpackr } from "msgpackr";
import { inflate } from "pako";
import { useExtensionRuntimeStore } from "@/modules/extensions/runtime/store";

type ExtensionMode = "view" | "no-view";

interface RunPluginPayload {
  pluginPath: string;
  mode: ExtensionMode;
  aiAccessStatus: boolean;
}

interface SidecarEvent {
  action: string;
  payload: Record<string, unknown> | RunPluginPayload;
}

interface DiscoveredPluginRecord {
  title: string;
  description?: string;
  pluginTitle: string;
  pluginName: string;
  commandName: string;
  pluginPath: string;
  mode: ExtensionMode;
}

export type ExtensionSidecarMessageEvent =
  | { type: "go-back-to-plugin-list" }
  | { type: "open"; target: string; application?: string }
  | { type: "focus-element"; elementId: number }
  | { type: "reset-element"; elementId: number }
  | { type: "show-hud"; title: string }
  | { type: "log"; payload: unknown };

type SidecarEventListener = (event: ExtensionSidecarMessageEvent) => void;

const PROTOCOL_COMMAND_TYPES = new Set<ProtocolCommand["type"]>([
  "CREATE_INSTANCE",
  "CREATE_TEXT_INSTANCE",
  "APPEND_CHILD",
  "INSERT_BEFORE",
  "REMOVE_CHILD",
  "UPDATE_PROPS",
  "UPDATE_TEXT",
  "REPLACE_CHILDREN",
  "CLEAR_CONTAINER",
  "SHOW_TOAST",
  "UPDATE_TOAST",
  "HIDE_TOAST",
  "DEFINE_PROPS_TEMPLATE",
  "APPLY_PROPS_TEMPLATE",
]);

function isProtocolCommandType(value: string): value is ProtocolCommand["type"] {
  return PROTOCOL_COMMAND_TYPES.has(value as ProtocolCommand["type"]);
}

function toByteChunk(data: unknown): Uint8Array<ArrayBufferLike> {
  if (data instanceof Uint8Array) {
    return data;
  }
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }
  if (Array.isArray(data)) {
    return Uint8Array.from(data);
  }
  if (typeof data === "string") {
    return new TextEncoder().encode(data);
  }
  if (
    data &&
    typeof data === "object" &&
    "data" in data &&
    Array.isArray((data as { data?: unknown }).data)
  ) {
    return Uint8Array.from((data as { data: number[] }).data);
  }
  if (
    data &&
    typeof data === "object" &&
    "buffer" in data &&
    (data as { buffer?: unknown }).buffer instanceof ArrayBuffer
  ) {
    const view = data as { buffer: ArrayBuffer; byteOffset?: number; byteLength?: number };
    const offset = view.byteOffset ?? 0;
    const length = view.byteLength ?? view.buffer.byteLength;
    return new Uint8Array(view.buffer, offset, length);
  }

  return new Uint8Array(0);
}

function concatChunks(
  left: Uint8Array<ArrayBufferLike>,
  right: Uint8Array<ArrayBufferLike>,
): Uint8Array<ArrayBufferLike> {
  if (left.length === 0) {
    return right;
  }
  if (right.length === 0) {
    return left;
  }

  const merged = new Uint8Array(left.length + right.length) as Uint8Array<ArrayBufferLike>;
  merged.set(left, 0);
  merged.set(right, left.length);
  return merged;
}

const textDecoder = new TextDecoder();

function decodeTextPayload(data: unknown): string {
  if (typeof data === "string") {
    return data;
  }

  const chunk = toByteChunk(data);
  if (chunk.length > 0) {
    return textDecoder.decode(chunk).trim();
  }

  return String(data);
}

class ExtensionSidecarService {
  private child: Child | null = null;
  private startPromise: Promise<void> | null = null;
  private unpackr = new Unpackr();
  private pendingStdout: Uint8Array<ArrayBufferLike> = new Uint8Array(0);
  private listeners = new Set<SidecarEventListener>();
  private oauthTokenStore = new Map<string, Record<string, unknown>>();
  private aiEventUnlisteners: Array<() => void> = [];
  private pendingOauthStates = new Set<string>();
  private pendingPreferenceResolvers = new Map<
    string,
    Array<(values: Record<string, unknown>) => void>
  >();

  subscribe(listener: SidecarEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  dispatchEvent(instanceId: number, handlerName: string, args: unknown[] = []): void {
    this.writeEvent({
      action: "dispatch-event",
      payload: {
        instanceId,
        handlerName,
        args,
      },
    });
  }

  private requestPreferences(pluginName: string): void {
    this.writeEvent({
      action: "get-preferences",
      payload: { pluginName },
    });
  }

  private writePreferences(pluginName: string, values: Record<string, unknown>): void {
    this.writeEvent({
      action: "set-preferences",
      payload: { pluginName, values },
    });
  }

  async getPreferences(pluginName: string): Promise<Record<string, unknown>> {
    await this.start();

    return await new Promise<Record<string, unknown>>((resolve) => {
      const pending = this.pendingPreferenceResolvers.get(pluginName) ?? [];
      this.pendingPreferenceResolvers.set(pluginName, [...pending, resolve]);
      this.requestPreferences(pluginName);
    });
  }

  async setPreferences(pluginName: string, values: Record<string, unknown>): Promise<void> {
    await this.start();
    this.writePreferences(pluginName, values);
  }

  popView(): void {
    this.writeEvent({
      action: "pop-view",
      payload: {},
    });
  }

  dispatchToastAction(toastId: number, actionType: "primary" | "secondary"): void {
    this.writeEvent({
      action: "dispatch-toast-action",
      payload: {
        toastId,
        actionType,
      },
    });
  }

  triggerToastHide(toastId: number): void {
    this.writeEvent({
      action: "trigger-toast-hide",
      payload: {
        toastId,
      },
    });
  }

  private emit(event: ExtensionSidecarMessageEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private applyProtocolCommands(commands: ProtocolCommand[]): void {
    useExtensionRuntimeStore.getState().applyCommands(commands);
  }

  private async setupAiEventListeners(): Promise<void> {
    try {
      const chunkUnlisten = await listen("ai-stream-chunk", (event) => {
        this.writeEvent({
          action: "ai-stream-chunk",
          payload: event.payload as Record<string, unknown>,
        });
      });
      const endUnlisten = await listen("ai-stream-end", (event) => {
        this.writeEvent({
          action: "ai-stream-end",
          payload: event.payload as Record<string, unknown>,
        });
      });
      const errorUnlisten = await listen("ai-stream-error", (event) => {
        this.writeEvent({
          action: "ai-stream-error",
          payload: event.payload as Record<string, unknown>,
        });
      });

      this.aiEventUnlisteners.push(chunkUnlisten, endUnlisten, errorUnlisten);
    } catch (error) {
      console.error("[extensions-sidecar] failed to bind AI event listeners:", error);
    }
  }

  private sendResponse(action: string, payload: Record<string, unknown>): void {
    this.writeEvent({ action, payload });
  }

  private normalizeDiscoveredPluginRecord(value: unknown): DiscoveredPluginRecord | null {
    if (!value || typeof value !== "object") {
      return null;
    }

    const record = value as Record<string, unknown>;
    const pluginPathRaw = record.pluginPath ?? record.plugin_path;
    const commandNameRaw = record.commandName ?? record.command_name;
    const pluginNameRaw = record.pluginName ?? record.plugin_name;
    const pluginTitleRaw = record.pluginTitle ?? record.plugin_title;
    const titleRaw = record.title;
    const modeRaw = typeof record.mode === "string" ? record.mode.trim().toLowerCase() : "view";

    if (
      typeof pluginPathRaw !== "string" ||
      typeof commandNameRaw !== "string" ||
      typeof pluginNameRaw !== "string"
    ) {
      return null;
    }

    return {
      pluginPath: pluginPathRaw,
      commandName: commandNameRaw,
      pluginName: pluginNameRaw,
      pluginTitle: typeof pluginTitleRaw === "string" ? pluginTitleRaw : pluginNameRaw,
      title: typeof titleRaw === "string" ? titleRaw : commandNameRaw,
      description: typeof record.description === "string" ? record.description : undefined,
      mode: modeRaw === "no-view" ? "no-view" : "view",
    };
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
    extensionName?: string;
  }): Promise<void> {
    try {
      const discoveredRaw = await invoke<unknown>("get_discovered_plugins");
      if (!Array.isArray(discoveredRaw)) {
        throw new Error("invalid plugin discovery response");
      }

      const discovered = discoveredRaw
        .map((entry) => this.normalizeDiscoveredPluginRecord(entry))
        .filter((entry): entry is DiscoveredPluginRecord => entry !== null);

      const requestedCommand = payload.name.trim();
      const requestedPluginName = (payload.extensionName ?? "").trim();

      const command =
        discovered.find(
          (entry) =>
            entry.commandName === requestedCommand &&
            requestedPluginName.length > 0 &&
            entry.pluginName === requestedPluginName,
        ) ??
        discovered.find((entry) => entry.commandName === requestedCommand);

      if (!command) {
        throw new Error(`command "${payload.name}" was not found`);
      }

      useExtensionRuntimeStore.getState().resetForNewPlugin({
        pluginPath: command.pluginPath,
        pluginMode: command.mode,
        title: command.title,
        subtitle: [command.pluginTitle, command.description ?? ""]
          .filter((part) => part.trim().length > 0)
          .join(" - ") || undefined,
      });

      await this.runPlugin({
        pluginPath: command.pluginPath,
        mode: command.mode,
        aiAccessStatus: false,
      });

      this.sendResponse("launch-command-response", {
        requestId: payload.requestId,
        result: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
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
    action: "oauth-get-tokens-response" | "oauth-set-tokens-response" | "oauth-remove-tokens-response",
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
      const message = error instanceof Error ? error.message : String(error);
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
    let urlObj: URL;
    try {
      urlObj = new URL(url);
    } catch {
      return false;
    }

    const isRaycastScheme = urlObj.protocol === "raycast:";
    const isRaycastRedirect =
      (urlObj.protocol === "https:" || urlObj.protocol === "http:") &&
      urlObj.hostname === "raycast.com" &&
      urlObj.pathname.startsWith("/redirect");

    if (!isRaycastScheme && !isRaycastRedirect) {
      return false;
    }

    const isOauthCallback =
      urlObj.host === "oauth" ||
      urlObj.pathname.startsWith("/redirect");

    if (!isOauthCallback) {
      return false;
    }

    if (!this.child) {
      return false;
    }

    const code = urlObj.searchParams.get("code");
    const state = urlObj.searchParams.get("state");

    if (state) {
      this.pendingOauthStates.delete(state);
    }

    if (code && state) {
      this.sendResponse("oauth-authorize-response", {
        state,
        code,
      });
      return true;
    }

    const error = urlObj.searchParams.get("error") || "Unknown OAuth error";
    const description = urlObj.searchParams.get("error_description");
    this.sendResponse("oauth-authorize-response", {
      state,
      error: description ? `${error}: ${description}` : error,
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
      const message = error instanceof Error ? error.message : String(error);
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
      const message = error instanceof Error ? error.message : String(error);
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
      const message = error instanceof Error ? error.message : String(error);
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
      const message = error instanceof Error ? error.message : String(error);
      this.sendResponse("browser-extension-response", {
        requestId: payload.requestId,
        error: message,
      });
    }
  }

  private async handleAiCanAccess(payload: { requestId: string }): Promise<void> {
    try {
      const result = await invoke("ai_can_access");
      this.sendResponse("ai-can-access-response", {
        requestId: payload.requestId,
        result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.sendResponse("ai-can-access-response", {
        requestId: payload.requestId,
        error: message,
      });
    }
  }

  private async handleAiAskStream(payload: {
    requestId: string;
    prompt: string;
    options?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await invoke("ai_ask_stream", {
        requestId: payload.requestId,
        prompt: payload.prompt,
        options: {
          model: payload.options?.model,
          creativity: payload.options?.creativity,
          model_mappings:
            payload.options &&
              typeof payload.options.modelMappings === "object" &&
              payload.options.modelMappings
              ? payload.options.modelMappings
              : {},
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.sendResponse("ai-stream-error", {
        requestId: payload.requestId,
        error: message,
      });
    }
  }

  private openTarget(target: string, application?: string): void {
    this.emit({ type: "open", target, application });
    void shellOpen(target, application).catch((error) => {
      if (typeof window !== "undefined" && (target.startsWith("http://") || target.startsWith("https://"))) {
        window.open(target, "_blank", "noopener,noreferrer");
      }
      console.error("[extensions-sidecar] failed to open target:", error);
    });
  }

  private handleDecodedMessage(raw: unknown): void {
    if (raw && typeof raw === "object" && "type" in raw) {
      const custom = raw as { type?: unknown; payload?: unknown };

      if (custom.type === "confirm-alert") {
        const payload =
          custom.payload && typeof custom.payload === "object"
            ? (custom.payload as Record<string, unknown>)
            : {};
        const requestId = typeof payload.requestId === "string" ? payload.requestId : "";
        if (!requestId) {
          return;
        }

        this.handleConfirmAlert({
          requestId,
          title: typeof payload.title === "string" ? payload.title : undefined,
          message: typeof payload.message === "string" ? payload.message : undefined,
          primaryActionTitle:
            typeof payload.primaryActionTitle === "string"
              ? payload.primaryActionTitle
              : undefined,
        });
        return;
      }

      if (custom.type === "launch-command") {
        const payload =
          custom.payload && typeof custom.payload === "object"
            ? (custom.payload as Record<string, unknown>)
            : {};
        const requestId = typeof payload.requestId === "string" ? payload.requestId : "";
        const name = typeof payload.name === "string" ? payload.name : "";
        if (!requestId || !name) {
          return;
        }

        void this.handleLaunchCommand({
          requestId,
          name,
          type: typeof payload.type === "string" ? payload.type : undefined,
          context:
            payload.context && typeof payload.context === "object"
              ? (payload.context as Record<string, unknown>)
              : undefined,
          extensionName:
            typeof payload.extensionName === "string" ? payload.extensionName : undefined,
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
      case "ai-can-access":
        void this.handleAiCanAccess(message.payload);
        return;
      case "ai-ask-stream":
        void this.handleAiAskStream({
          requestId: message.payload.requestId,
          prompt: message.payload.prompt,
          options:
            message.payload.options && typeof message.payload.options === "object"
              ? (message.payload.options as Record<string, unknown>)
              : undefined,
        });
        return;
      case "SHOW_HUD":
        this.emit({ type: "show-hud", title: message.payload.title });
        void invoke("show_hud", { title: message.payload.title }).catch(() => {
          // Keep renderer resilient when HUD API is unavailable.
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
      case "plugin-list":
      case "preference-values":
      case "ai-stream-chunk":
      case "ai-stream-end":
      case "ai-stream-error":
        if (message.type === "preference-values") {
          const pluginName = message.payload.pluginName;
          const pendingResolvers = this.pendingPreferenceResolvers.get(pluginName) ?? [];
          if (pendingResolvers.length > 0) {
            this.pendingPreferenceResolvers.delete(pluginName);
            for (const resolve of pendingResolvers) {
              resolve(message.payload.values);
            }
          }
        }
        return;
      default:
        return;
    }
  }

  private consumeStdoutChunk(data: unknown): void {
    const chunk = toByteChunk(data);
    if (chunk.length === 0) {
      return;
    }

    this.pendingStdout = concatChunks(this.pendingStdout, chunk);
    while (this.pendingStdout.length >= 4) {
      const headerView = new DataView(
        this.pendingStdout.buffer,
        this.pendingStdout.byteOffset,
        4,
      );
      const headerValue = headerView.getUint32(0, false);
      const isCompressed = (headerValue & 0x8000_0000) !== 0;
      const payloadLength = headerValue & 0x7fff_ffff;
      const totalLength = 4 + payloadLength;

      if (this.pendingStdout.length < totalLength) {
        break;
      }

      const payloadSlice = this.pendingStdout.slice(4, totalLength);
      this.pendingStdout = this.pendingStdout.slice(totalLength);

      let decodedBytes: Uint8Array<ArrayBufferLike> = payloadSlice;
      if (isCompressed) {
        try {
          decodedBytes = inflate(payloadSlice) as Uint8Array<ArrayBufferLike>;
        } catch (error) {
          console.error("[extensions-sidecar] failed to inflate payload:", error);
          continue;
        }
      }

      try {
        const unpacked = this.unpackr.unpack(decodedBytes);
        this.handleDecodedMessage(unpacked);
      } catch (error) {
        console.error("[extensions-sidecar] failed to decode payload:", error);
      }
    }
  }

  private resetStreamState(): void {
    this.pendingStdout = new Uint8Array(0);
  }

  async start(): Promise<void> {
    if (!isTauri()) {
      throw new Error("desktop runtime is required");
    }
    if (this.child) {
      return;
    }
    if (this.startPromise) {
      return this.startPromise;
    }

    this.startPromise = (async () => {
      this.resetStreamState();
      const args = [
        `--data-dir=${await appLocalDataDir()}`,
        `--cache-dir=${await appCacheDir()}`,
      ];

      const command = Command.sidecar("binaries/app", args, {
        encoding: "raw",
      });

      command.stdout.on("data", (chunk: unknown) => {
        this.consumeStdoutChunk(chunk);
      });
      command.stderr.on("data", (line: unknown) => {
        const stderr = decodeTextPayload(line);
        if (stderr.length > 0) {
          console.error("[extensions-sidecar] stderr:", stderr);
        }
      });

      this.child = await command.spawn();
      void this.setupAiEventListeners();
    })();

    try {
      await this.startPromise;
    } finally {
      this.startPromise = null;
    }
  }

  stop(): void {
    if (!this.child) {
      return;
    }

    this.child.kill();
    this.child = null;
    this.resetStreamState();
    for (const unlisten of this.aiEventUnlisteners) {
      unlisten();
    }
    this.aiEventUnlisteners = [];
  }

  private writeEvent(event: SidecarEvent): void {
    if (!this.child) {
      throw new Error("extensions sidecar is not running");
    }

    this.child.write(`${JSON.stringify(event)}\n`);
  }

  async runPlugin(payload: RunPluginPayload): Promise<void> {
    await this.start();
    this.writeEvent({
      action: "run-plugin",
      payload,
    });
  }
}

export const extensionSidecarService = new ExtensionSidecarService();
