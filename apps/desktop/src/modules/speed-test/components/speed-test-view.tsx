import { Clock, Signal, Zap } from "lucide-react";
import {
  type Dispatch,
  type KeyboardEvent,
  type Reducer,
  type SetStateAction,
  useCallback,
  useMemo,
  useReducer,
  useRef,
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

interface SpeedTestViewState {
  metrics: typeof EMPTY_METRICS;
  hasStarted: boolean;
  isRunning: boolean;
  isFinished: boolean;
  isPreparing: boolean;
  isPaused: boolean;
  errorMessage: string | null;
  downloadHistory: ThroughputHistoryPoint[];
  uploadHistory: ThroughputHistoryPoint[];
}

type SpeedTestViewAction =
  | { type: "set-run-state"; value: Partial<SpeedTestViewState> }
  | { type: "set-preparing"; value: boolean }
  | { type: "set-error"; value: string | null }
  | { type: "start-fresh-run" }
  | { type: "append-download-history"; value: number | null }
  | { type: "append-upload-history"; value: number | null };

const INITIAL_SPEED_TEST_VIEW_STATE: SpeedTestViewState = {
  metrics: EMPTY_METRICS,
  hasStarted: false,
  isRunning: false,
  isFinished: false,
  isPreparing: false,
  isPaused: false,
  errorMessage: null,
  downloadHistory: [],
  uploadHistory: [],
};

function appendHistoryPoints(
  history: ThroughputHistoryPoint[],
  valueMbps: number | null,
): ThroughputHistoryPoint[] {
  if (valueMbps === null) {
    return history;
  }

  const last = history[history.length - 1];
  if (last && Math.abs(last.valueMbps - valueMbps) < 0.01) {
    return history;
  }

  const nextPoint: ThroughputHistoryPoint = {
    sample: (last?.sample ?? 0) + 1,
    valueMbps,
  };

  return [...history, nextPoint].slice(-MAX_THROUGHPUT_HISTORY_POINTS);
}

const speedTestViewReducer: Reducer<SpeedTestViewState, SpeedTestViewAction> = (state, action) => {
  switch (action.type) {
    case "set-run-state":
      return { ...state, ...action.value };
    case "set-preparing":
      return { ...state, isPreparing: action.value };
    case "set-error":
      return { ...state, errorMessage: action.value };
    case "start-fresh-run":
      return {
        ...state,
        errorMessage: null,
        hasStarted: true,
        isFinished: false,
        isPaused: false,
        downloadHistory: [],
        uploadHistory: [],
      };
    case "append-download-history":
      return {
        ...state,
        downloadHistory: appendHistoryPoints(state.downloadHistory, action.value),
      };
    case "append-upload-history":
      return {
        ...state,
        uploadHistory: appendHistoryPoints(state.uploadHistory, action.value),
      };
  }
};

function SpeedTestCharts({
  latestDownload,
  latestUpload,
  p90Download,
  p90Upload,
  downloadChartData,
  uploadChartData,
  isRunning,
}: {
  latestDownload: number | null;
  latestUpload: number | null;
  p90Download: number | null;
  p90Upload: number | null;
  downloadChartData: Array<{ sample: number; download: number }>;
  uploadChartData: Array<{ sample: number; upload: number }>;
  isRunning: boolean;
}) {
  return (
    <section
      className="speedtest-section grid flex-1 grid-cols-2 gap-4"
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
  );
}

function SpeedTestMetrics({ metrics }: { metrics: SpeedTestViewState["metrics"] }) {
  return (
    <section
      className="speedtest-section grid grid-cols-3 gap-4"
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
  );
}

export function SpeedTestView({ onBack, autoStart = true }: SpeedTestViewProps) {
  const speedTestRef = useRef<SpeedTestInstance | null>(null);
  const mountedRef = useRef(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasAutoStartedRef = useRef(false);
  const [state, dispatch] = useReducer(speedTestViewReducer, INITIAL_SPEED_TEST_VIEW_STATE);

  const status = useMemo(
    () =>
      resolveStatus({
        hasStarted: state.hasStarted,
        isRunning: state.isRunning,
        isFinished: state.isFinished,
        errorMessage: state.errorMessage,
      }),
    [state.errorMessage, state.hasStarted, state.isFinished, state.isRunning],
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

    dispatch({
      type: "set-run-state",
      value: {
        metrics: nextMetrics,
        isRunning: instance.isRunning,
        isFinished: instance.isFinished,
        isPaused: !instance.isRunning && !instance.isFinished && state.hasStarted,
      },
    });
    dispatch({ type: "append-download-history", value: nextMetrics.downloadMbps });
    dispatch({ type: "append-upload-history", value: nextMetrics.uploadMbps });
  }, [state.hasStarted]);

  const setupSpeedTest = useCallback(async () => {
    if (speedTestRef.current) {
      return speedTestRef.current;
    }

    dispatch({ type: "set-preparing", value: true });

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
        dispatch({
          type: "set-error",
          value: normalizeSpeedTestError(error || "Speed test failed."),
        });
        syncFromSpeedTest();
      };

      speedTestRef.current = speedTest;
      syncFromSpeedTest();

      return speedTest;
    } catch (error) {
      if (mountedRef.current) {
        dispatch({
          type: "set-error",
          value: error instanceof Error ? error.message : "Could not initialize speed test engine.",
        });
      }
      return null;
    }

    if (mountedRef.current) {
      dispatch({ type: "set-preparing", value: false });
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
    dispatch({ type: "start-fresh-run" });
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
        dispatch({
          type: "set-error",
          value: error instanceof Error ? error.message : "Could not start speed test.",
        });
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
      dispatch({
        type: "set-error",
        value: error instanceof Error ? error.message : "Could not start speed test.",
      });
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
      dispatch({
        type: "set-error",
        value: error instanceof Error ? error.message : "Could not restart speed test.",
      });
    }
  }, [setupSpeedTest, startFreshRun, syncFromSpeedTest]);

  const handlePauseResume = useCallback(async () => {
    const speedTest = speedTestRef.current;
    if (!speedTest) {
      return;
    }

    dispatch({ type: "set-error", value: null });

    try {
      if (speedTest.isRunning) {
        await Promise.resolve(speedTest.pause());
        dispatch({ type: "set-run-state", value: { isPaused: true } });
      } else {
        await Promise.resolve(speedTest.play());
        dispatch({ type: "set-run-state", value: { isPaused: false } });
      }
      syncFromSpeedTest();
    } catch (error) {
      dispatch({
        type: "set-error",
        value: error instanceof Error ? error.message : "Could not update test state.",
      });
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
      if (state.hasStarted) {
        void handleRestart();
      } else {
        void handleStart();
      }
    }

    // Space to pause/resume
    if (event.key === " " && state.hasStarted && !state.isFinished) {
      event.preventDefault();
      void handlePauseResume();
    }
  };

  const downloadChartData = useMemo(
    () =>
      state.downloadHistory.map((point) => ({
        sample: point.sample,
        download: point.valueMbps,
      })),
    [state.downloadHistory],
  );

  const uploadChartData = useMemo(
    () =>
      state.uploadHistory.map((point) => ({
        sample: point.sample,
        upload: point.valueMbps,
      })),
    [state.uploadHistory],
  );

  const latestDownload =
    state.downloadHistory[state.downloadHistory.length - 1]?.valueMbps ??
    state.metrics.downloadMbps;
  const latestUpload =
    state.uploadHistory[state.uploadHistory.length - 1]?.valueMbps ?? state.metrics.uploadMbps;

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
      role="region"
      aria-label="Speed test"
    >
      <SpeedTestHeader status={status} isPreparing={state.isPreparing} onBack={onBack} />

      <div className="speedtest-content flex flex-1 flex-col min-h-0 overflow-y-auto overflow-x-hidden p-4 scrollbar-hidden-until-hover">
        {state.errorMessage && (
          <div className="mb-4">
            <ErrorBanner message={state.errorMessage} />
          </div>
        )}

        <div className="flex flex-1 flex-col gap-4">
          <SpeedTestCharts
            latestDownload={latestDownload}
            latestUpload={latestUpload}
            p90Download={p90Download}
            p90Upload={p90Upload}
            downloadChartData={downloadChartData}
            uploadChartData={uploadChartData}
            isRunning={state.isRunning}
          />

          <SpeedTestMetrics metrics={state.metrics} />
        </div>
      </div>

      <SpeedTestFooter
        isRunning={state.isRunning}
        isPaused={state.isPaused}
        isFinished={state.isFinished}
        isPreparing={state.isPreparing}
        hasStarted={state.hasStarted}
        onPauseResume={() => void handlePauseResume()}
        onRestart={() => void handleRestart()}
      />
    </div>
  );
}
