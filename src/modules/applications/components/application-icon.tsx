import { convertFileSrc, isTauri } from "@tauri-apps/api/core";
import { AppWindow } from "lucide-react";
import { memo, useState } from "react";

import { cn } from "@/lib/utils";

type ApplicationIconProps = {
  iconPath: string;
  className?: string;
};

const iconSourceCache = new Map<string, string | null>();

function getImageSource(iconPath: string) {
  const normalizedPath = iconPath.trim();

  if (iconSourceCache.has(normalizedPath)) {
    return iconSourceCache.get(normalizedPath) ?? null;
  }

  if (!normalizedPath) {
    iconSourceCache.set(normalizedPath, null);
    return null;
  }

  if (normalizedPath.startsWith("asset:") || normalizedPath.startsWith("tauri://")) {
    iconSourceCache.set(normalizedPath, normalizedPath);
    return normalizedPath;
  }

  if (normalizedPath.startsWith("http://") || normalizedPath.startsWith("https://")) {
    iconSourceCache.set(normalizedPath, normalizedPath);
    return normalizedPath;
  }

  if (!isTauri()) {
    iconSourceCache.set(normalizedPath, null);
    return null;
  }

  const localPath = normalizedPath.startsWith("file://")
    ? normalizedPath.slice("file://".length)
    : normalizedPath;

  try {
    const source = convertFileSrc(localPath, "asset");
    iconSourceCache.set(normalizedPath, source);
    return source;
  } catch {
    iconSourceCache.set(normalizedPath, null);
    return null;
  }
}

const ApplicationIcon = memo(function ApplicationIcon({ iconPath, className }: ApplicationIconProps) {
  const imageSource = getImageSource(iconPath);
  const [failedSource, setFailedSource] = useState<string | null>(null);

  if (!imageSource || failedSource === imageSource) {
    return <AppWindow className={cn("size-4 text-zinc-300", className)} />;
  }

  return (
    <img
      src={imageSource}
      alt="application icon"
      loading="lazy"
      className={cn("size-4 rounded-sm object-cover", className)}
      onError={() => setFailedSource(imageSource)}
    />
  );
});

export default ApplicationIcon;
