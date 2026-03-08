import { Link2 } from "lucide-react";

import { UnifiedIcon } from "@/components/icons/unified-icon";
import { cn } from "@/lib/utils";

interface ExtensionIconProps {
  iconReference?: string | null;
  title: string;
  className?: string;
}

export function ExtensionIcon({ iconReference, title, className }: ExtensionIconProps) {
  return (
    <UnifiedIcon
      icon={iconReference}
      className={cn(
        "size-10 shrink-0 rounded-xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] object-cover",
        className,
      )}
      fallback={
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] text-muted-foreground",
            className,
          )}
          title={`${title} icon`}
        >
          <Link2 className="size-4" />
        </div>
      }
    />
  );
}

