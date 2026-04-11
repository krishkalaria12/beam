import type { SpeedTestSummary } from "../lib/cloudflare-speedtest";

type SpeedTestChartConfig = Record<
  "download" | "upload",
  {
    label: string;
    theme: {
      light: string;
      dark: string;
    };
  }
>;

type Metrics = {
  downloadMbps: number | null;
  uploadMbps: number | null;
  unloadedLatencyMs: number | null;
  unloadedJitterMs: number | null;
  packetLoss: number | null;
};

export type ThroughputHistoryPoint = {
  sample: number;
  valueMbps: number;
};

export type SpeedTestStatus = "idle" | "running" | "paused" | "finished" | "error";

export const EMPTY_METRICS: Metrics = {
  downloadMbps: null,
  uploadMbps: null,
  unloadedLatencyMs: null,
  unloadedJitterMs: null,
  packetLoss: null,
};

export const MAX_THROUGHPUT_HISTORY_POINTS = 80;

const speedTestChartConfig = {
  download: {
    label: "Download",
    theme: {
      light: "var(--icon-orange-fg)",
      dark: "var(--icon-orange-fg)",
    },
  },
  upload: {
    label: "Upload",
    theme: {
      light: "var(--icon-cyan-fg)",
      dark: "var(--icon-cyan-fg)",
    },
  },
} satisfies SpeedTestChartConfig;

function toFiniteNumber(value: number | null | undefined): number | null {
  if (!Number.isFinite(value)) {
    return null;
  }

  return typeof value === "number" ? value : null;
}

export function normalizeSpeedTestError(error: string): string {
  const message = error.trim();
  const lowered = message.toLowerCase();

  if (
    lowered.includes("turnserveruser") ||
    lowered.includes("turn-creds") ||
    lowered.includes("access-control-allow-origin")
  ) {
    return "Packet loss test is unavailable without TURN server credentials. Download, upload, latency, and jitter results are still valid.";
  }

  return message;
}

export function toMetrics(summary: SpeedTestSummary): Metrics {
  const download = toFiniteNumber(summary.download);
  const upload = toFiniteNumber(summary.upload);
  const latency = toFiniteNumber(summary.latency);
  const jitter = toFiniteNumber(summary.jitter);
  const packetLoss = toFiniteNumber(summary.packetLoss);

  return {
    downloadMbps: download === null ? null : download / 1_000_000,
    uploadMbps: upload === null ? null : upload / 1_000_000,
    unloadedLatencyMs: latency,
    unloadedJitterMs: jitter,
    packetLoss,
  };
}

export function formatMetricValue(value: number | null, fractionDigits: number): string {
  if (value === null) {
    return "--";
  }

  return value.toFixed(fractionDigits);
}

export function getPercentile(values: readonly number[], percentile: number): number | null {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.ceil(percentile * sorted.length) - 1));
  const value = sorted[index];
  return Number.isFinite(value) ? value : null;
}

export function resolveStatus(input: {
  hasStarted: boolean;
  isRunning: boolean;
  isFinished: boolean;
  errorMessage: string | null;
}): SpeedTestStatus {
  if (input.errorMessage) {
    return "error";
  }
  if (input.isRunning) {
    return "running";
  }
  if (input.isFinished) {
    return "finished";
  }
  if (input.hasStarted) {
    return "paused";
  }
  return "idle";
}
