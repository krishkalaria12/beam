import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline";
import { Worker } from "node:worker_threads";
import {
  BridgeMessageKind,
  RuntimeOutput,
  RuntimeRpc,
  RuntimeRender,
  createBridgeMessageEnvelope,
  createRuntimeRenderError,
  decodeRuntimeRenderMessage,
  readBridgeMessageEnvelope,
} from "@beam/extension-protocol";
import { writeLog, writeOutput } from "./io";
import { config } from "./config";
import { preferencesStore } from "./preferences";
import {
  createAckResponse,
  createErrorResponse,
  createGetPreferencesResponse,
  createManagerResponseOutput,
  createSetPreferencesResponse,
  parseManagerRequestPayload,
  withRequestId,
} from "./protocol/manager";
import type { SupervisorToWorkerMessage, WorkerToSupervisorMessage } from "./worker-protocol";

const WORKER_GRACE_PERIOD_MS = 3_000;
const WORKER_MAX_HEAP_SIZE_MB = 512;
let supervisorProcessHandlersInstalled = false;

function writeSupervisorFatalError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  writeLog(`Extension manager supervisor fatal error: ${message}`);
  writeOutput(
    createBridgeMessageEnvelope(
      BridgeMessageKind.RuntimeRender,
      RuntimeRender.toJSON(createRuntimeRenderError({ message, stack })),
    ),
  );
}

function ensureSupervisorProcessHandlers(): void {
  if (supervisorProcessHandlersInstalled) {
    return;
  }

  supervisorProcessHandlersInstalled = true;

  process.on("unhandledRejection", (reason) => {
    writeSupervisorFatalError(reason);
  });

  process.on("uncaughtException", (error) => {
    writeSupervisorFatalError(error);
    process.exitCode = 1;
    setImmediate(() => {
      process.exit(1);
    });
  });
}

type ManagedWorker = {
  id: string;
  worker: Worker;
  fatalReported: boolean;
  expectedStop: boolean;
  terminationTimer: ReturnType<typeof setTimeout> | null;
};

class ExtensionManagerSupervisor {
  private activeWorker: ManagedWorker | null = null;
  private prewarmedWorker: ManagedWorker | null = null;
  private pendingManagerRequests = new Map<string, string>();
  private rpcRequestOwners = new Map<string, string>();
  private aiStreamOwners = new Map<string, string>();
  private oauthStateOwners = new Map<string, string>();

  constructor() {
    this.ensurePrewarmedWorker();
  }

