import {
  RuntimeOutput,
  type RuntimeOutput as RuntimeOutputMessage,
} from "@beam/extension-protocol";

import { writeOutput } from "../io";

export function writeRuntimeOutput(output: RuntimeOutputMessage): void {
  writeOutput({
    runtimeOutput: RuntimeOutput.toJSON(output),
  });
}
