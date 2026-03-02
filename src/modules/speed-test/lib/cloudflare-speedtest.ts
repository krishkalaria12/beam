export interface SpeedTestSummary {
  download?: number;
  upload?: number;
  latency?: number;
  jitter?: number;
  packetLoss?: number;
}

interface SpeedTestResults {
  getSummary: () => SpeedTestSummary;
}

export interface SpeedTestInstance {
  isRunning: boolean;
  isFinished: boolean;
  results: SpeedTestResults;
  onResultsChange: () => void;
  onRunningChange: () => void;
  onFinish: () => void;
  onError: (error: string) => void;
  play: () => Promise<void> | void;
  pause: () => Promise<void> | void;
  restart: () => Promise<void> | void;
}

type SpeedTestConfig = {
  autoStart?: boolean;
  turnServerUri?: string;
  turnServerUser?: string;
  turnServerPass?: string;
  turnServerCredsApiUrl?: string;
  measurements?: SpeedTestMeasurement[];
};

type SpeedTestMeasurement =
  | {
      type: "latency";
      numPackets: number;
    }
  | {
      type: "download" | "upload";
      bytes: number;
      count: number;
      bypassMinDuration?: boolean;
    }
  | {
      type: "packetLoss";
      numPackets?: number;
      batchSize?: number;
      batchWaitTime?: number;
      responsesWaitTime?: number;
      connectionTimeout?: number;
    };

type SpeedTestConstructor = new (config?: SpeedTestConfig) => SpeedTestInstance;

const CLOUDFLARE_SPEEDTEST_HOST = "speed.cloudflare.com";
const CLOUDFLARE_DOWN_PATH = "/__down";
const CLOUDFLARE_UP_PATH = "/__up";
const SYNTHETIC_TIMING_LIMIT_PER_URL = 64;

let speedTestRuntimePatched = false;
const syntheticTimingsByUrl = new Map<string, PerformanceResourceTiming[]>();

// Cloudflare's public TURN endpoint is deprecated and often blocked by CORS on localhost.
// Keep packet-loss disabled unless explicit TURN credentials/config are provided.
const DEFAULT_MEASUREMENTS_WITHOUT_PACKET_LOSS: SpeedTestMeasurement[] = [
  { type: "latency", numPackets: 1 },
  { type: "download", bytes: 1e5, count: 1, bypassMinDuration: true },
  { type: "latency", numPackets: 20 },
  { type: "download", bytes: 1e5, count: 9 },
  { type: "download", bytes: 1e6, count: 8 },
  { type: "upload", bytes: 1e5, count: 8 },
  { type: "upload", bytes: 1e6, count: 6 },
  { type: "download", bytes: 1e7, count: 6 },
  { type: "upload", bytes: 1e7, count: 4 },
  { type: "download", bytes: 2.5e7, count: 4 },
  { type: "upload", bytes: 2.5e7, count: 4 },
  { type: "download", bytes: 1e8, count: 3 },
  { type: "upload", bytes: 5e7, count: 3 },
  { type: "download", bytes: 2.5e8, count: 2 },
];

function hasTurnCredentials(config: SpeedTestConfig): boolean {
  return Boolean(config.turnServerCredsApiUrl || (config.turnServerUser && config.turnServerPass));
}

function nowMs(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }

  return Date.now();
}

function toAbsoluteUrl(url: string): string {
  try {
    return new URL(url, window.location.origin).toString();
  } catch {
    return url;
  }
}

function resolveRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return toAbsoluteUrl(input);
  }

  if (input instanceof URL) {
    return toAbsoluteUrl(input.toString());
  }

  return toAbsoluteUrl(input.url);
}

function isCloudflareSpeedtestRequest(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== CLOUDFLARE_SPEEDTEST_HOST) {
      return false;
    }

    return parsed.pathname === CLOUDFLARE_DOWN_PATH || parsed.pathname === CLOUDFLARE_UP_PATH;
  } catch {
    return false;
  }
}

function getPositiveNumber(...values: Array<number | null | undefined>): number {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return value;
    }
  }

  return 0;
}

function getBytesFromRequestUrl(url: string): number {
  try {
    const parsed = new URL(url);
    const bytes = Number(parsed.searchParams.get("bytes") ?? "");
    return Number.isFinite(bytes) && bytes > 0 ? bytes : 0;
  } catch {
    return 0;
  }
}

function getByteLengthFromBody(body: BodyInit | null | undefined): number {
  if (!body) {
    return 0;
  }

  if (typeof body === "string") {
    return new TextEncoder().encode(body).byteLength;
  }

  if (body instanceof Blob) {
    return body.size;
  }

  if (body instanceof ArrayBuffer) {
    return body.byteLength;
  }

  if (ArrayBuffer.isView(body)) {
    return body.byteLength;
  }

  if (body instanceof URLSearchParams) {
    return new TextEncoder().encode(body.toString()).byteLength;
  }

  return 0;
}