  start(): void {
    const rl = createInterface({ input: process.stdin });

    rl.on("line", (line) => {
      try {
        this.handleBridgePayload(JSON.parse(line));
      } catch (error) {
        writeLog(
          `Failed to read bridge payload: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });

    process.stdin.on("error", (error) => {
      writeLog(`Extension manager stdin error: ${error}`);
    });
  }

  private createWorker(): ManagedWorker {
    const worker = new Worker(__filename, {
      stdout: true,
      stderr: true,
      workerData: {
        extensionManagerConfig: config,
      },
      resourceLimits: {
        maxOldGenerationSizeMb: WORKER_MAX_HEAP_SIZE_MB,
      },
    });

    const managedWorker: ManagedWorker = {
      id: randomUUID(),
      worker,
      fatalReported: false,
      expectedStop: false,
      terminationTimer: null,
    };

    worker.on("message", (message: WorkerToSupervisorMessage) => {
      this.handleWorkerMessage(managedWorker, message);
    });

    worker.on("messageerror", (error) => {
      writeLog(`Worker messageerror: ${error instanceof Error ? error.message : String(error)}`);
    });

    worker.stdout?.on("data", (chunk: Buffer | Uint8Array) => {
      const text = Buffer.from(chunk).toString("utf8").trim();
      if (text.length > 0) {
        writeLog(text);
      }
    });

    worker.stderr?.on("data", (chunk: Buffer | Uint8Array) => {
      const text = Buffer.from(chunk).toString("utf8").trim();
      if (text.length > 0) {
        writeLog(text);
      }
    });

    worker.on("error", (error) => {
      if (!managedWorker.fatalReported && this.activeWorker?.id === managedWorker.id) {
        managedWorker.fatalReported = true;
        this.writeFatalWorkerError(
          error.message || "The extension worker crashed unexpectedly.",
          error.stack,
        );
      }
    });

    worker.on("exit", (code) => {
      if (managedWorker.terminationTimer) {
        clearTimeout(managedWorker.terminationTimer);
        managedWorker.terminationTimer = null;
      }

      this.clearWorkerOwnership(managedWorker.id);

      if (this.activeWorker?.id === managedWorker.id) {
        this.activeWorker = null;
        if (!managedWorker.expectedStop) {
          this.failPendingManagerRequests(managedWorker.id);
        }

        if (!managedWorker.expectedStop && !managedWorker.fatalReported) {
          this.writeFatalWorkerError(`The extension worker exited unexpectedly with code ${code}.`);
        }
      }

      if (this.prewarmedWorker?.id === managedWorker.id) {
        this.prewarmedWorker = null;
      }

      this.ensurePrewarmedWorker();
    });

    return managedWorker;
  }

  private ensurePrewarmedWorker(): void {
    if (this.prewarmedWorker) {
      return;
    }

    this.prewarmedWorker = this.createWorker();
  }

  private acquireWorker(): ManagedWorker {
    const worker = this.prewarmedWorker ?? this.createWorker();
    this.prewarmedWorker = null;

    // Prewarming the next worker is an optimization and must never block launches.
    try {
      this.ensurePrewarmedWorker();
    } catch (error) {
      writeLog(
        `Failed to prewarm the next extension worker: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return worker;
  }

  private replaceActiveWorker(nextWorker: ManagedWorker): void {
    const previousWorker = this.activeWorker;
    this.activeWorker = nextWorker;

    if (previousWorker) {
      this.disposeWorker(
        previousWorker,
        "The extension worker was replaced before the request completed.",
      );
    }
  }

  private disposeWorker(worker: ManagedWorker, pendingRequestMessage?: string): void {
    if (worker.terminationTimer) {
      return;
    }

    worker.expectedStop = true;
    this.failPendingManagerRequests(worker.id, pendingRequestMessage);
    this.clearWorkerOwnership(worker.id);

    try {
      const shutdownMessage: SupervisorToWorkerMessage = { kind: "shutdown" };
      worker.worker.postMessage(shutdownMessage);
    } catch {
      void worker.worker.terminate();
      return;
    }

    worker.terminationTimer = setTimeout(() => {
      void worker.worker.terminate();
    }, WORKER_GRACE_PERIOD_MS);
  }

  private failPendingManagerRequests(
    workerId: string,
    message = "The extension worker stopped before the request completed.",
  ): void {
    for (const [requestId, ownerId] of this.pendingManagerRequests.entries()) {
      if (ownerId !== workerId) {
        continue;
      }

      this.pendingManagerRequests.delete(requestId);
      this.writeManagerResponseError(requestId, message);
    }
  }

  private clearWorkerOwnership(workerId: string): void {
    for (const [requestId, ownerId] of this.rpcRequestOwners.entries()) {
      if (ownerId === workerId) {
        this.rpcRequestOwners.delete(requestId);
      }
    }

    for (const [streamRequestId, ownerId] of this.aiStreamOwners.entries()) {
      if (ownerId === workerId) {
        this.aiStreamOwners.delete(streamRequestId);
      }
    }

    for (const [state, ownerId] of this.oauthStateOwners.entries()) {
      if (ownerId === workerId) {
        this.oauthStateOwners.delete(state);
      }
    }
  }

  private writeFatalWorkerError(message: string, stack?: string): void {
    writeOutput(
      createBridgeMessageEnvelope(
        BridgeMessageKind.RuntimeRender,
        RuntimeRender.toJSON(createRuntimeRenderError({ message, stack })),
      ),
    );
  }

  private forwardToWorker(worker: ManagedWorker, payload: unknown): void {
    const message: SupervisorToWorkerMessage = {
      kind: "bridge",
      payload,
    };
    worker.worker.postMessage(message);
  }

  private readBridgePayloadRequestId(payload: unknown): string | null {
    if (!payload || typeof payload !== "object") {
      return null;
    }

    const requestId = (payload as { requestId?: string }).requestId;
    if (typeof requestId !== "string") {
      return null;
    }

    const trimmed = requestId.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private trackRuntimeRpcOwnership(worker: ManagedWorker, payload: unknown): void {
    const rpc = RuntimeRpc.fromJSON(payload);
    const request = rpc.request;
    if (!request) {
      return;
    }

    if (request.invokeCommand?.requestId) {
      this.rpcRequestOwners.set(request.invokeCommand.requestId, worker.id);
    }

    if (request.browserExtension?.requestId) {
      this.rpcRequestOwners.set(request.browserExtension.requestId, worker.id);
    }

    if (request.oauthAuthorize?.url) {
      try {
        const state = new URL(request.oauthAuthorize.url).searchParams.get("state");
        if (state) {
          this.oauthStateOwners.set(state, worker.id);
        }
      } catch {
        // Ignore malformed OAuth URLs; the worker will timeout and surface an error.
      }
    }

    if (request.oauthGetTokens?.requestId) {
      this.rpcRequestOwners.set(request.oauthGetTokens.requestId, worker.id);
    }

    if (request.oauthSetTokens?.requestId) {
      this.rpcRequestOwners.set(request.oauthSetTokens.requestId, worker.id);
    }

    if (request.oauthRemoveTokens?.requestId) {
      this.rpcRequestOwners.set(request.oauthRemoveTokens.requestId, worker.id);
    }

    if (request.confirmAlert?.requestId) {
      this.rpcRequestOwners.set(request.confirmAlert.requestId, worker.id);
    }

    if (request.launchCommand?.requestId) {
      this.rpcRequestOwners.set(request.launchCommand.requestId, worker.id);
    }

    if (request.aiAsk?.requestId) {
      this.rpcRequestOwners.set(request.aiAsk.requestId, worker.id);
      this.aiStreamOwners.set(request.aiAsk.streamRequestId, worker.id);
    }
  }

  private resolveRuntimeRpcOwner(payload: unknown): ManagedWorker | null {
    const rpc = RuntimeRpc.fromJSON(payload);
    const response = rpc.response;
    if (!response) {
      return null;
    }

    let ownerId: string | undefined;

    if (response.invokeCommand?.requestId) {
      ownerId = this.rpcRequestOwners.get(response.invokeCommand.requestId);
      this.rpcRequestOwners.delete(response.invokeCommand.requestId);
    } else if (response.browserExtension?.requestId) {
      ownerId = this.rpcRequestOwners.get(response.browserExtension.requestId);
      this.rpcRequestOwners.delete(response.browserExtension.requestId);
    } else if (response.oauthAuthorize?.state) {
      ownerId = this.oauthStateOwners.get(response.oauthAuthorize.state);
      this.oauthStateOwners.delete(response.oauthAuthorize.state);
    } else if (response.oauthGetTokens?.requestId) {
      ownerId = this.rpcRequestOwners.get(response.oauthGetTokens.requestId);
      this.rpcRequestOwners.delete(response.oauthGetTokens.requestId);
    } else if (response.oauthSetTokens?.requestId) {
      ownerId = this.rpcRequestOwners.get(response.oauthSetTokens.requestId);
      this.rpcRequestOwners.delete(response.oauthSetTokens.requestId);
    } else if (response.oauthRemoveTokens?.requestId) {
      ownerId = this.rpcRequestOwners.get(response.oauthRemoveTokens.requestId);
      this.rpcRequestOwners.delete(response.oauthRemoveTokens.requestId);
    } else if (response.confirmAlert?.requestId) {
      ownerId = this.rpcRequestOwners.get(response.confirmAlert.requestId);
      this.rpcRequestOwners.delete(response.confirmAlert.requestId);
    } else if (response.launchCommand?.requestId) {
      ownerId = this.rpcRequestOwners.get(response.launchCommand.requestId);
      this.rpcRequestOwners.delete(response.launchCommand.requestId);
    } else if (response.aiAsk?.requestId) {
      ownerId = this.rpcRequestOwners.get(response.aiAsk.requestId);
      this.rpcRequestOwners.delete(response.aiAsk.requestId);
    } else if (response.aiAskChunk?.streamRequestId) {
      ownerId = this.aiStreamOwners.get(response.aiAskChunk.streamRequestId);
    } else if (response.aiAskEnd?.streamRequestId) {
      ownerId = this.aiStreamOwners.get(response.aiAskEnd.streamRequestId);
      this.aiStreamOwners.delete(response.aiAskEnd.streamRequestId);
    } else if (response.aiAskError?.streamRequestId) {
      ownerId = this.aiStreamOwners.get(response.aiAskError.streamRequestId);
      this.aiStreamOwners.delete(response.aiAskError.streamRequestId);
    }

    if (!ownerId) {
      return null;
    }

    if (this.activeWorker?.id === ownerId) {
      return this.activeWorker;
    }

    return null;
  }

  private handleWorkerMessage(worker: ManagedWorker, message: WorkerToSupervisorMessage): void {
    if (message.kind !== "output") {
      return;
    }

    const envelope = readBridgeMessageEnvelope(message.payload);

    if (envelope?.kind === BridgeMessageKind.ManagerResponse) {
      const requestId = this.readBridgePayloadRequestId(envelope.payload);
      if (!requestId || !this.pendingManagerRequests.has(requestId)) {
        return;
      }

      this.pendingManagerRequests.delete(requestId);
      writeOutput(message.payload);
      return;
    }

    if (envelope?.kind === BridgeMessageKind.RuntimeRpc) {
      if (this.activeWorker?.id !== worker.id) {
        return;
      }

      this.trackRuntimeRpcOwnership(worker, envelope.payload);
      writeOutput(message.payload);
      return;
    }

    if (this.activeWorker?.id !== worker.id) {
      return;
    }

    writeOutput(message.payload);

    if (envelope?.kind === BridgeMessageKind.RuntimeRender) {
      const runtimeRender = decodeRuntimeRenderMessage(RuntimeRender.fromJSON(envelope.payload));
      if (runtimeRender?.kind === "error") {
        worker.fatalReported = true;
        this.activeWorker = null;
        this.disposeWorker(worker);
      }
      return;
    }

    if (envelope?.kind === BridgeMessageKind.RuntimeOutput) {
      const runtimeOutput = RuntimeOutput.fromJSON(envelope.payload);
      if (runtimeOutput?.goBackToPluginList) {
        this.activeWorker = null;
        this.disposeWorker(worker);
      }
    }
  }

  private writeManagerResponseError(requestId: string, message: string): void {
    writeOutput(
      createManagerResponseOutput(withRequestId(createErrorResponse(message), requestId)),
    );
  }

  private writeManagerResponseAck(requestId: string): void {
    writeOutput(createManagerResponseOutput(withRequestId(createAckResponse(), requestId)));
  }

  private handleManagerRequest(raw: unknown): void {
    const envelope = readBridgeMessageEnvelope(raw);
    if (!envelope || envelope.kind !== BridgeMessageKind.ManagerRequest) {
      writeLog("Received invalid manager request envelope.");
      return;
    }

    const request = parseManagerRequestPayload(envelope.payload);

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

    if (request.getPreferences) {
      writeOutput(
        createManagerResponseOutput(
          withRequestId(
            createGetPreferencesResponse({
              extensionId: request.getPreferences.extensionId,
              values: preferencesStore.getPreferenceValues(request.getPreferences.extensionId),
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

    if (request.launchPlugin) {
      let nextWorker: ManagedWorker | null = null;

      try {
        nextWorker = this.acquireWorker();
        this.replaceActiveWorker(nextWorker);
        this.pendingManagerRequests.set(request.requestId, nextWorker.id);
        this.forwardToWorker(nextWorker, raw);
      } catch (error) {
        this.pendingManagerRequests.delete(request.requestId);

        if (nextWorker) {
          if (this.activeWorker?.id === nextWorker.id) {
            this.activeWorker = null;
          }
          this.disposeWorker(nextWorker);
        }

        const message = error instanceof Error ? error.message : String(error);
        writeLog(`Failed to start extension worker: ${message}`);
        this.writeManagerResponseError(
          request.requestId,
          `Failed to start extension worker: ${message}`,
        );
      }

      return;
    }

    if (request.runtimeEvent?.shutdown) {
      if (!this.activeWorker) {
        this.writeManagerResponseAck(request.requestId);
        return;
      }

      this.disposeWorker(this.activeWorker);
      this.activeWorker = null;
      this.writeManagerResponseAck(request.requestId);
      return;
    }

    if (request.setBrowserExtensionConnectionStatus && !this.activeWorker) {
      this.writeManagerResponseAck(request.requestId);
      return;
    }

    if (!this.activeWorker) {
      this.writeManagerResponseError(request.requestId, "No active extension worker is running.");
      return;
    }

    this.pendingManagerRequests.set(request.requestId, this.activeWorker.id);
    this.forwardToWorker(this.activeWorker, raw);
  }

  private handleBridgePayload(raw: unknown): void {
    const envelope = readBridgeMessageEnvelope(raw);

    if (!envelope) {
      writeLog("Received invalid bridge payload from host.");
      return;
    }

    if (envelope.kind === BridgeMessageKind.ManagerRequest) {
      this.handleManagerRequest(raw);
      return;
    }

    if (envelope.kind === BridgeMessageKind.RuntimeRpc) {
      const worker = this.resolveRuntimeRpcOwner(envelope.payload);
      if (!worker) {
        writeLog("Ignoring runtime-rpc response because no matching extension worker exists.");
        return;
      }

      this.forwardToWorker(worker, raw);
      return;
    }

    writeLog(`Unsupported bridge message kind: ${envelope.kind}`);
  }
}

export function startSupervisor(): void {
  ensureSupervisorProcessHandlers();
  const supervisor = new ExtensionManagerSupervisor();
  supervisor.start();
}
