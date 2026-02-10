import { convertFileSrc, isTauri } from "@tauri-apps/api/core";
import { AppWindow } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

type ApplicationIconProps = {
  iconPath: string;
  className?: string;
};

function getImageSource(iconPath: string) {
  const normalizedPath = iconPath.trim();

  if (!normalizedPath) {
    return null;
  }

  if (normalizedPath.startsWith("http://") || normalizedPath.startsWith("https://")) {
    return normalizedPath;
  }

  if (normalizedPath.startsWith("asset:") || normalizedPath.startsWith("tauri://")) {
    return normalizedPath;
  }

  if (normalizedPath.startsWith("file://")) {
    if (!isTauri()) {
      return null;
    }

    const localPath = normalizedPath.replace("file://", "");

    try {
      return convertFileSrc(localPath, "asset");
    } catch {
      return null;
    }
  }

  if (!isTauri()) {
    return null;
  }

  try {
    return convertFileSrc(normalizedPath, "asset");
  } catch {
    return null;
  }
}

export default function ApplicationIcon({ iconPath, className }: ApplicationIconProps) {
  const [hasError, setHasError] = useState(false);
  const imageSource = useMemo(() => getImageSource(iconPath), [iconPath]);

  useEffect(() => {
    setHasError(false);
  }, [iconPath]);

  if (!imageSource || hasError) {
    return <AppWindow className={cn("size-4 text-zinc-300", className)} />;
  }

  return (
    <img
      src={imageSource}
      alt="application icon"
      loading="lazy"
      className={cn("size-4 rounded-sm object-cover", className)}
      onError={() => setHasError(true)}
    />
  );
}
