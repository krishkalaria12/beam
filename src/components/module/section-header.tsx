import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: ReactNode;
  className?: string;
  titleClassName?: string;
}

export function SectionHeader({ title, className, titleClassName }: SectionHeaderProps) {
  return (
    <div className={cn("flex h-7 items-center px-2", className)}>
      <div className={cn("text-[11px] font-medium text-muted-foreground", titleClassName)}>
        {title}
      </div>
    </div>
  );
}