function getContentLength(headers: Headers): number {
  const value = Number(headers.get("content-length") ?? "");
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function createSyntheticTiming(
  url: string,
  requestStart: number,
  responseStart: number,
  responseEnd: number,
  transferSize: number,
): PerformanceResourceTiming {
  const safeResponseStart = Math.max(responseStart, requestStart + 0.01);
  const safeResponseEnd = Math.max(responseEnd, safeResponseStart + 0.01);
  const duration = Math.max(safeResponseEnd - requestStart, 0.01);
  const safeTransferSize = Math.max(0, transferSize);

  return {
    name: url,
    entryType: "resource",
    startTime: requestStart,
    duration,
    initiatorType: "fetch",
    redirectStart: 0,
    redirectEnd: 0,
    fetchStart: requestStart,
    domainLookupStart: requestStart,
    domainLookupEnd: requestStart,
    connectStart: requestStart,
    secureConnectionStart: requestStart,
    connectEnd: requestStart,
    requestStart,
    responseStart: safeResponseStart,
    responseEnd: safeResponseEnd,
    transferSize: safeTransferSize,
    encodedBodySize: safeTransferSize,
    decodedBodySize: safeTransferSize,
    workerStart: 0,
    nextHopProtocol: "",
    serverTiming: [],
    toJSON() {
      return {
        name: url,
        entryType: "resource",
        startTime: requestStart,
        duration,
        requestStart,
        responseStart: safeResponseStart,
        responseEnd: safeResponseEnd,
        transferSize: safeTransferSize,
      };
    },
  } as PerformanceResourceTiming;
}

function pushSyntheticTiming(url: string, timing: PerformanceResourceTiming): void {
  const existing = syntheticTimingsByUrl.get(url) ?? [];
  existing.push(timing);

  if (existing.length > SYNTHETIC_TIMING_LIMIT_PER_URL) {
    existing.splice(0, existing.length - SYNTHETIC_TIMING_LIMIT_PER_URL);
  }

  syntheticTimingsByUrl.set(url, existing);
}

function patchCloudflareSpeedtestRuntime(): void {
  if (speedTestRuntimePatched) {
    return;
  }

  if (typeof window === "undefined" || typeof fetch !== "function" || typeof performance === "undefined") {
    return;
  }

  const nativeFetch = fetch.bind(window);
  const nativeGetEntriesByName = performance.getEntriesByName.bind(performance);
  const nativeClearResourceTimings =
    typeof performance.clearResourceTimings === "function"
      ? performance.clearResourceTimings.bind(performance)
      : null;

  const patchedFetch: typeof fetch = async (input, init) => {
    const requestUrl = resolveRequestUrl(input);
    if (!isCloudflareSpeedtestRequest(requestUrl)) {
      return nativeFetch(input, init);
    }

    const requestStartedAt = nowMs();
    const bodyFromInput =
      typeof input === "string" || input instanceof URL ? null : (input.body as BodyInit | null);
    const estimatedRequestedBytes = getPositiveNumber(
      getBytesFromRequestUrl(requestUrl),
      getByteLengthFromBody(init?.body),
      getByteLengthFromBody(bodyFromInput),
    );

    const response = await nativeFetch(input, init);
    const responseStartedAt = nowMs();
    let savedTiming = false;

    const saveTiming = (payloadBytes?: number) => {
      if (savedTiming) {
        return;
      }
      savedTiming = true;

      const transferSize = getPositiveNumber(
        payloadBytes,
        getContentLength(response.headers),
        estimatedRequestedBytes,
      );
      const timing = createSyntheticTiming(
        requestUrl,
        requestStartedAt,
        responseStartedAt,
        nowMs(),
        transferSize,
      );
      pushSyntheticTiming(requestUrl, timing);
    };

    const responseWithPatchedReaders = response as Response;
    const originalText = response.text.bind(response);
    responseWithPatchedReaders.text = async () => {
      const body = await originalText();
      saveTiming(new TextEncoder().encode(body).byteLength);
      return body;
    };

    const originalArrayBuffer = response.arrayBuffer.bind(response);
    responseWithPatchedReaders.arrayBuffer = async () => {
      const buffer = await originalArrayBuffer();
      saveTiming(buffer.byteLength);
      return buffer;
    };

    queueMicrotask(() => {
      saveTiming();
    });

    return responseWithPatchedReaders;
  };

  try {
    window.fetch = patchedFetch;

    performance.getEntriesByName = ((name: string, type?: string) => {
      const nativeEntries = nativeGetEntriesByName(name, type);
      if (nativeEntries.length > 0) {
        return nativeEntries;
      }

      const normalizedName = toAbsoluteUrl(name);
      const syntheticEntries = syntheticTimingsByUrl.get(normalizedName);
      if (syntheticEntries && syntheticEntries.length > 0) {
        return syntheticEntries;
      }

      return nativeEntries;
    }) as typeof performance.getEntriesByName;

    if (nativeClearResourceTimings) {
      performance.clearResourceTimings = (() => {
        syntheticTimingsByUrl.clear();
        nativeClearResourceTimings();
      }) as typeof performance.clearResourceTimings;
    }

    speedTestRuntimePatched = true;
  } catch {
    syntheticTimingsByUrl.clear();
  }
}

export async function createSpeedTestInstance(
  config: SpeedTestConfig = {},
): Promise<SpeedTestInstance> {
  patchCloudflareSpeedtestRuntime();

  const module = (await import("@cloudflare/speedtest" as string)) as {
    default: SpeedTestConstructor;
  };

  const resolvedConfig =
    config.measurements || hasTurnCredentials(config)
      ? config
      : {
          ...config,
          measurements: DEFAULT_MEASUREMENTS_WITHOUT_PACKET_LOSS,
        };

  return new module.default(resolvedConfig);
}
