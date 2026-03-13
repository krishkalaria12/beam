import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface SplitViewProps {
  primary: ReactNode;
  detail?: ReactNode;
  detailVisible?: boolean;
  className?: string;
  primaryClassName?: string;
  detailClassName?: string;
  dividerClassName?: string;
  detailRatio?: string;
  templateColumns?: string;
}

export function SplitView({
  primary,
  detail,
  detailVisible = false,
  className,
  primaryClassName,
  detailClassName,
  dividerClassName,
  detailRatio = "53%",
  templateColumns,
}: SplitViewProps) {
  const showDetail = detailVisible && detail != null;

  return (
    <div
      className={cn("min-h-0 flex-1", showDetail ? "grid" : "block", className)}
      style={
        showDetail
          ? {
              gridTemplateColumns:
                templateColumns ??
                `minmax(0, calc(100% - ${detailRatio})) minmax(0, ${detailRatio})`,
            }
          : undefined
      }
    >
      <div className={cn("min-h-0", primaryClassName)}>{primary}</div>
      {showDetail ? (
        <div
          className={cn(
            "min-h-0 border-l border-[var(--ui-divider)]",
            dividerClassName,
            detailClassName,
          )}
        >
          {detail}
        </div>
      ) : null}
    </div>
  );
}
