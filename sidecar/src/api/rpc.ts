import { writeOutput } from "../io";
import * as crypto from "crypto";

const pendingRequests = new Map<
  string,
  { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }
>();

interface SendRequestOptions {
  timeoutMs?: number;
}

const DEFAULT_REQUEST_TIMEOUT_MS = 5000;

export function sendRequest<T>(
  type: string,
  payload: object = {},
  options: SendRequestOptions = {},
): Promise<T> {
  return new Promise((resolve, reject) => {
    const requestId = crypto.randomUUID();
    pendingRequests.set(requestId, { resolve: resolve as (value: unknown) => void, reject });

    writeOutput({
      type,
      payload: { requestId, ...payload },
    });

    const timeoutMs = options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
    setTimeout(() => {
      if (pendingRequests.has(requestId)) {
        pendingRequests.delete(requestId);
        const message = `Request for ${type} timed out`;
        writeOutput({
          type: "log",
          payload: {
            tag: "sidecar-rpc-request-failure",
            requestId,
            operation: type,
            message,
          },
        });
        reject(new Error(message));
      }
    }, timeoutMs);
  });
}

export function invokeCommand<T>(command: string, params: object = {}): Promise<T> {
  return sendRequest<T>("invoke_command", { command, params });
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

  writeOutput({
    type: "log",
    payload: {
      tag: "sidecar-rpc-request-failure",
      requestId,
      operation: "response",
      message: "Received response for unknown requestId",
      error,
    },
  });
}
