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

type OutputWriter = (data: object) => void;

let customOutputWriter: OutputWriter | null = null;

function encodePayload(data: object): Uint8Array {
  return encoder.encode(JSON.stringify(normalizeTransportValue({ ...data, timestamp: Date.now() })));
}

function writeFramedPayload(payloadToWrite: Uint8Array, isCompressed: boolean): void {
  const header = Buffer.alloc(4);
  let headerValue = payloadToWrite.length;
  if (isCompressed) {
    headerValue |= 0x80000000;
  }

  header.writeUInt32BE(headerValue >>> 0);

  process.stdout.write(header);
  process.stdout.write(payloadToWrite);
}

function writeToStdout(data: object): void {
  const payload = encodePayload(data);

  let payloadToWrite: Uint8Array = payload;
  let isCompressed = false;

  if (payload.length > COMPRESSION_THRESHOLD) {
    const compressed = deflate(payload);
    if (compressed.length < payload.length) {
      payloadToWrite = compressed;
      isCompressed = true;
    }
  }

  writeFramedPayload(payloadToWrite, isCompressed);
}

export function setOutputWriter(writer: OutputWriter | null): void {
  customOutputWriter = writer;
}

export const writeOutput = (data: object): void => {
  try {
    if (customOutputWriter) {
      customOutputWriter(data);
      return;
    }

    writeToStdout(data);
  } catch (e: unknown) {
    const errorString = e instanceof Error ? e.toString() : String(e);
    const errorPayload = encodePayload({
      ...createBridgeMessageEnvelope(
        BridgeMessageKind.RuntimeRender,
        RuntimeRender.toJSON(createRuntimeRenderLog(errorString)),
      ),
    });
    writeFramedPayload(errorPayload, false);
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
