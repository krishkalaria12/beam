import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface CommandKeyHintProps {
  keyLabel: ReactNode;
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
  order = "key-first",
}: CommandKeyHintProps) {
  const keycap = (
    <kbd
      className={cn(
        "rounded border border-border/60 bg-muted/30 px-1 py-0.5 font-mono text-[9px] text-foreground/70",
        keyClassName,
      )}
    >
      {keyLabel}
    </kbd>
  );

  const labelNode = (
    <span className={cn("text-current", labelClassName)}>
      {label}
    </span>
  );

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {order === "label-first" ? (
        <>
          {labelNode}
          {keycap}
        </>
      ) : (
        <>
          {keycap}
          {labelNode}
        </>
      )}
    </div>
  );
}
