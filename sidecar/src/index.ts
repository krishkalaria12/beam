import { createInterface } from "readline";
import { writeLog, writeOutput } from "./io";
import { runPlugin } from "./plugin";
import { instances, navigationStack, toasts, browserExtensionState } from "./state";
import { batchedUpdates, updateContainer } from "./reconciler";
import { preferencesStore } from "./preferences";
import type { FlareInstance } from "./types";
import { handleResponse } from "./api/rpc";
import { handleOAuthResponse, handleTokenResponse } from "./api/oauth";
import { handleAskStreamChunk, handleAskStreamEnd, handleAskStreamError } from "./api/ai";
import {
  createAckResponse,
  createErrorResponse,
  createGetPreferencesResponse,
  createManagerResponseOutput,
  createSetPreferencesResponse,
  isPopViewEvent,
  parseManagerRequestPayload,
  toLaunchMode,
  toLaunchType,
  withRequestId,
} from "./protocol/manager";

const reportRuntimeError = (err: unknown): void => {
  const error =
    err instanceof Error
      ? { message: err.message, stack: err.stack }
      : { message: String(err) };
  writeLog(`ERROR: ${error.message} \n ${error.stack ?? ""}`);
  writeOutput({ type: "error", payload: error.message });
};

process.on("unhandledRejection", (reason: unknown) => {
  writeLog(`--- UNHANDLED PROMISE REJECTION ---`);
  const stack = reason && typeof reason === "object" && "stack" in reason ? reason.stack : reason;
  writeLog(stack);
});

const rl = createInterface({ input: process.stdin });

const handlePopView = (): void => {
  const previousElement = navigationStack.pop();
  if (previousElement) {
    updateContainer(previousElement);
  } else {
    writeOutput({ type: "go-back-to-plugin-list", payload: {} });
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

rl.on("line", (line) => {
  batchedUpdates(() => {
    try {
      const command: { action: string; payload: unknown } = JSON.parse(line);

      if (command.action.endsWith("-response")) {
        if (command.action === "oauth-authorize-response") {
          const { state, code, error } = command.payload as {
            state?: string;
            code?: string;
            error?: string;
          };
          handleOAuthResponse(state, code, error);
          return;
        }

        const { requestId, result, error } = command.payload as {
          requestId?: string;
          result?: unknown;
          error?: string;
        };
        if (!requestId) {
          writeLog(`Missing requestId for response action: ${command.action}`);
          return;
        }

        if (command.action.startsWith("oauth-")) {
          handleTokenResponse(requestId, result, error);
        } else {
          handleResponse(requestId, result, error);
        }
        return;
      }

      if (command.action === "manager-request") {
        const request = parseManagerRequestPayload(command.payload);

        if (request.ping) {
          writeOutput(
            createManagerResponseOutput(
              withRequestId(
                {
                  requestId: "",
                  ping: {
                    ok: true,
                  },
                },
                request.requestId,
              ),
            ),
          );
          return;
        }

        if (request.launchPlugin) {
          writeOutput(createManagerResponseOutput(withRequestId(createAckResponse(), request.requestId)));
          void runPlugin(
            request.launchPlugin.pluginPath,
            toLaunchMode(request.launchPlugin.mode),
            request.launchPlugin.aiAccess,
            request.launchPlugin.launchArguments ?? undefined,
            request.launchPlugin.launchContext ?? undefined,
            toLaunchType(request.launchPlugin.launchType),
            request.launchPlugin.commandName || undefined,
          ).catch(reportRuntimeError);
          return;
        }

        if (request.getPreferences) {
          const values = preferencesStore.getPreferenceValues(request.getPreferences.extensionId);
          writeOutput(
            createManagerResponseOutput(
              withRequestId(
                createGetPreferencesResponse({
                  extensionId: request.getPreferences.extensionId,
                  values,
                }),
                request.requestId,
              ),
            ),
          );
          return;
        }

        if (request.setPreferences) {
          preferencesStore.setPreferenceValues(
            request.setPreferences.extensionId,
            request.setPreferences.values ?? {},
          );
          writeOutput(
            createManagerResponseOutput(
              withRequestId(
                createSetPreferencesResponse(request.setPreferences.extensionId),
                request.requestId,
              ),
            ),
          );
          return;
        }

        if (request.dispatchViewEvent) {
          handleDispatchEvent({
            instanceId: request.dispatchViewEvent.instanceId,
            handlerName: request.dispatchViewEvent.handlerName,
            args: request.dispatchViewEvent.args ?? [],
          });
          writeOutput(createManagerResponseOutput(withRequestId(createAckResponse(), request.requestId)));
          return;
        }

        if (request.runtimeEvent) {
          if (isPopViewEvent(request.runtimeEvent)) {
            handlePopView();
            writeOutput(
              createManagerResponseOutput(
                withRequestId(createAckResponse(), request.requestId),
              ),
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
          writeOutput(createManagerResponseOutput(withRequestId(createAckResponse(), request.requestId)));
          return;
        }

        if (request.triggerToastHide) {
          handleTriggerToastHide({ toastId: request.triggerToastHide.toastId });
          writeOutput(createManagerResponseOutput(withRequestId(createAckResponse(), request.requestId)));
          return;
        }

        if (request.setBrowserExtensionConnectionStatus) {
          browserExtensionState.isConnected = request.setBrowserExtensionConnectionStatus.isConnected;
          writeOutput(createManagerResponseOutput(withRequestId(createAckResponse(), request.requestId)));
          return;
        }

        writeOutput(
          createManagerResponseOutput(
            withRequestId(createErrorResponse("Unsupported manager request."), request.requestId),
          ),
        );
        return;
      }

      switch (command.action) {
        case "ai-ask-chunk": {
          const { streamRequestId, chunk } = command.payload as {
            streamRequestId?: unknown;
            chunk?: unknown;
          };
          if (typeof streamRequestId === "string" && typeof chunk === "string") {
            handleAskStreamChunk(streamRequestId, chunk);
          }
          break;
        }
        case "ai-ask-end": {
          const { streamRequestId, fullText } = command.payload as {
            streamRequestId?: unknown;
            fullText?: unknown;
          };
          if (typeof streamRequestId === "string" && typeof fullText === "string") {
            handleAskStreamEnd(streamRequestId, fullText);
          }
          break;
        }
        case "ai-ask-error": {
          const { streamRequestId, error } = command.payload as {
            streamRequestId?: unknown;
            error?: unknown;
          };
          if (typeof streamRequestId === "string" && typeof error === "string") {
            handleAskStreamError(streamRequestId, error);
          }
          break;
        }
        default:
          writeLog(`Unknown command action: ${command.action}`);
      }
    } catch (err: unknown) {
      reportRuntimeError(err);
    }
  });
});

writeLog("Node.js Sidecar started successfully with React Reconciler.");
