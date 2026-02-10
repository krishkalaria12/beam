import { convertFileSrc, isTauri } from "@tauri-apps/api/core";
import { AppWindow } from "lucide-react";
import { useState } from "react";

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

  if (normalizedPath.startsWith("asset:") || normalizedPath.startsWith("tauri://")) {
    return normalizedPath;
  }

  if (normalizedPath.startsWith("http://") || normalizedPath.startsWith("https://")) {
    return normalizedPath;
  }

  if (!isTauri()) {
    return null;
  }

  const localPath = normalizedPath.startsWith("file://")
    ? normalizedPath.slice("file://".length)
    : normalizedPath;

  try {
    return convertFileSrc(localPath, "asset");
  } catch {
    return null;
  }
}

export default function ApplicationIcon({ iconPath, className }: ApplicationIconProps) {
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
}
