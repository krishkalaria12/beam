import {
  BridgeMessageKind,
  RuntimeOutput,
  createBridgeMessageEnvelope,
  type RuntimeOutput as RuntimeOutputMessage,
} from "@beam/extension-protocol";

import { writeOutput } from "../io";

export function writeRuntimeOutput(output: RuntimeOutputMessage): void {
  writeOutput(
    createBridgeMessageEnvelope(
      BridgeMessageKind.RuntimeOutput,
      RuntimeOutput.toJSON(output),
    ),
  );
}
