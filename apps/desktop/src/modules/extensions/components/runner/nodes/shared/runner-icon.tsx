import { ImageIcon } from "lucide-react";

import { UnifiedIcon } from "@/components/icons/unified-icon";
import { cn } from "@/lib/utils";
import { resolveExtensionDirectory } from "@/modules/extensions/lib/icon";
import { useExtensionRuntimeStore } from "@/modules/extensions/runtime/store";

interface RunnerIconProps {
  icon: unknown;
  className?: string;
}

export function RunnerIcon({ icon, className }: RunnerIconProps) {
  const extensionDirectory = useExtensionRuntimeStore((state) =>
    resolveExtensionDirectory(state.runningSession?.pluginPath),
  );

  return (
    <UnifiedIcon
      icon={icon}
      className={className}
      extensionDirectory={extensionDirectory}
      fallback={
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-md bg-[var(--launcher-chip-bg)] border border-[var(--launcher-chip-border)] text-muted-foreground",
            className,
          )}
          aria-hidden
        >
          <ImageIcon className="size-3.5 opacity-50" />
        </span>
      }
    />
  );
}
