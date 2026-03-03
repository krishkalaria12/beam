import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  Clock,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Signal,
  TriangleAlert,
  Wifi,
  Zap,
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

import { cn } from "@/lib/utils";
import { formatMetricValue, type SpeedTestStatus } from "./speed-test-shared";

/* =============================================================================
   STATUS BADGE
   ============================================================================= */

interface SpeedTestStatusBadgeProps {
  status: SpeedTestStatus;
  isPreparing?: boolean;
}

function SpeedTestStatusBadge({ status, isPreparing }: SpeedTestStatusBadgeProps) {
  const config = {
    idle: { label: "Ready", bg: "bg-[var(--launcher-card-hover-bg)]", text: "text-foreground/50", dot: "bg-[var(--launcher-card-hover-bg)]" },
    running: {
      label: "Testing",
      bg: "bg-cyan-500/15",
      text: "text-cyan-400",
      dot: "bg-cyan-400",
    },
    paused: { label: "Paused", bg: "bg-amber-500/15", text: "text-amber-400", dot: "bg-amber-400" },
    finished: {
      label: "Complete",
      bg: "bg-emerald-500/15",
      text: "text-emerald-400",
      dot: "bg-emerald-400",
    },
    error: { label: "Error", bg: "bg-red-500/15", text: "text-red-400", dot: "bg-red-400" },
  };

  const { label, bg, text, dot } = config[status];

  return (
    <div className={cn("flex items-center gap-2 rounded-full px-3 py-1.5", bg)}>
      {isPreparing ? (
        <Loader2 className="size-3 animate-spin text-cyan-400" />
      ) : (
        <div
          className={cn("size-1.5 rounded-full", dot, status === "running" && "animate-pulse")}
        />
      )}
      <span className={cn("text-[10px] font-semibold uppercase tracking-[0.06em]", text)}>
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
      <button
        type="button"
        onClick={onBack}
        className="flex size-9 items-center justify-center rounded-lg bg-[var(--launcher-card-hover-bg)] text-foreground/40 transition-all hover:bg-[var(--launcher-card-hover-bg)] hover:text-foreground/70"
        aria-label="Back"
      >
        <ChevronLeft className="size-4" />
      </button>

      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/25 to-sky-500/25 ring-1 ring-cyan-500/20">
          <Wifi className="size-4 text-cyan-400" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-[14px] font-semibold tracking-[-0.02em] text-foreground/90">Speed Test</h1>
          <p className="text-[11px] text-foreground/40">Network diagnostics</p>
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
  const gradientFrom = isDownload ? "from-cyan-500/20" : "from-violet-500/20";
  const gradientTo = isDownload ? "to-sky-500/20" : "to-purple-500/20";
  const iconColor = isDownload ? "text-cyan-400" : "text-violet-400";
  const ringColor = isDownload ? "ring-cyan-500/15" : "ring-violet-500/15";

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
              "flex size-8 items-center justify-center rounded-xl bg-gradient-to-br ring-1",
              gradientFrom,
              gradientTo,
              ringColor,
            )}
          >
            {isDownload ? (
              <ArrowDown className={cn("size-4", iconColor)} />
            ) : (
              <ArrowUp className={cn("size-4", iconColor)} />
            )}
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-foreground/45">
            {label}
          </span>
        </div>

        {p90Value !== null && (
          <span className="text-[10px] text-foreground/25">
            P90: <span className="font-mono text-foreground/40">{formatMetricValue(p90Value, 0)}</span>
          </span>
        )}
      </div>

      {/* Speed value */}
      <div className="mb-4 flex items-baseline gap-1.5">
        <span
          className={cn(
            "font-mono text-[40px] font-bold leading-none tracking-[-0.03em] text-foreground/95",
            isRunning && valueMbps === null && "animate-pulse",
          )}
        >
          {formatMetricValue(valueMbps, 1)}
        </span>
        <span className="font-mono text-[14px] font-medium text-foreground/40">Mbps</span>
      </div>

      {/* Mini chart - takes remaining space */}
      <div className="mt-auto h-[60px] w-full">
        {data.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
              <defs>
                <linearGradient id={`speedtest-${metric}-gradient`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <Area
                dataKey={metric}
                type="monotone"
                fill={`url(#speedtest-${metric}-gradient)`}
                stroke={color}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="flex gap-0.5">
              {[...Array(16)].map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-1 rounded-full transition-all",
                    isRunning ? "speedtest-sample-bar" : "bg-[var(--launcher-card-hover-bg)]",
                  )}
                  style={{
                    height: `${12 + Math.random() * 32}px`,
                    animationDelay: `${i * 60}ms`,
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

/* =============================================================================
   METRIC CARD - Compact stat display
   ============================================================================= */

interface MetricCardProps {
  label: string;
  value: number | null;
  unit: string;
  icon: React.ReactNode;
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
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-foreground/45">
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="font-mono text-[32px] font-bold tracking-[-0.02em] text-foreground/90">
          {formatMetricValue(value, 1)}
        </span>
        <span className="font-mono text-[13px] font-medium text-foreground/35">{unit}</span>
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
    <div className="speedtest-error flex items-start gap-3 rounded-xl bg-red-500/10 px-4 py-3 ring-1 ring-red-500/20">
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-red-400" />
      <p className="text-[12px] leading-relaxed text-red-300/90">{message}</p>
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
    <footer className="speedtest-footer flex h-12 shrink-0 items-center justify-between border-t border-[var(--launcher-card-border)] px-5">
      {/* Left side - status and action buttons */}
      <div className="flex items-center gap-3">
        {/* Pause/Resume button - only show when running or paused */}
        {hasStarted && !isFinished && (
          <button
            type="button"
            onClick={onPauseResume}
            disabled={isPreparing}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all",
              "bg-[var(--launcher-card-hover-bg)] text-foreground/60 ring-1 ring-[var(--launcher-card-border)]",
              "hover:bg-[var(--launcher-card-hover-bg)] hover:text-foreground/80",
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
          </button>
        )}

        {/* Restart button - show when finished or paused */}
        {hasStarted && (isFinished || isPaused) && (
          <button
            type="button"
            onClick={onRestart}
            disabled={isPreparing}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all",
              "bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/20",
              "hover:bg-cyan-500/25 hover:text-cyan-300",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            <RotateCcw className="size-3" />
            Restart
          </button>
        )}

        {/* Status text when no buttons */}
        {(!hasStarted || (isRunning && !isPaused)) && (
          <span className="text-[11px] font-medium text-foreground/35">
            {isPreparing ? "Preparing..." : isRunning ? "Testing..." : "Ready"}
          </span>
        )}
      </div>

      {/* Right side - keyboard hints */}
      <div className="flex items-center gap-4 text-[11px] text-foreground/25">
        <span className="flex items-center gap-1.5">
          <kbd className="rounded-md bg-[var(--launcher-card-hover-bg)] px-1.5 py-0.5 font-mono text-[10px] text-foreground/40">
            Enter
          </kbd>
          <span className="text-foreground/35">{hasStarted ? "Restart" : "Start"}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <kbd className="rounded-md bg-[var(--launcher-card-hover-bg)] px-1.5 py-0.5 font-mono text-[10px] text-foreground/40">
            Esc
          </kbd>
          <span className="text-foreground/35">Back</span>
        </span>
      </div>
    </footer>
  );
}
