import {
  BridgeMessageKind,
  RuntimeRender,
  createBridgeMessageEnvelope,
  createRuntimeRenderLog,
} from "@beam/extension-protocol";
import { deflate } from "pako";
import { normalizeTransportValue } from "./utils";

const COMPRESSION_THRESHOLD = 2048; // 2KB
const encoder = new TextEncoder();

function encodePayload(data: object): Uint8Array {
  return encoder.encode(JSON.stringify(normalizeTransportValue({ ...data, timestamp: Date.now() })));
}

export const writeOutput = (data: object): void => {
  try {
    const payload = encodePayload(data);

    let payloadToWrite: Uint8Array = payload;
    let isCompressed = false;

    if (payload.length > COMPRESSION_THRESHOLD) {
      const compressed = deflate(payload);
      if (compressed.length < payload.length) {
        payloadToWrite = compressed;
        isCompressed = true;
        writeLog(`Compressed payload from ${payload.length} to ${compressed.length} bytes`);
      }
    }

    const header = Buffer.alloc(4);
    let headerValue = payloadToWrite.length;
    if (isCompressed) {
      headerValue |= 0x80000000;
    }

    header.writeUInt32BE(headerValue >>> 0);

    process.stdout.write(header);
    process.stdout.write(payloadToWrite);
  } catch (e: unknown) {
    const errorString = e instanceof Error ? e.toString() : String(e);
    const errorPayload = encodePayload({
      ...createBridgeMessageEnvelope(
        BridgeMessageKind.RuntimeRender,
        RuntimeRender.toJSON(createRuntimeRenderLog(errorString)),
      ),
    });
    const errorHeader = Buffer.alloc(4);
    errorHeader.writeUInt32BE(errorPayload.length);
    process.stdout.write(errorHeader);
    process.stdout.write(errorPayload);
  }
};

export const writeLog = (message: unknown): void => {
  writeOutput({
    ...createBridgeMessageEnvelope(
      BridgeMessageKind.RuntimeRender,
      RuntimeRender.toJSON(createRuntimeRenderLog(message)),
    ),
  });
};
