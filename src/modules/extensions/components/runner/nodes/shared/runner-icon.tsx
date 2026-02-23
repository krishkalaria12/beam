import { ImageIcon } from "lucide-react";

import { UnifiedIcon } from "@/components/icons/unified-icon";
import { cn } from "@/lib/utils";

interface RunnerIconProps {
  icon: unknown;
  className?: string;
}

export function RunnerIcon({ icon, className }: RunnerIconProps) {
  return (
    <UnifiedIcon
      icon={icon}
      className={className}
      fallback={(
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-sm bg-muted/40 text-muted-foreground",
            className,
          )}
          aria-hidden
        >
          <ImageIcon className="size-3.5" />
        </span>
      )}
    />
  );
}
