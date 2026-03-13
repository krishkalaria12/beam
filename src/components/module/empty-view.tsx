import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface EmptyViewProps {
  icon?: ReactNode;
  title?: string;
  description?: string;
  className?: string;
  contentClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
}

export function EmptyView({
  icon,
  title = "No results",
  description,
  className,
  contentClassName,
  titleClassName,
  descriptionClassName,
}: EmptyViewProps) {
  return (
    <div className={cn("flex h-full min-h-[180px] items-center justify-center px-6 py-10", className)}>
      <div className={cn("w-full max-w-sm text-center", contentClassName)}>
        {icon ? <div className="mx-auto mb-3 flex justify-center text-muted-foreground">{icon}</div> : null}
        {title ? (
          <p className={cn("text-[13px] font-medium text-foreground", titleClassName)}>{title}</p>
        ) : null}
        {description ? (
          <p className={cn("mt-1 text-[12px] leading-5 text-muted-foreground", descriptionClassName)}>
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
