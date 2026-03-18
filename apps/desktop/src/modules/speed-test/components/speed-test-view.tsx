import { Clock, Signal, Zap } from "lucide-react";
import {
  type Dispatch,
  type KeyboardEvent,
  type SetStateAction,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";

import { useMountEffect } from "@/hooks/use-mount-effect";
import { createSpeedTestInstance, type SpeedTestInstance } from "../lib/cloudflare-speedtest";
import {
  EMPTY_METRICS,
  getPercentile,
  MAX_THROUGHPUT_HISTORY_POINTS,
  normalizeSpeedTestError,
  resolveStatus,
  toMetrics,
  type ThroughputHistoryPoint,
} from "./speed-test-shared";
import {
  ErrorBanner,
  MetricCard,
  SpeedCard,
  SpeedTestFooter,
  SpeedTestHeader,
} from "./speed-test-ui";

interface SpeedTestViewProps {
  onBack: () => void;
  autoStart?: boolean;
}

export function SpeedTestView({ onBack, autoStart = true }: SpeedTestViewProps) {
  const speedTestRef = useRef<SpeedTestInstance | null>(null);
  const mountedRef = useRef(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasAutoStartedRef = useRef(false);

  const [metrics, setMetrics] = useState(EMPTY_METRICS);
  const [hasStarted, setHasStarted] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadHistory, setDownloadHistory] = useState<ThroughputHistoryPoint[]>([]);
  const [uploadHistory, setUploadHistory] = useState<ThroughputHistoryPoint[]>([]);

  const status = useMemo(
    () =>
      resolveStatus({
        hasStarted,
        isRunning,
        isFinished,
        errorMessage,
      }),
    [errorMessage, hasStarted, isFinished, isRunning],
  );

  const appendHistory = useCallback(
    (setter: Dispatch<SetStateAction<ThroughputHistoryPoint[]>>, valueMbps: number | null) => {
      if (valueMbps === null) {
        return;
      }

      setter((previous) => {
        const last = previous[previous.length - 1];
        if (last && Math.abs(last.valueMbps - valueMbps) < 0.01) {
          return previous;
        }

        const nextPoint: ThroughputHistoryPoint = {
          sample: (last?.sample ?? 0) + 1,
          valueMbps,
        };

        const next = [...previous, nextPoint];
        return next.slice(-MAX_THROUGHPUT_HISTORY_POINTS);
      });
    },
    [],
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
    const nextMetrics = toMetrics(summary);

    setMetrics(nextMetrics);
    setIsRunning(instance.isRunning);
    setIsFinished(instance.isFinished);
    setIsPaused(!instance.isRunning && !instance.isFinished && hasStarted);

    appendHistory(setDownloadHistory, nextMetrics.downloadMbps);
    appendHistory(setUploadHistory, nextMetrics.uploadMbps);
  }, [appendHistory, hasStarted]);

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

  useMountEffect(() => {
    mountedRef.current = true;
    containerRef.current?.focus();

    return () => {
      mountedRef.current = false;
      teardownSpeedTest();
    };
  });

  const startFreshRun = useCallback(() => {
    setErrorMessage(null);
    setHasStarted(true);
    setIsFinished(false);
    setIsPaused(false);
    setDownloadHistory([]);
    setUploadHistory([]);
  }, []);

  useMountEffect(() => {
    if (!autoStart || hasAutoStartedRef.current) {
      return;
    }

    hasAutoStartedRef.current = true;
    startFreshRun();

    void (async () => {
      const speedTest = await setupSpeedTest();
      if (!speedTest) {
        return;
      }

      try {
        await Promise.resolve(speedTest.play());
        syncFromSpeedTest();
      } catch (error) {
        if (!mountedRef.current) {
          return;
        }
        setErrorMessage(error instanceof Error ? error.message : "Could not start speed test.");
      }
    })();
  });

  const handleStart = useCallback(async () => {
    startFreshRun();

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
  }, [setupSpeedTest, startFreshRun, syncFromSpeedTest]);

  const handleRestart = useCallback(async () => {
    startFreshRun();

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
  }, [setupSpeedTest, startFreshRun, syncFromSpeedTest]);

  const handlePauseResume = useCallback(async () => {
    const speedTest = speedTestRef.current;
    if (!speedTest) {
      return;
    }

    setErrorMessage(null);

    try {
      if (speedTest.isRunning) {
        await Promise.resolve(speedTest.pause());
        setIsPaused(true);
      } else {
        await Promise.resolve(speedTest.play());
        setIsPaused(false);
      }
      syncFromSpeedTest();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not update test state.");
    }
  }, [syncFromSpeedTest]);

  const handleContainerKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
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

    // Space to pause/resume
    if (event.key === " " && hasStarted && !isFinished) {
      event.preventDefault();
      void handlePauseResume();
    }
  };

  const downloadChartData = useMemo(
    () =>
      downloadHistory.map((point) => ({
        sample: point.sample,
        download: point.valueMbps,
      })),
    [downloadHistory],
  );

  const uploadChartData = useMemo(
    () =>
      uploadHistory.map((point) => ({
        sample: point.sample,
        upload: point.valueMbps,
      })),
    [uploadHistory],
  );

  const latestDownload =
    downloadHistory[downloadHistory.length - 1]?.valueMbps ?? metrics.downloadMbps;
  const latestUpload = uploadHistory[uploadHistory.length - 1]?.valueMbps ?? metrics.uploadMbps;

  const p90Download = useMemo(
    () =>
      getPercentile(
        downloadChartData.map((point) => point.download),
        0.9,
      ),
    [downloadChartData],
  );
  const p90Upload = useMemo(
    () =>
      getPercentile(
        uploadChartData.map((point) => point.upload),
        0.9,
      ),
    [uploadChartData],
  );

  return (
    <div
      ref={containerRef}
      className="speedtest-view flex h-full w-full flex-col outline-none"
      onKeyDown={handleContainerKeyDown}
      tabIndex={-1}
    >
      <SpeedTestHeader status={status} isPreparing={isPreparing} onBack={onBack} />

      <div className="speedtest-content flex flex-1 flex-col min-h-0 overflow-y-auto overflow-x-hidden p-4 scrollbar-hidden-until-hover">
        {/* Error Banner */}
        {errorMessage && (
          <div className="mb-4">
            <ErrorBanner message={errorMessage} />
          </div>
        )}

        {/* Main grid layout - fills available space */}
        <div className="flex flex-1 flex-col gap-4">
          {/* Speed Cards Row - Download & Upload (taller cards) */}
          <section
            className="speedtest-section grid flex-1 gap-4 grid-cols-2"
            style={{ animationDelay: "0ms" }}
          >
            <SpeedCard
              metric="download"
              valueMbps={latestDownload}
              p90Value={p90Download}
              data={downloadChartData}
              isRunning={isRunning}
              index={0}
            />
            <SpeedCard
              metric="upload"
              valueMbps={latestUpload}
              p90Value={p90Upload}
              data={uploadChartData}
              isRunning={isRunning}
              index={1}
            />
          </section>

          {/* Metrics Row - Latency, Jitter, Packet Loss */}
          <section
            className="speedtest-section grid gap-4 grid-cols-3"
            style={{ animationDelay: "60ms" }}
          >
            <MetricCard
              icon={<Clock className="size-4 text-[var(--icon-orange-fg)]" />}
              gradient="bg-[var(--launcher-card-bg)]"
              ringColor="ring-[var(--icon-orange-bg)]"
              label="Latency"
              unit="ms"
              value={metrics.unloadedLatencyMs}
              index={0}
            />
            <MetricCard
              icon={<Zap className="size-4 text-[var(--icon-green-fg)]" />}
              gradient="bg-[var(--launcher-card-bg)]"
              ringColor="ring-[var(--icon-green-bg)]"
              label="Jitter"
              unit="ms"
              value={metrics.unloadedJitterMs}
              index={1}
            />
            <MetricCard
              icon={<Signal className="size-4 text-[var(--icon-red-fg)]" />}
              gradient="bg-[var(--launcher-card-bg)]"
              ringColor="ring-[var(--icon-red-bg)]"
              label="Packet Loss"
              unit="%"
              value={metrics.packetLoss}
              index={2}
            />
          </section>
        </div>
      </div>

      <SpeedTestFooter
        isRunning={isRunning}
        isPaused={isPaused}
        isFinished={isFinished}
        isPreparing={isPreparing}
        hasStarted={hasStarted}
        onPauseResume={() => void handlePauseResume()}
        onRestart={() => void handleRestart()}
      />
    </div>
  );
}
