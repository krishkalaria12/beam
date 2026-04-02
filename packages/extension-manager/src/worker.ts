import { BridgeMessageKind, readBridgeMessageEnvelope } from "@beam/extension-protocol";
import { writeLog, writeOutput } from "./io";
import { instances, navigationStack, toasts, browserExtensionState } from "./state";
import { batchedUpdates, updateContainer } from "./reconciler";
import type { FlareInstance } from "./types";
import { handleResponse } from "./api/rpc";
import { handleOAuthResponse } from "./api/oauth";
import { handleAskStreamChunk, handleAskStreamEnd, handleAskStreamError } from "./api/ai";
import {
  createAckResponse,
  createErrorResponse,
  createManagerResponseOutput,
  isPopViewEvent,
  parseManagerRequestPayload,
  toLaunchMode,
  toLaunchType,
  withRequestId,
} from "./protocol/manager";
import { writeRuntimeOutput } from "./protocol/runtime-output";
import { writeRuntimeRenderErrorMessage } from "./protocol/runtime-render";
import { parseRuntimeRpcInput } from "./protocol/runtime-rpc";
import loadNoViewCommand from "./loaders/load-no-view-command";
import loadViewCommand from "./loaders/load-view-command";

const reportRuntimeError = (err: unknown): void => {
  const error =
    err instanceof Error ? { message: err.message, stack: err.stack } : { message: String(err) };
  writeLog(`ERROR: ${error.message} \n ${error.stack ?? ""}`);
  writeRuntimeRenderErrorMessage(error);
};

const handlePopView = (): void => {
  const previousElement = navigationStack.pop();
  if (previousElement) {
    updateContainer(previousElement);
  } else {
    writeRuntimeOutput({ goBackToPluginList: {} });
  }
};

const handleDispatchEvent = (payload: {
  instanceId: number;
  handlerName: string;
  args: unknown[];
}): void => {
  const instance = instances.get(payload.instanceId);
  if (!instance) {
    writeLog(`Instance ${payload.instanceId} not found.`);
    return;
  }

  if (!("props" in instance)) {
    return;
  }

  const flareInstance = instance as FlareInstance;
  const props = flareInstance._unserializedProps;
  const handler = props?.[payload.handlerName];

  if (typeof handler === "function") {
    handler(...payload.args);
  } else {
    writeLog(
      `Handler ${payload.handlerName} not found or not a function on instance ${payload.instanceId}`,
    );
  }
};

const handleDispatchToastAction = (payload: {
  toastId: number;
  actionType: "primary" | "secondary";
}): void => {
  const toast = toasts.get(payload.toastId);
  if (!toast) {
    return;
  }

  const action = payload.actionType === "primary" ? toast.primaryAction : toast.secondaryAction;
  action?.onAction?.(toast);
};

const handleTriggerToastHide = (payload: { toastId: number }): void => {
  toasts.get(payload.toastId)?.hide();
};

const launchPlugin = (request: ReturnType<typeof parseManagerRequestPayload>) => {
  if (!request.launchPlugin) {
    throw new Error("Missing launchPlugin payload.");
  }

  const mode = toLaunchMode(request.launchPlugin.mode);
  const loadCommand = mode === "no-view" ? loadNoViewCommand : loadViewCommand;

  return loadCommand({
    pluginPath: request.launchPlugin.pluginPath,
    mode,
    aiAccessStatus: request.launchPlugin.aiAccess,
    launchArguments: request.launchPlugin.launchArguments ?? undefined,
    launchContext: request.launchPlugin.launchContext ?? undefined,
    launchType: toLaunchType(request.launchPlugin.launchType),
    commandName: request.launchPlugin.commandName || undefined,
  });
};

let handlersInstalled = false;

function ensureProcessHandlers(): void {
  if (handlersInstalled) {
    return;
  }

  handlersInstalled = true;

  process.on("unhandledRejection", (reason: unknown) => {
    writeLog(`--- UNHANDLED PROMISE REJECTION ---`);
    const stack = reason && typeof reason === "object" && "stack" in reason ? reason.stack : reason;
    writeLog(stack);
  });

  process.on("uncaughtException", (error: Error) => {
    reportRuntimeError(error);
    process.exitCode = 1;
    setImmediate(() => {
      process.exit(1);
    });
  });
}

