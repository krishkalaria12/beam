import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  TriangleAlert,
  Wifi,
} from "lucide-react";
import { useId, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { ModuleFooter } from "@/components/module";
import { Button } from "@/components/ui/button";
import { formatMetricValue, type SpeedTestStatus } from "./speed-test-shared";

interface ThroughputMiniChartProps {
  data: ThroughputChartDatum[];
  metric: SpeedMetric;
  color: string;
}

const MINI_CHART_WIDTH = 240;
const MINI_CHART_HEIGHT = 60;
const MINI_CHART_PADDING = 2;

function ThroughputMiniChart({ data, metric, color }: ThroughputMiniChartProps) {
  const gradientId = useId();
  const points = toChartPoints(data, metric);

  if (points.length < 2) {
    return <div className="h-full w-full" />;
  }

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const baseline = MINI_CHART_HEIGHT - MINI_CHART_PADDING;
  const linePath = buildLinePath(points);
  const fillPath = `${linePath} L ${lastPoint.x} ${baseline} L ${firstPoint.x} ${baseline} Z`;

  return (
    <svg
      viewBox={`0 0 ${MINI_CHART_WIDTH} ${MINI_CHART_HEIGHT}`}
      className="h-full w-full overflow-visible"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={color} stopOpacity="0.35" />
          <stop offset="95%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#${gradientId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* =============================================================================
   STATUS BADGE
   ============================================================================= */

interface SpeedTestStatusBadgeProps {
  status: SpeedTestStatus;
  isPreparing?: boolean;
}

function SpeedTestStatusBadge({ status, isPreparing }: SpeedTestStatusBadgeProps) {
  const config = {
    idle: {
      label: "Ready",
      bg: "bg-[var(--launcher-card-hover-bg)]",
      text: "text-muted-foreground",
      dot: "bg-[var(--launcher-card-hover-bg)]",
    },
    running: {
      label: "Testing",
      bg: "bg-[var(--icon-cyan-bg)]",
      text: "text-[var(--icon-cyan-fg)]",
      dot: "bg-[var(--icon-cyan-bg)]",
    },
    paused: {
      label: "Paused",
      bg: "bg-[var(--icon-orange-bg)]",
      text: "text-[var(--icon-orange-fg)]",
      dot: "bg-[var(--icon-orange-bg)]",
    },
    finished: {
      label: "Complete",
      bg: "bg-[var(--icon-green-bg)]",
      text: "text-[var(--icon-green-fg)]",
      dot: "bg-[var(--icon-green-bg)]",
    },
    error: {
      label: "Error",
      bg: "bg-[var(--icon-red-bg)]",
      text: "text-[var(--icon-red-fg)]",
      dot: "bg-[var(--icon-red-bg)]",
    },
  };

  const { label, bg, text, dot } = config[status];

  return (
    <div className={cn("flex items-center gap-2 rounded-full px-3 py-1.5", bg)}>
      {isPreparing ? (
        <Loader2 className="size-3 animate-spin text-[var(--icon-cyan-fg)]" />
      ) : (
        <div
          className={cn("size-1.5 rounded-full", dot, status === "running" && "animate-pulse")}
        />
      )}
      <span className={cn("text-launcher-2xs font-semibold uppercase tracking-[0.06em]", text)}>
        {isPreparing ? "Preparing" : label}
      </span>
    </div>
  );
}

/* =============================================================================
   HEADER
   ============================================================================= */

interface SpeedTestHeaderProps {
  status: SpeedTestStatus;
  isPreparing?: boolean;
  onBack: () => void;
}

export function SpeedTestHeader({ status, isPreparing, onBack }: SpeedTestHeaderProps) {
  return (
    <header className="speedtest-header flex h-14 shrink-0 items-center gap-3 border-b border-[var(--launcher-card-border)] px-5">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onBack}
        className="flex size-9 items-center justify-center rounded-lg bg-[var(--launcher-card-hover-bg)] text-muted-foreground transition-all hover:bg-[var(--launcher-card-hover-bg)] hover:text-muted-foreground"
        aria-label="Back"
      >
        <ChevronLeft className="size-4" />
      </Button>

      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-[var(--launcher-card-bg)] ring-1 ring-[var(--icon-cyan-bg)]">
          <Wifi className="size-4 text-[var(--icon-cyan-fg)]" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-launcher-lg font-semibold tracking-[-0.02em] text-foreground">
            Speed Test
          </h1>
          <p className="text-launcher-xs text-muted-foreground">Network diagnostics</p>
        </div>
      </div>

      <div className="ml-auto">
        <SpeedTestStatusBadge status={status} isPreparing={isPreparing} />
      </div>
    </header>
  );
}

/* =============================================================================
   SPEED CARD - Compact speed display with inline chart
   ============================================================================= */

type SpeedMetric = "download" | "upload";

interface ThroughputChartDatum {
  sample: number;
  [key: string]: number;
}

interface SpeedCardProps {
  metric: SpeedMetric;
  valueMbps: number | null;
  p90Value: number | null;
  data: ThroughputChartDatum[];
  isRunning: boolean;
  index: number;
}

export function SpeedCard({ metric, valueMbps, p90Value, data, isRunning, index }: SpeedCardProps) {
  const isDownload = metric === "download";
  const label = isDownload ? "Download" : "Upload";
  const color = isDownload ? "var(--icon-cyan-fg)" : "var(--icon-purple-fg)";
  const iconBg = isDownload ? "bg-[var(--icon-cyan-bg)]" : "bg-[var(--icon-purple-bg)]";
  const iconColor = isDownload ? "text-[var(--icon-cyan-fg)]" : "text-[var(--icon-purple-fg)]";
  const ringColor = isDownload ? "ring-[var(--icon-cyan-bg)]" : "ring-[var(--icon-purple-bg)]";

  return (
    <div
      className={cn(
        "speedtest-card group relative flex flex-col overflow-hidden rounded-2xl bg-[var(--launcher-card-hover-bg)] p-4 ring-1 ring-[var(--launcher-card-border)] transition-all",
        "hover:bg-[var(--launcher-card-hover-bg)]",
        isRunning && ringColor,
      )}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {/* Header row */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "flex size-8 items-center justify-center rounded-xl bg-[var(--launcher-card-bg)] ring-1",
              iconBg,
              ringColor,
            )}
          >
            {isDownload ? (
              <ArrowDown className={cn("size-4", iconColor)} />
            ) : (
              <ArrowUp className={cn("size-4", iconColor)} />
            )}
          </div>
          <span className="text-launcher-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            {label}
          </span>
        </div>

        {p90Value !== null && (
          <span className="text-launcher-2xs text-muted-foreground">
            P90:{" "}
            <span className="font-mono text-muted-foreground">
              {formatMetricValue(p90Value, 0)}
            </span>
          </span>
        )}
      </div>

      {/* Speed value */}
      <div className="mb-4 flex items-baseline gap-1.5">
        <span
          className={cn(
            "font-mono text-[calc(var(--beam-font-size-base)*3.0769)] font-bold leading-none tracking-[-0.03em] text-foreground",
            isRunning && valueMbps === null && "animate-pulse",
          )}
        >
          {formatMetricValue(valueMbps, 1)}
        </span>
        <span className="font-mono text-launcher-lg font-medium text-muted-foreground">Mbps</span>
      </div>

      {/* Mini chart - takes remaining space */}
      <div className="mt-auto h-[60px] w-full">
        {data.length > 1 ? (
          <ThroughputMiniChart data={data} metric={metric} color={color} />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="flex gap-0.5">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((seed) => (
                <div
                  key={`sample:${seed}`}
                  className={cn(
                    "w-1 rounded-full transition-all",
                    isRunning ? "speedtest-sample-bar" : "bg-[var(--launcher-card-hover-bg)]",
                  )}
                  style={{
                    height: `${12 + (((seed + 1) * 19) % 33)}px`,
                    animationDelay: `${seed * 60}ms`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type ThroughputChartPoint = {
  x: number;
  y: number;
};

function toChartPoints(
  data: readonly ThroughputChartDatum[],
  metric: SpeedMetric,
): ThroughputChartPoint[] {
  const values = data
    .map((entry) => entry[metric])
    .filter((value): value is number => Number.isFinite(value));

  if (values.length < 2) {
    return [];
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const valueRange = max - min || 1;
  const chartWidth = MINI_CHART_WIDTH - MINI_CHART_PADDING * 2;
  const chartHeight = MINI_CHART_HEIGHT - MINI_CHART_PADDING * 2;
  const lastIndex = values.length - 1;

  return values.map((value, index) => ({
    x: MINI_CHART_PADDING + (chartWidth * index) / lastIndex,
    y: MINI_CHART_PADDING + chartHeight - ((value - min) / valueRange) * chartHeight,
  }));
}

function buildLinePath(points: readonly ThroughputChartPoint[]): string {
  let path = "";

  for (const [index, point] of points.entries()) {
    const command = index === 0 ? "M" : "L";
    path += `${command} ${point.x} ${point.y} `;
  }

  return path.trim();
}

/* =============================================================================
   METRIC CARD - Compact stat display
   ============================================================================= */

interface MetricCardProps {
  label: string;
  value: number | null;
  unit: string;
  icon: ReactNode;
  gradient: string;
  ringColor: string;
  index: number;
}

export function MetricCard({
  label,
  value,
  unit,
  icon,
  gradient,
  ringColor,
  index,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "speedtest-card group rounded-2xl bg-[var(--launcher-card-hover-bg)] p-4 ring-1 ring-[var(--launcher-card-border)] transition-all",
        "hover:bg-[var(--launcher-card-hover-bg)]",
      )}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="mb-3 flex items-center gap-2.5">
        <div
          className={cn(
            "flex size-8 items-center justify-center rounded-xl ring-1",
            gradient,
            ringColor,
          )}
        >
          {icon}
        </div>
        <span className="text-launcher-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="font-mono text-[calc(var(--beam-font-size-base)*2.4615)] font-bold tracking-[-0.02em] text-foreground">
          {formatMetricValue(value, 1)}
        </span>
        <span className="font-mono text-launcher-md font-medium text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}

/* =============================================================================
   ERROR BANNER
   ============================================================================= */

interface ErrorBannerProps {
  message: string;
}

export function ErrorBanner({ message }: ErrorBannerProps) {
  return (
    <div className="speedtest-error flex items-start gap-3 rounded-xl bg-[var(--icon-red-bg)] px-4 py-3 ring-1 ring-[var(--icon-red-bg)]">
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-[var(--icon-red-fg)]" />
      <p className="text-launcher-sm leading-relaxed text-[var(--icon-red-fg)]">{message}</p>
    </div>
  );
}

/* =============================================================================
   FOOTER
   ============================================================================= */

interface SpeedTestFooterProps {
  isRunning: boolean;
  isPaused: boolean;
  isFinished: boolean;
  isPreparing: boolean;
  hasStarted: boolean;
  onPauseResume: () => void;
  onRestart: () => void;
}

export function SpeedTestFooter({
  isRunning,
  isPaused,
  isFinished,
  isPreparing,
  hasStarted,
  onPauseResume,
  onRestart,
}: SpeedTestFooterProps) {
  return (
    <ModuleFooter
      className="speedtest-footer border-[var(--launcher-card-border)] px-5"
      leftSlot={
        <div className="flex items-center gap-3">
          {hasStarted && !isFinished && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onPauseResume}
              disabled={isPreparing}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-launcher-xs font-medium transition-all",
                "bg-[var(--launcher-card-hover-bg)] text-muted-foreground ring-1 ring-[var(--launcher-card-border)]",
                "hover:bg-[var(--launcher-card-hover-bg)] hover:text-muted-foreground",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              {isRunning ? (
                <>
                  <Pause className="size-3" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="size-3" />
                  Resume
                </>
              )}
            </Button>
          )}
          {hasStarted && (isFinished || isPaused) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRestart}
              disabled={isPreparing}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-launcher-xs font-medium transition-all",
                "bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-fg)] ring-1 ring-[var(--icon-cyan-bg)]",
                "hover:bg-[var(--icon-cyan-bg)] hover:text-[var(--icon-cyan-fg)]",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              <RotateCcw className="size-3" />
              Restart
            </Button>
          )}
          {(!hasStarted || (isRunning && !isPaused)) && (
            <span className="text-launcher-xs font-medium text-muted-foreground">
              {isPreparing ? "Preparing..." : isRunning ? "Testing..." : "Ready"}
            </span>
          )}
        </div>
      }
      shortcuts={[
        { keys: ["Enter"], label: hasStarted ? "Restart" : "Start" },
        { keys: ["Esc"], label: "Back" },
      ]}
    />
  );
}
