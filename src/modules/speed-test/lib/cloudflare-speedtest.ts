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

export async function createSpeedTestInstance(
  config: SpeedTestConfig = {},
): Promise<SpeedTestInstance> {
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
