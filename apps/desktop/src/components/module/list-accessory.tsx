import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface ListAccessoryProps {
  text: ReactNode;
  accentColor?: string;
  fill?: boolean;
  icon?: ReactNode;
  tooltip?: string;
  className?: string;
  style?: CSSProperties;
}

export function ListAccessory({
  text,
  accentColor,
  fill = false,
  icon,
  tooltip,
  className,
  style,
}: ListAccessoryProps) {
  return (
    <span
      className={cn(
        "module-list-accessory",
        "inline-flex items-center gap-1 text-launcher-xs text-muted-foreground",
        fill &&
          "module-list-accessory-filled rounded-md border border-[var(--launcher-chip-border)] bg-[var(--launcher-chip-bg)] px-2 py-0.5",
        className,
      )}
      style={{ ...(accentColor ? { color: accentColor } : undefined), ...style }}
      title={tooltip}
    >
      {icon ? <span className="module-list-accessory-icon shrink-0 [&_svg]:size-3.5">{icon}</span> : null}
      <span className="module-list-accessory-text">{text}</span>
    </span>
  );
}
