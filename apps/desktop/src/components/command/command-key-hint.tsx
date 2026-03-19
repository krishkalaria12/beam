import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Kbd } from "@/components/module/kbd";

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
        <Kbd
          key={`key:${index}`}
          className={cn(
            "h-[22px] min-w-[22px] px-1.5 text-launcher-xs font-medium text-muted-foreground",
            keyClassName,
          )}
        >
          {entry}
        </Kbd>
      ))}
    </div>
  );

  const labelNode = (
    <span className={cn("text-launcher-xs font-normal text-muted-foreground", labelClassName)}>{label}</span>
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
