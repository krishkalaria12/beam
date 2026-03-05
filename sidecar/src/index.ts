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

process.on("unhandledRejection", (reason: unknown) => {
  writeLog(`--- UNHANDLED PROMISE REJECTION ---`);
  const stack = reason && typeof reason === "object" && "stack" in reason ? reason.stack : reason;
  writeLog(stack);
});

const rl = createInterface({ input: process.stdin });

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

      switch (command.action) {
        case "run-plugin": {
          const { pluginPath, mode, aiAccessStatus, arguments: launchArguments, launchContext, launchType } =
            command.payload as {
            pluginPath?: string;
            commandName?: string;
            mode?: "view" | "no-view";
            aiAccessStatus: boolean;
            arguments?: Record<string, unknown>;
            launchContext?: Record<string, unknown>;
            launchType?: string;
          };
          runPlugin(pluginPath, mode, aiAccessStatus, launchArguments, launchContext, launchType);
          break;
        }
        case "get-preferences": {
          const { pluginName } = command.payload as { pluginName: string };
          const preferences = preferencesStore.getAllPreferences();
          writeOutput({
            type: "preference-values",
            payload: {
              pluginName,
              values: preferences[pluginName] || {},
            },
          });
          break;
        }
        case "set-preferences": {
          const { pluginName, values } = command.payload as {
            pluginName: string;
            values: Record<string, unknown>;
          };
          preferencesStore.setPreferenceValues(pluginName, values);
          break;
        }
        case "pop-view": {
          const previousElement = navigationStack.pop();
          if (previousElement) {
            updateContainer(previousElement);
          } else {
            writeOutput({ type: "go-back-to-plugin-list", payload: {} });
          }
          break;
        }
        case "dispatch-event": {
          const { instanceId, handlerName, args } = command.payload as {
            instanceId: number;
            handlerName: string;
            args: unknown[];
          };

          const instance = instances.get(instanceId);
          if (!instance) {
            writeLog(`Instance ${instanceId} not found.`);
            return;
          }

          if (!("props" in instance)) {
            return;
          }

          const flareInstance = instance as FlareInstance;

          const props = flareInstance._unserializedProps;
          const handler = props?.[handlerName];

          if (typeof handler === "function") {
            handler(...args);
          } else {
            writeLog(
              `Handler ${handlerName} not found or not a function on instance ${instanceId}`,
            );
          }
          break;
        }
        case "dispatch-toast-action": {
          const { toastId, actionType } = command.payload as {
            toastId: number;
            actionType: "primary" | "secondary";
          };
          const toast = toasts.get(toastId);
          if (toast) {
            const action = actionType === "primary" ? toast.primaryAction : toast.secondaryAction;
            if (action?.onAction) {
              action.onAction(toast);
            }
          }
          break;
        }
        case "trigger-toast-hide": {
          const { toastId } = command.payload as { toastId: number };
          const toast = toasts.get(toastId);
          toast?.hide();
          break;
        }
        case "browser-extension-connection-status": {
          const { isConnected } = command.payload as { isConnected: boolean };
          browserExtensionState.isConnected = isConnected;
          break;
        }
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
      const error =
        err instanceof Error
          ? { message: err.message, stack: err.stack }
          : { message: String(err) };
      writeLog(`ERROR: ${error.message} \n ${error.stack ?? ""}`);
      writeOutput({ type: "error", payload: error.message });

      throw err;
    }
  });
});

writeLog("Node.js Sidecar started successfully with React Reconciler.");
