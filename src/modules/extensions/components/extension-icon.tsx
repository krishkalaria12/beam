import { Link2 } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { resolveExtensionIconSource } from "@/modules/extensions/lib/icon";

interface ExtensionIconProps {
  iconReference?: string | null;
  title: string;
  className?: string;
}

export function ExtensionIcon({ iconReference, title, className }: ExtensionIconProps) {
  const imageSource = resolveExtensionIconSource(iconReference);
  const [failedSource, setFailedSource] = useState<string | null>(null);

  if (!imageSource || failedSource === imageSource) {
    return (
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background/60 text-muted-foreground",
          className,
        )}
      >
        <Link2 className="size-4" />
      </div>
    );
  }

  return (
    <img
      src={imageSource}
      alt={`${title} icon`}
      className={cn(
        "size-10 shrink-0 rounded-xl border border-border/60 bg-background/40 object-cover",
        className,
      )}
      loading="lazy"
      onError={() => {
        setFailedSource(imageSource);
      }}
    />
  );
}
