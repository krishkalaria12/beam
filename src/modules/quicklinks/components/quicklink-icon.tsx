import { Link2 } from "lucide-react";

import { resolveIconAssetSource } from "@/components/icons/icon-registry";
import { UnifiedIcon } from "@/components/icons/unified-icon";
import { cn } from "@/lib/utils";

interface QuicklinkIconProps {
  icon?: string | null;
  isFileTarget?: boolean;
  className?: string;
  fallbackClassName?: string;
}

export function QuicklinkIcon({
  icon,
  isFileTarget = false,
  className,
  fallbackClassName,
}: QuicklinkIconProps) {
  const iconSource = isFileTarget ? resolveIconAssetSource("file-quicklink") : icon;

  return (
    <UnifiedIcon
      icon={iconSource}
      className={cn("rounded object-cover", className)}
      fallback={(
        <div className={cn("flex items-center justify-center rounded bg-muted", fallbackClassName ?? className)}>
          <Link2 className="size-4 text-muted-foreground" />
        </div>
      )}
    />
  );
}
