import * as crypto from "crypto";
import { writeLog } from "../io";
import { writeRuntimeRpc } from "../protocol/runtime-rpc";
import type { RuntimeRpcRequest } from "@beam/extension-protocol";

const pendingRequests = new Map<
  string,
  { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }
>();

interface SendRequestOptions {
  timeoutMs?: number;
}

const DEFAULT_REQUEST_TIMEOUT_MS = 5000;

export function invokeCommand<T>(command: string, params: object = {}): Promise<T> {
  return sendRuntimeRpcRequest<T>(
    {
      invokeCommand: {
        command,
        params,
        requestId: "",
      },
    },
    `invoke_command:${command}`,
  );
}

export function sendRuntimeRpcRequest<T>(
  request: RuntimeRpcRequest,
  operation: string,
  options: SendRequestOptions = {},
): Promise<T> {
  return new Promise((resolve, reject) => {
    const requestId = crypto.randomUUID();
    pendingRequests.set(requestId, { resolve: resolve as (value: unknown) => void, reject });

    writeRuntimeRpc({
      request: applyRequestId(request, requestId),
    });

    const timeoutMs = options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
    setTimeout(() => {
      if (pendingRequests.has(requestId)) {
        pendingRequests.delete(requestId);
        const message = `Request for ${operation} timed out`;
        writeLog({
          tag: "extension-manager-rpc-request-failure",
          requestId,
          operation,
          message,
        });
        reject(new Error(message));
      }
    }, timeoutMs);
  });
}

function applyRequestId(request: RuntimeRpcRequest, requestId: string): RuntimeRpcRequest {
  if (request.invokeCommand) {
    return {
      invokeCommand: {
        ...request.invokeCommand,
        requestId,
      },
    };
  }

  if (request.browserExtension) {
    return {
      browserExtension: {
        ...request.browserExtension,
        requestId,
      },
    };
  }

  if (request.oauthGetTokens) {
    return {
      oauthGetTokens: {
        ...request.oauthGetTokens,
        requestId,
      },
    };
  }

  if (request.oauthSetTokens) {
    return {
      oauthSetTokens: {
        ...request.oauthSetTokens,
        requestId,
      },
    };
  }

  if (request.oauthRemoveTokens) {
    return {
      oauthRemoveTokens: {
        ...request.oauthRemoveTokens,
        requestId,
      },
    };
  }

  if (request.confirmAlert) {
    return {
      confirmAlert: {
        ...request.confirmAlert,
        requestId,
      },
    };
  }

  if (request.launchCommand) {
    return {
      launchCommand: {
        ...request.launchCommand,
        requestId,
      },
    };
  }

  if (request.aiAsk) {
    return {
      aiAsk: {
        ...request.aiAsk,
        requestId,
      },
    };
  }

  return request;
}

export function handleResponse(requestId: string, result: unknown, error?: string) {
  const promise = pendingRequests.get(requestId);
  if (promise) {
    if (error) {
      promise.reject(new Error(error));
    } else {
      promise.resolve(result);
    }
    pendingRequests.delete(requestId);
    return;
  }

  writeLog({
    tag: "extension-manager-rpc-request-failure",
    requestId,
    operation: "response",
    message: "Received response for unknown requestId",
    error,
  });
}
