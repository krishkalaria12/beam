import { AppWindow } from "lucide-react";

import { UnifiedIcon } from "@/components/icons/unified-icon";
import { cn } from "@/lib/utils";

type ApplicationIconProps = {
  iconPath: string;
  className?: string;
};

export default function ApplicationIcon({ iconPath, className }: ApplicationIconProps) {
  return (
    <UnifiedIcon
      icon={iconPath}
      className={cn("size-6 rounded-sm object-cover", className)}
      fallback={<AppWindow className={cn("size-6 text-muted-foreground/50", className)} />}
    />
  );
}
