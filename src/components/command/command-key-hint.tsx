import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface CommandKeyHintProps {
  keyLabel: ReactNode | ReactNode[];
  label: ReactNode;
  className?: string;
  keyClassName?: string;
  labelClassName?: string;
  order?: "key-first" | "label-first";
}

export function CommandKeyHint({
  keyLabel,
  label,
  className,
  keyClassName,
  labelClassName,
  order = "label-first",
}: CommandKeyHintProps) {
  const keyLabels = Array.isArray(keyLabel) ? keyLabel : [keyLabel];
  const keycaps = (
    <div className="flex items-center gap-1">
      {keyLabels.map((entry, index) => (
        <kbd
          key={`key:${index}`}
          className={cn(
            "inline-flex h-[22px] min-w-[22px] items-center justify-center rounded px-1.5 font-mono text-[11px] font-medium text-muted-foreground",
            "bg-[var(--kbd-bg)]",
            keyClassName,
          )}
        >
          {entry}
        </kbd>
      ))}
    </div>
  );

  const labelNode = (
    <span className={cn("text-xs font-normal text-muted-foreground", labelClassName)}>{label}</span>
  );

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {order === "label-first" ? (
        <>
          {labelNode}
          {keycaps}
        </>
      ) : (
        <>
          {keycaps}
          {labelNode}
        </>
      )}
    </div>
  );
}
