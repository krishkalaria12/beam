import { parentPort } from "node:worker_threads";
import { setOutputWriter } from "./io";
import { handleBridgePayload, initializeWorkerRuntime } from "./worker";
import type { SupervisorToWorkerMessage, WorkerToSupervisorMessage } from "./worker-protocol";

export function startCommandWorker(): void {
  if (!parentPort) {
    throw new Error("Command worker must run inside a worker thread.");
  }

  const port = parentPort;

  initializeWorkerRuntime();
  setOutputWriter((payload) => {
    const message: WorkerToSupervisorMessage = {
      kind: "output",
      payload,
    };
    port.postMessage(message);
  });

  port.on("message", (message: SupervisorToWorkerMessage) => {
    if (message.kind === "shutdown") {
      process.exit(0);
    }

    handleBridgePayload(message.payload);
  });
}
