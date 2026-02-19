export interface SpeedTestSummary {
  download: number;
  upload: number;
  latency: number;
  jitter: number;
  packetLoss: number;
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
};

type SpeedTestConstructor = new (config?: SpeedTestConfig) => SpeedTestInstance;

export async function createSpeedTestInstance(
  config: SpeedTestConfig = {},
): Promise<SpeedTestInstance> {
  const module = (await import("@cloudflare/speedtest" as string)) as {
    default: SpeedTestConstructor;
  };

  return new module.default(config);
}
