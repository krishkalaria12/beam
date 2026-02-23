import {
  Activity,
  Download,
  Gauge,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  TriangleAlert,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CommandFooterBar } from "@/components/command/command-footer-bar";
import {
  CommandPanelBackButton,
  CommandPanelHeader,
  CommandPanelTitleBlock,
} from "@/components/command/command-panel-header";
import { CommandKeyHint } from "@/components/command/command-key-hint";
import { CommandStatusChip } from "@/components/command/command-status-chip";
import { Button } from "@/components/ui/button";

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
}: {
  label: string;
  value: number | null;
  unit: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground/75">
        <span className="text-primary/80">{icon}</span>
        <span>{label}</span>
      </div>
      <div className="mt-3 flex items-end gap-2">
        <span className="font-mono text-2xl font-semibold text-foreground">
          {formatMetricValue(value, unit === "Mbps" ? 2 : 1)}
        </span>
        <span className="pb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/80">
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

function statusTone(status: ReturnType<typeof resolveStatus>) {
  if (status === "running") {
    return "success";
  }
  if (status === "finished") {
    return "info";
  }
  if (status === "error") {
    return "error";
  }
  if (status === "paused") {
    return "warning";
  }
  return "neutral";
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
        setErrorMessage(
          normalizeSpeedTestError(error || "Speed test failed."),
        );
        syncFromSpeedTest();
      };

      speedTestRef.current = speedTest;
      syncFromSpeedTest();
      return speedTest;
    } catch (error) {
      if (mountedRef.current) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Could not initialize speed test engine.",
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
      setErrorMessage(
        error instanceof Error ? error.message : "Could not start speed test.",
      );
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
      setErrorMessage(
        error instanceof Error ? error.message : "Could not restart speed test.",
      );
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
      setErrorMessage(
        error instanceof Error ? error.message : "Could not update test state.",
      );
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
      className="glass-effect flex h-full w-full flex-col text-foreground outline-none"
      onKeyDown={handleContainerKeyDown}
      tabIndex={-1}
    >
      <CommandPanelHeader>
        <CommandPanelBackButton onClick={onBack} aria-label="Back" />
        <CommandPanelTitleBlock
          title="Network Speed Test"
          subtitle="cloudflare diagnostics"
          subtitleClassName="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/65"
        />

        <CommandStatusChip
          label={status}
          tone={statusTone(status)}
          pulse={status === "running"}
          className="ml-auto"
        />
      </CommandPanelHeader>

      <div className="list-area custom-scrollbar flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-5">
        <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-muted/20 to-background/30 p-4 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/75">
                Test Controls
              </p>
              <p className="mt-1 text-sm text-foreground/90">
                Start the test when ready. Results update live during execution.
              </p>
            </div>
            <Gauge className="size-4 shrink-0 text-muted-foreground/70" />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <Button
              className="gap-2 font-mono text-[11px] uppercase tracking-wider"
              disabled={isPreparing}
              onClick={() => {
                if (hasStarted) {
                  void handleRestart();
                } else {
                  void handleStart();
                }
              }}
              type="button"
            >
              {isPreparing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : hasStarted ? (
                <RotateCcw className="size-3.5" />
              ) : (
                <Play className="size-3.5" />
              )}
              {hasStarted ? "Restart Test" : "Start Test"}
            </Button>

            {hasStarted && !isFinished && (
              <Button
                className="gap-2 font-mono text-[11px] uppercase tracking-wider"
                disabled={isPreparing}
                onClick={() => {
                  void handlePauseResume();
                }}
                type="button"
                variant="outline"
              >
                {isRunning ? (
                  <Pause className="size-3.5" />
                ) : (
                  <Play className="size-3.5" />
                )}
                {isRunning ? "Pause" : "Resume"}
              </Button>
            )}
          </div>

          {errorMessage && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              <p>{errorMessage}</p>
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 animate-in fade-in-50 duration-300">
          <MetricCard
            icon={<Download className="size-3.5" />}
            label="Download"
            unit="Mbps"
            value={metrics.downloadMbps}
          />
          <MetricCard
            icon={<Upload className="size-3.5" />}
            label="Upload"
            unit="Mbps"
            value={metrics.uploadMbps}
          />
          <MetricCard
            icon={<Activity className="size-3.5" />}
            label="Unloaded Latency"
            unit="ms"
            value={metrics.unloadedLatencyMs}
          />
          <MetricCard
            icon={<Activity className="size-3.5" />}
            label="Unloaded Jitter"
            unit="ms"
            value={metrics.unloadedJitterMs}
          />
          {metrics.packetLoss !== null && (
            <MetricCard
              icon={<Activity className="size-3.5" />}
              label="Packet Loss"
              unit="%"
              value={metrics.packetLoss}
            />
          )}
        </div>
      </div>

      <CommandFooterBar
        leftSlot={<span className="font-mono">{isRunning ? "running" : "ready"}</span>}
        rightSlot={(
          <>
            <CommandKeyHint keyLabel="ENTER" label={hasStarted ? "Restart" : "Start"} />
            <CommandKeyHint keyLabel="ESC" label="Back" />
          </>
        )}
      />
    </div>
  );
}
