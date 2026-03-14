import type { CSSProperties, ReactNode, UIEventHandler } from "react";

import { cn } from "@/lib/utils";

interface GenericGridViewProps {
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  style?: CSSProperties;
  contentClassName?: string;
  contentStyle?: CSSProperties;
  onScroll?: UIEventHandler<HTMLDivElement>;
}

export function GenericGridView({
  children,
  footer,
  className,
  style,
  contentClassName,
  contentStyle,
  onScroll,
}: GenericGridViewProps) {
  return (
    <div className={cn("module-generic-grid-view min-h-0 flex flex-1 flex-col overflow-hidden", className)} style={style}>
      <div
        className={cn(
          "module-generic-grid-content",
          "custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3",
          contentClassName,
        )}
        style={contentStyle}
        onScroll={onScroll}
      >
        {children}
      </div>
      {footer}
    </div>
  );
}
