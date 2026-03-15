import { cn } from "@/lib/utils";

interface CommandSkeletonProps {
  /** Number of skeleton rows */
  rows?: number;
  /** Show icon placeholder */
  showIcon?: boolean;
  /** Show subtitle line */
  showSubtitle?: boolean;
  /** Animate the shimmer effect */
  animate?: boolean;
  className?: string;
}

export function CommandSkeleton({
  rows = 3,
  showIcon = true,
  showSubtitle = false,
  animate = true,
  className,
}: CommandSkeletonProps) {
  return (
    <div className={cn("space-y-1 px-2 py-2", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <CommandSkeletonRow
          key={i}
          showIcon={showIcon}
          showSubtitle={showSubtitle}
          animate={animate}
          style={{ animationDelay: `${i * 100}ms` }}
        />
      ))}
    </div>
  );
}

interface CommandSkeletonRowProps {
  showIcon?: boolean;
  showSubtitle?: boolean;
  animate?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/** Single skeleton row for inline use */
export function CommandSkeletonRow({
  showIcon = true,
  showSubtitle = false,
  animate = true,
  className,
  style,
}: CommandSkeletonRowProps) {
  const shimmerClass = animate ? "skeleton" : "bg-muted/50";

  return (
    <div className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5", className)} style={style}>
      {/* Icon skeleton */}
      {showIcon && <div className={cn("size-8 shrink-0 rounded-md", shimmerClass)} />}

      {/* Text content skeleton */}
      <div className="flex-1 space-y-2">
        <div
          className={cn("h-4 rounded", shimmerClass)}
          style={{ width: `${55 + Math.random() * 35}%` }}
        />
        {showSubtitle && (
          <div
            className={cn("h-3 rounded", shimmerClass)}
            style={{ width: `${35 + Math.random() * 25}%` }}
          />
        )}
      </div>

      {/* Optional right accessory skeleton */}
      <div className={cn("h-5 w-12 shrink-0 rounded", shimmerClass)} />
    </div>
  );
}

/** Grid skeleton for card layouts */
export function CommandSkeletonGrid({
  items = 6,
  columns = 3,
  animate = true,
  className,
}: {
  items?: number;
  columns?: number;
  animate?: boolean;
  className?: string;
}) {
  const shimmerClass = animate ? "skeleton" : "bg-muted/50";

  return (
    <div
      className={cn("grid gap-3 p-3", className)}
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-2 rounded-lg p-3"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <div className={cn("aspect-square w-full rounded-md", shimmerClass)} />
          <div className={cn("h-3 w-3/4 rounded", shimmerClass)} />
        </div>
      ))}
    </div>
  );
}

/** Text block skeleton for detail views */
export function CommandSkeletonText({
  lines = 4,
  animate = true,
  className,
}: {
  lines?: number;
  animate?: boolean;
  className?: string;
}) {
  const shimmerClass = animate ? "skeleton" : "bg-muted/50";

  return (
    <div className={cn("space-y-2.5 p-4", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn("h-3 rounded", shimmerClass)}
          style={{
            width: i === lines - 1 ? `${40 + Math.random() * 30}%` : `${80 + Math.random() * 20}%`,
            animationDelay: `${i * 75}ms`,
          }}
        />
      ))}
    </div>
  );
}
