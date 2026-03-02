import {
  Activity,
  ArrowLeft,
  Download,
  Gauge,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  TriangleAlert,
  Upload,
  Wifi,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import {
  createSpeedTestInstance,
  type SpeedTestInstance,
  type SpeedTestSummary,
} from "../lib/cloudflare-speedtest";

interface SpeedTestViewProps {
  onBack: () => void;
}

type Metrics = {
  downloadMbps: number | null;
  uploadMbps: number | null;
  unloadedLatencyMs: number | null;
  unloadedJitterMs: number | null;
  packetLoss: number | null;
};

const EMPTY_METRICS: Metrics = {
  downloadMbps: null,
  uploadMbps: null,
  unloadedLatencyMs: null,
  unloadedJitterMs: null,
  packetLoss: null,
};

function toFiniteNumber(value: number | null | undefined): number | null {
  if (!Number.isFinite(value)) {
    return null;
  }

  return typeof value === "number" ? value : null;
}

function normalizeSpeedTestError(error: string): string {
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

function toMetrics(summary: SpeedTestSummary): Metrics {
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

function formatMetricValue(value: number | null, fractionDigits: number) {
  if (value === null) {
    return "--";
  }

  return value.toFixed(fractionDigits);
}

function MetricCard({
  label,
  value,
  unit,
  icon,
  gradient,
  index,
}: {
  label: string;
  value: number | null;
  unit: string;
  icon: React.ReactNode;
  gradient: string;
  index: number;
}) {
  return (
    <div
      className="speedtest-metric-enter group relative rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/[0.06] transition-all duration-200 hover:bg-white/[0.05]"
      style={{ animationDelay: `${100 + index * 50}ms` }}
    >
      {/* Icon */}
      <div className={cn("size-8 rounded-lg p-1.5 mb-3", gradient)}>{icon}</div>

      {/* Label */}
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/40 mb-2">
        {label}
      </p>

      {/* Value */}
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-[28px] font-semibold tracking-[-0.02em] text-white/90">
          {formatMetricValue(value, unit === "Mbps" ? 2 : 1)}
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-white/40">
          {unit}
        </span>
      </div>
    </div>
  );
}

function resolveStatus(
  hasStarted: boolean,
  isRunning: boolean,
  isFinished: boolean,
  error: string | null,
) {
  if (error) {
    return "error";
  }
  if (isRunning) {
    return "running";
  }
  if (isFinished) {
    return "finished";
  }
  if (hasStarted) {
    return "paused";
  }
  return "idle";
}

function StatusBadge({ status }: { status: ReturnType<typeof resolveStatus> }) {
  const config = {
    idle: { label: "Ready", bg: "bg-white/[0.06]", text: "text-white/50", dot: "bg-white/30" },
    running: {
      label: "Running",
      bg: "bg-emerald-500/15",
      text: "text-emerald-400",
      dot: "bg-emerald-400",
    },
    paused: { label: "Paused", bg: "bg-amber-500/15", text: "text-amber-400", dot: "bg-amber-400" },
    finished: {
      label: "Complete",
      bg: "bg-[var(--solid-accent,#4ea2ff)]/15",
      text: "text-[var(--solid-accent,#4ea2ff)]",
      dot: "bg-[var(--solid-accent,#4ea2ff)]",
    },
    error: { label: "Error", bg: "bg-red-500/15", text: "text-red-400", dot: "bg-red-400" },
  };

  const { label, bg, text, dot } = config[status];

  return (
    <div className={cn("flex items-center gap-2 rounded-full px-3 py-1.5", bg)}>
      <div className={cn("size-1.5 rounded-full", dot, status === "running" && "animate-pulse")} />
      <span className={cn("text-[11px] font-medium", text)}>{label}</span>
    </div>
  );
}

export function SpeedTestView({ onBack }: SpeedTestViewProps) {
  const speedTestRef = useRef<SpeedTestInstance | null>(null);
  const mountedRef = useRef(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const [metrics, setMetrics] = useState<Metrics>(EMPTY_METRICS);
  const [hasStarted, setHasStarted] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const status = useMemo(
    () => resolveStatus(hasStarted, isRunning, isFinished, errorMessage),
    [errorMessage, hasStarted, isFinished, isRunning],
  );

  const syncFromSpeedTest = useCallback(() => {
    if (!mountedRef.current) {
      return;
    }

    const instance = speedTestRef.current;
    if (!instance) {
      return;
    }

    const summary = instance.results.getSummary();
    setMetrics(toMetrics(summary));
    setIsRunning(instance.isRunning);
    setIsFinished(instance.isFinished);
  }, []);

  const setupSpeedTest = useCallback(async () => {
    if (speedTestRef.current) {
      return speedTestRef.current;
    }

    setIsPreparing(true);
    try {
      const speedTest = await createSpeedTestInstance({ autoStart: false });

      if (!mountedRef.current) {
        await Promise.resolve(speedTest.pause()).catch(() => {});
        return null;
      }

      speedTest.onResultsChange = () => {
        syncFromSpeedTest();
      };
      speedTest.onRunningChange = () => {
        syncFromSpeedTest();
      };
      speedTest.onFinish = () => {
        if (!mountedRef.current) {
          return;
        }
        syncFromSpeedTest();
      };
      speedTest.onError = (error) => {
        if (!mountedRef.current) {
          return;
        }
        setErrorMessage(normalizeSpeedTestError(error || "Speed test failed."));
        syncFromSpeedTest();
      };

      speedTestRef.current = speedTest;
      syncFromSpeedTest();
      return speedTest;
    } catch (error) {
      if (mountedRef.current) {
        setErrorMessage(
          error instanceof Error ? error.message : "Could not initialize speed test engine.",
        );
      }
      return null;
    } finally {
      if (mountedRef.current) {
        setIsPreparing(false);
      }
    }
  }, [syncFromSpeedTest]);

  const teardownSpeedTest = useCallback(() => {
    const instance = speedTestRef.current;
    speedTestRef.current = null;

    if (!instance) {
      return;
    }

    instance.onResultsChange = () => {};
    instance.onRunningChange = () => {};
    instance.onFinish = () => {};
    instance.onError = () => {};

    void Promise.resolve(instance.pause()).catch(() => {});
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    containerRef.current?.focus();

    return () => {
      mountedRef.current = false;
      teardownSpeedTest();
    };
  }, [teardownSpeedTest]);

  const handleStart = useCallback(async () => {
    setErrorMessage(null);
    setHasStarted(true);
    setIsFinished(false);

    const speedTest = await setupSpeedTest();
    if (!speedTest) {
      return;
    }

    try {
      await Promise.resolve(speedTest.play());
      syncFromSpeedTest();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not start speed test.");
    }
  }, [setupSpeedTest, syncFromSpeedTest]);

  const handleRestart = useCallback(async () => {
    setErrorMessage(null);
    setHasStarted(true);
    setIsFinished(false);

    const speedTest = await setupSpeedTest();
    if (!speedTest) {
      return;
    }

    try {
      await Promise.resolve(speedTest.restart());
      syncFromSpeedTest();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not restart speed test.");
    }
  }, [setupSpeedTest, syncFromSpeedTest]);

  const handlePauseResume = useCallback(async () => {
    const speedTest = speedTestRef.current;
    if (!speedTest) {
      return;
    }

    setErrorMessage(null);

    try {
      if (speedTest.isRunning) {
        await Promise.resolve(speedTest.pause());
      } else {
        await Promise.resolve(speedTest.play());
      }
      syncFromSpeedTest();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not update test state.");
    }
  }, [syncFromSpeedTest]);

  const handleContainerKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onBack();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (hasStarted) {
        void handleRestart();
      } else {
        void handleStart();
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="speedtest-view-enter flex h-full w-full flex-col outline-none"
      onKeyDown={handleContainerKeyDown}
      tabIndex={-1}
    >
      {/* Header */}
      <header className="speedtest-header-enter flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
        {/* Back button */}
        <button
          type="button"
          onClick={onBack}
          className={cn(
            "flex size-9 items-center justify-center rounded-lg transition-all",
            "bg-white/[0.03] text-white/40",
            "hover:bg-white/[0.06] hover:text-white/70",
          )}
          aria-label="Back"
        >
          <ArrowLeft className="size-4" />
        </button>

        {/* Icon */}
        <div className="size-9 rounded-xl bg-gradient-to-br from-cyan-500/25 to-sky-500/25 p-2">
          <Wifi className="size-full text-cyan-400" />
        </div>

        {/* Title block */}
        <div className="flex-1 min-w-0">
          <h1 className="text-[14px] font-semibold tracking-[-0.01em] text-white/90">Speed Test</h1>
          <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-white/35">
            cloudflare diagnostics
          </p>
        </div>

        {/* Status badge */}
        <StatusBadge status={status} />
      </header>

      {/* Content */}
      <div className="speedtest-content-enter custom-scrollbar flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        {/* Controls panel */}
        <div className="rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/[0.06]">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/45 mb-1">
                Test Controls
              </p>
              <p className="text-[12px] text-white/60">
                Start the test when ready. Results update live.
              </p>
            </div>
            <div className="size-8 rounded-lg bg-gradient-to-br from-cyan-500/15 to-sky-500/15 p-1.5">
              <Gauge className="size-full text-cyan-400/70" />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={isPreparing}
              onClick={() => {
                if (hasStarted) {
                  void handleRestart();
                } else {
                  void handleStart();
                }
              }}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-[12px] font-medium transition-all",
                "bg-[var(--solid-accent,#4ea2ff)] text-white",
                "hover:bg-[var(--solid-accent,#4ea2ff)]/80",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              {isPreparing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : hasStarted ? (
                <RotateCcw className="size-3.5" />
              ) : (
                <Play className="size-3.5" />
              )}
              {hasStarted ? "Restart Test" : "Start Test"}
            </button>

            {hasStarted && !isFinished && (
              <button
                type="button"
                disabled={isPreparing}
                onClick={() => {
                  void handlePauseResume();
                }}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-4 py-2 text-[12px] font-medium transition-all",
                  "bg-white/[0.06] text-white/70 ring-1 ring-white/[0.08]",
                  "hover:bg-white/[0.08] hover:text-white/90",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                )}
              >
                {isRunning ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                {isRunning ? "Pause" : "Resume"}
              </button>
            )}
          </div>

          {/* Error message */}
          {errorMessage && (
            <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-red-500/10 px-3 py-2.5 ring-1 ring-red-500/20">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-red-400" />
              <p className="text-[12px] text-red-300/90">{errorMessage}</p>
            </div>
          )}
        </div>

        {/* Metrics grid */}
        <div className="grid gap-3 sm:grid-cols-2">
          <MetricCard
            icon={<Download className="size-full text-emerald-400" />}
            gradient="bg-gradient-to-br from-emerald-500/20 to-teal-500/20"
            label="Download"
            unit="Mbps"
            value={metrics.downloadMbps}
            index={0}
          />
          <MetricCard
            icon={<Upload className="size-full text-blue-400" />}
            gradient="bg-gradient-to-br from-blue-500/20 to-indigo-500/20"
            label="Upload"
            unit="Mbps"
            value={metrics.uploadMbps}
            index={1}
          />
          <MetricCard
            icon={<Activity className="size-full text-amber-400" />}
            gradient="bg-gradient-to-br from-amber-500/20 to-orange-500/20"
            label="Latency"
            unit="ms"
            value={metrics.unloadedLatencyMs}
            index={2}
          />
          <MetricCard
            icon={<Activity className="size-full text-purple-400" />}
            gradient="bg-gradient-to-br from-purple-500/20 to-violet-500/20"
            label="Jitter"
            unit="ms"
            value={metrics.unloadedJitterMs}
            index={3}
          />
          {metrics.packetLoss !== null && (
            <MetricCard
              icon={<Activity className="size-full text-red-400" />}
              gradient="bg-gradient-to-br from-red-500/20 to-rose-500/20"
              label="Packet Loss"
              unit="%"
              value={metrics.packetLoss}
              index={4}
            />
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="speedtest-footer-enter flex items-center justify-between border-t border-white/[0.06] px-4 py-2">
        <span className="font-mono text-[11px] text-white/30">
          {isRunning ? "testing..." : "ready"}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-white/25">
            <kbd className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[9px]">Enter</kbd>
            <span className="ml-1">{hasStarted ? "Restart" : "Start"}</span>
          </span>
          <span className="text-[10px] text-white/25">
            <kbd className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[9px]">Esc</kbd>
            <span className="ml-1">Back</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
