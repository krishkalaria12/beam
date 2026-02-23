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
        "size-10 shrink-0 rounded-xl border border-border/60 bg-background/40 object-cover",
        className,
      )}
      fallback={(
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background/60 text-muted-foreground",
            className,
          )}
          title={`${title} icon`}
        >
          <Link2 className="size-4" />
        </div>
      )}
    />
  );
}
