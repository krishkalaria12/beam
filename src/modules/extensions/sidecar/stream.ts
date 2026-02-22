const textDecoder = new TextDecoder();

export function toByteChunk(data: unknown): Uint8Array<ArrayBufferLike> {
  if (data instanceof Uint8Array) {
    return data;
  }
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }
  if (Array.isArray(data)) {
    return Uint8Array.from(data);
  }
  if (typeof data === "string") {
    return new TextEncoder().encode(data);
  }
  if (
    data &&
    typeof data === "object" &&
    "data" in data &&
    Array.isArray((data as { data?: unknown }).data)
  ) {
    return Uint8Array.from((data as { data: number[] }).data);
  }
  if (
    data &&
    typeof data === "object" &&
    "buffer" in data &&
    (data as { buffer?: unknown }).buffer instanceof ArrayBuffer
  ) {
    const view = data as { buffer: ArrayBuffer; byteOffset?: number; byteLength?: number };
    const offset = view.byteOffset ?? 0;
    const length = view.byteLength ?? view.buffer.byteLength;
    return new Uint8Array(view.buffer, offset, length);
  }

  return new Uint8Array(0);
}

export function concatChunks(
  left: Uint8Array<ArrayBufferLike>,
  right: Uint8Array<ArrayBufferLike>,
): Uint8Array<ArrayBufferLike> {
  if (left.length === 0) {
    return right;
  }
  if (right.length === 0) {
    return left;
  }

  const merged = new Uint8Array(left.length + right.length) as Uint8Array<ArrayBufferLike>;
  merged.set(left, 0);
  merged.set(right, left.length);
  return merged;
}

export function decodeTextPayload(data: unknown): string {
  if (typeof data === "string") {
    return data;
  }

  const chunk = toByteChunk(data);
  if (chunk.length > 0) {
    return textDecoder.decode(chunk).trim();
  }

  return String(data);
}
