import {
  BridgeMessageKind,
  RuntimeRender,
  createBridgeMessageEnvelope,
  type RuntimeCommand,
  type RuntimeRender as RuntimeRenderMessage,
  createRuntimeRenderBatch,
  createRuntimeRenderCommand,
  createRuntimeRenderError,
  createRuntimeRenderLog,
} from "@beam/extension-protocol";

import { writeOutput } from "../io";

export function writeRuntimeRender(message: RuntimeRenderMessage): void {
  writeOutput(
    createBridgeMessageEnvelope(BridgeMessageKind.RuntimeRender, RuntimeRender.toJSON(message)),
  );
}

export function writeRuntimeRenderBatchMessage(commands: readonly RuntimeCommand[]): void {
  writeRuntimeRender(createRuntimeRenderBatch(commands));
}

export function writeRuntimeRenderCommandMessage(command: RuntimeCommand): void {
  writeRuntimeRender(createRuntimeRenderCommand(command));
}

export function writeRuntimeRenderLogMessage(payload: unknown): void {
  writeRuntimeRender(createRuntimeRenderLog(payload));
}

export function writeRuntimeRenderErrorMessage(error: { message: string; stack?: string }): void {
  writeRuntimeRender(createRuntimeRenderError(error));
}
