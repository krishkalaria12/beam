import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: ReactNode;
  className?: string;
  style?: CSSProperties;
  titleClassName?: string;
}

export function SectionHeader({ title, className, style, titleClassName }: SectionHeaderProps) {
  return (
    <div className={cn("module-section-header flex h-7 items-center px-2", className)} style={style}>
      <div
        className={cn(
          "module-section-header-title text-[11px] font-medium text-muted-foreground",
          titleClassName,
        )}
      >
        {title}
      </div>
    </div>
  );
}
