import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface SplitViewProps {
  primary: ReactNode;
  detail?: ReactNode;
  detailVisible?: boolean;
  className?: string;
  style?: CSSProperties;
  primaryClassName?: string;
  primaryStyle?: CSSProperties;
  detailClassName?: string;
  detailStyle?: CSSProperties;
  dividerClassName?: string;
  detailRatio?: string;
  templateColumns?: string;
}

export function SplitView({
  primary,
  detail,
  detailVisible = false,
  className,
  style,
  primaryClassName,
  primaryStyle,
  detailClassName,
  detailStyle,
  dividerClassName,
  detailRatio = "53%",
  templateColumns,
}: SplitViewProps) {
  const showDetail = detailVisible && detail != null;

  return (
    <div
      className={cn("module-split-view min-h-0 flex-1 overflow-hidden", showDetail ? "grid" : "block", className)}
      style={
        showDetail
          ? {
              gridTemplateColumns:
                templateColumns ??
                `minmax(0, calc(100% - ${detailRatio})) minmax(0, ${detailRatio})`,
              ...style,
            }
          : style
      }
    >
      <div className={cn("module-split-view-primary min-h-0 h-full overflow-hidden", primaryClassName)} style={primaryStyle}>
        {primary}
      </div>
      {showDetail ? (
        <div
          className={cn(
            "module-split-view-detail",
            "min-h-0 h-full overflow-hidden border-l border-[var(--ui-divider)]",
            dividerClassName,
            detailClassName,
          )}
          style={detailStyle}
        >
          {detail}
        </div>
      ) : null}
    </div>
  );
}
