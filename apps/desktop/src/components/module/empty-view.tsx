import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface EmptyViewProps {
  icon?: ReactNode;
  title?: string;
  description?: string;
  className?: string;
  style?: CSSProperties;
  contentClassName?: string;
  contentStyle?: CSSProperties;
  titleClassName?: string;
  descriptionClassName?: string;
}

export function EmptyView({
  icon,
  title = "No results",
  description,
  className,
  style,
  contentClassName,
  contentStyle,
  titleClassName,
  descriptionClassName,
}: EmptyViewProps) {
  return (
    <div
      className={cn(
        "module-empty-view flex h-full min-h-[180px] items-center justify-center px-6 py-10",
        className,
      )}
      style={style}
    >
      <div
        className={cn("module-empty-view-content w-full max-w-sm text-center", contentClassName)}
        style={contentStyle}
      >
        {icon ? (
          <div className="module-empty-view-icon mx-auto mb-3 flex justify-center text-muted-foreground">
            {icon}
          </div>
        ) : null}
        {title ? (
          <p
            className={cn(
              "module-empty-view-title text-launcher-md font-medium text-foreground",
              titleClassName,
            )}
          >
            {title}
          </p>
        ) : null}
        {description ? (
          <p
            className={cn(
              "module-empty-view-description text-launcher-sm mt-1 leading-5 text-muted-foreground",
              descriptionClassName,
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