export function handleBridgePayload(raw: unknown): void {
  batchedUpdates(() => {
    try {
      const command = readBridgeMessageEnvelope(raw);

      if (!command) {
        writeLog("Received invalid bridge payload from host.");
        return;
      }

      if (command.kind === BridgeMessageKind.RuntimeRpc) {
        const rpc = parseRuntimeRpcInput(command);
        if (!rpc?.response) {
          writeLog("Received invalid runtime-rpc payload from host.");
          return;
        }

        if (rpc.response.oauthAuthorize) {
          handleOAuthResponse(
            rpc.response.oauthAuthorize.state || undefined,
            rpc.response.oauthAuthorize.code || undefined,
            rpc.response.oauthAuthorize.error || undefined,
          );
          return;
        }

        if (rpc.response.invokeCommand) {
          handleResponse(
            rpc.response.invokeCommand.requestId,
            rpc.response.invokeCommand.result,
            rpc.response.invokeCommand.error || undefined,
          );
          return;
        }

        if (rpc.response.browserExtension) {
          handleResponse(
            rpc.response.browserExtension.requestId,
            rpc.response.browserExtension.result,
            rpc.response.browserExtension.error || undefined,
          );
          return;
        }

        if (rpc.response.oauthGetTokens) {
          handleResponse(
            rpc.response.oauthGetTokens.requestId,
            rpc.response.oauthGetTokens.result,
            rpc.response.oauthGetTokens.error || undefined,
          );
          return;
        }

        if (rpc.response.oauthSetTokens) {
          handleResponse(
            rpc.response.oauthSetTokens.requestId,
            rpc.response.oauthSetTokens.ok,
            rpc.response.oauthSetTokens.error || undefined,
          );
          return;
        }

        if (rpc.response.oauthRemoveTokens) {
          handleResponse(
            rpc.response.oauthRemoveTokens.requestId,
            rpc.response.oauthRemoveTokens.ok,
            rpc.response.oauthRemoveTokens.error || undefined,
          );
          return;
        }

        if (rpc.response.confirmAlert) {
          handleResponse(
            rpc.response.confirmAlert.requestId,
            rpc.response.confirmAlert.confirmed,
            rpc.response.confirmAlert.error || undefined,
          );
          return;
        }

        if (rpc.response.launchCommand) {
          handleResponse(
            rpc.response.launchCommand.requestId,
            rpc.response.launchCommand.ok,
            rpc.response.launchCommand.error || undefined,
          );
          return;
        }

        if (rpc.response.aiAsk) {
          handleResponse(
            rpc.response.aiAsk.requestId,
            { fullText: rpc.response.aiAsk.fullText },
            rpc.response.aiAsk.error || undefined,
          );
          return;
        }

        if (rpc.response.aiAskChunk) {
          handleAskStreamChunk(
            rpc.response.aiAskChunk.streamRequestId,
            rpc.response.aiAskChunk.chunk,
          );
          return;
        }

        if (rpc.response.aiAskEnd) {
          handleAskStreamEnd(rpc.response.aiAskEnd.streamRequestId, rpc.response.aiAskEnd.fullText);
          return;
        }

        if (rpc.response.aiAskError) {
          handleAskStreamError(
            rpc.response.aiAskError.streamRequestId,
            rpc.response.aiAskError.error,
          );
          return;
        }

        writeLog("Received unsupported runtime-rpc response from host.");
        return;
      }

      if (command.kind === BridgeMessageKind.ManagerRequest) {
        const request = parseManagerRequestPayload(command.payload);

        if (request.launchPlugin) {
          writeOutput(
            createManagerResponseOutput(withRequestId(createAckResponse(), request.requestId)),
          );
          void launchPlugin(request).catch(reportRuntimeError);
          return;
        }

        if (request.dispatchViewEvent) {
          handleDispatchEvent({
            instanceId: request.dispatchViewEvent.instanceId,
            handlerName: request.dispatchViewEvent.handlerName,
            args: request.dispatchViewEvent.args ?? [],
          });
          writeOutput(
            createManagerResponseOutput(withRequestId(createAckResponse(), request.requestId)),
          );
          return;
        }

        if (request.runtimeEvent) {
          if (request.runtimeEvent.shutdown) {
            writeOutput(
              createManagerResponseOutput(withRequestId(createAckResponse(), request.requestId)),
            );
            process.exit(0);
            return;
          }

          if (isPopViewEvent(request.runtimeEvent)) {
            handlePopView();
            writeOutput(
              createManagerResponseOutput(withRequestId(createAckResponse(), request.requestId)),
            );
            return;
          }

          writeOutput(
            createManagerResponseOutput(
              withRequestId(
                createErrorResponse("Unsupported runtime event in manager request."),
                request.requestId,
              ),
            ),
          );
          return;
        }

        if (request.dispatchToastAction) {
          handleDispatchToastAction({
            toastId: request.dispatchToastAction.toastId,
            actionType:
              request.dispatchToastAction.actionType === "secondary" ? "secondary" : "primary",
          });
          writeOutput(
            createManagerResponseOutput(withRequestId(createAckResponse(), request.requestId)),
          );
          return;
        }

        if (request.triggerToastHide) {
          handleTriggerToastHide({ toastId: request.triggerToastHide.toastId });
          writeOutput(
            createManagerResponseOutput(withRequestId(createAckResponse(), request.requestId)),
          );
          return;
        }

        if (request.setBrowserExtensionConnectionStatus) {
          browserExtensionState.isConnected =
            request.setBrowserExtensionConnectionStatus.isConnected;
          writeOutput(
            createManagerResponseOutput(withRequestId(createAckResponse(), request.requestId)),
          );
          return;
        }

        writeOutput(
          createManagerResponseOutput(
            withRequestId(createErrorResponse("Unsupported manager request."), request.requestId),
          ),
        );
        return;
      }

      writeLog(`Unknown command kind: ${command.kind}`);
    } catch (err: unknown) {
      reportRuntimeError(err);
    }
  });
}

export function initializeWorkerRuntime(): void {
  ensureProcessHandlers();
}
