import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface ListAccessoryProps {
  text: ReactNode;
  accentColor?: string;
  fill?: boolean;
  icon?: ReactNode;
  tooltip?: string;
  className?: string;
}

export function ListAccessory({
  text,
  accentColor,
  fill = false,
  icon,
  tooltip,
  className,
}: ListAccessoryProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] text-muted-foreground",
        fill &&
          "rounded-md border border-[var(--launcher-chip-border)] bg-[var(--launcher-chip-bg)] px-2 py-0.5",
        className,
      )}
      style={accentColor ? { color: accentColor } : undefined}
      title={tooltip}
    >
      {icon ? <span className="shrink-0 [&_svg]:size-3.5">{icon}</span> : null}
      <span>{text}</span>
    </span>
  );
}
