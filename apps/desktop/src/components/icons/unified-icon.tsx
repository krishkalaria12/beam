import { ImageIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { resolveLucideIconByToken } from "@/components/icons/icon-registry";
import {
  ensurePhosphorIconByToken,
  getCachedPhosphorIconByToken,
  type ResolvedPhosphorIcon,
} from "@/components/icons/phosphor-runtime";
import { cn } from "@/lib/utils";
import { resolveExtensionIconSources } from "@/modules/extensions/lib/icon";

export interface ThemeableValue {
  light: string;
  dark: string;
}

interface ImageLikeObject {
  source?: string | ThemeableValue;
  fallback?: string | ThemeableValue;
  fileIcon?: string;
  tintColor?: string | ThemeableValue;
  mask?: "circle" | "roundedRectangle";
}

function resolveThemeableValue(value: string | ThemeableValue | undefined): string {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  const prefersDark =
    typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;

  return prefersDark ? value.dark : value.light;
}

function resolveMaskClass(mask: unknown): string | undefined {
  if (mask === "circle") {
    return "rounded-full";
  }
  if (mask === "roundedRectangle") {
    return "rounded-md";
  }

  return undefined;
}

function resolveImageValue(icon: unknown): {
  value: string;
  tintColor?: string;
  maskClass?: string;
} | null {
  if (typeof icon === "string") {
    return { value: icon.trim() };
  }

  if (!icon || typeof icon !== "object") {
    return null;
  }

  const image = icon as ImageLikeObject;
  const sourceValue = resolveThemeableValue(image.source);
  const fileIconValue = typeof image.fileIcon === "string" ? image.fileIcon.trim() : "";
  const fallbackValue = resolveThemeableValue(image.fallback);
  const value = sourceValue || fileIconValue || fallbackValue;

  if (!value) {
    return null;
  }

  return {
    value,
    tintColor: resolveThemeableValue(image.tintColor) || undefined,
    maskClass: resolveMaskClass(image.mask),
  };
}

function isEmojiOrSymbol(value: string): boolean {
  if (!value) {
    return false;
  }

  if (
    value.startsWith("data:") ||
    value.startsWith("http") ||
    value.startsWith("asset:") ||
    value.startsWith("tauri://")
  ) {
    return false;
  }

  if (/\p{Extended_Pictographic}/u.test(value)) {
    return true;
  }

  return /^[^\w\s]{1,4}$/u.test(value);
}

function resolveDirectImageSources(
  rawValue: string,
  extensionDirectory?: string | null,
): string[] {
  const value = rawValue.trim();
  if (!value) {
    return [];
  }

  const looksLikePath =
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:") ||
    value.startsWith("file://") ||
    value.startsWith("asset:") ||
    value.startsWith("tauri://") ||
    value.includes("/") ||
    value.includes("\\") ||
    /\.(svg|png|jpe?g|gif|webp|ico|tiff?)$/i.test(value);

  if (!looksLikePath) {
    return [];
  }

  // Keep web-bundled asset paths as-is (Vite dev/build). Converting these to
  // Tauri asset protocol triggers scope checks for non-filesystem URLs.
  if (
    value.startsWith("/src/") ||
    value.startsWith("/assets/") ||
    value.startsWith("/@fs/") ||
    value.startsWith("/@id/")
  ) {
    return [value];
  }

  const resolved = resolveExtensionIconSources(value, { baseDirectory: extensionDirectory });
  if (resolved.length > 0) {
    return resolved;
  }

  if (value.startsWith("/") && (value.includes("/assets/") || value.includes("/src/"))) {
    return [value];
  }

  if (extensionDirectory && !/^(?:[A-Za-z][A-Za-z\d+\-.]*:|\/|\\|[A-Za-z]:[\\/])/.test(value)) {
    return [];
  }

  if (/\.(svg|png|jpe?g|gif|webp|ico|tiff?)$/i.test(value)) {
    return [value];
  }

  return [];
}

interface UnifiedIconProps {
  icon: unknown;
  className?: string;
  fallback?: React.ReactNode;
  extensionDirectory?: string | null;
}

export function UnifiedIcon({
  icon,
  className,
  fallback,
  extensionDirectory,
}: UnifiedIconProps) {
  const [failedImage, setFailedImage] = useState(false);
  const [sourceIndex, setSourceIndex] = useState(0);
  const imageValue = useMemo(() => resolveImageValue(icon), [icon]);
  const iconSources = useMemo(
    () =>
      imageValue ? resolveDirectImageSources(imageValue.value, extensionDirectory) : [],
    [extensionDirectory, imageValue],
  );
  const iconSource = iconSources[sourceIndex] ?? null;
  const tokenCandidate = imageValue?.value?.trim() ?? "";
  const lucideIcon = tokenCandidate ? resolveLucideIconByToken(tokenCandidate) : null;
  const [phosphorIcon, setPhosphorIcon] = useState<ResolvedPhosphorIcon | null>(() =>
    tokenCandidate ? getCachedPhosphorIconByToken(tokenCandidate) : null,
  );
  const iconSourcesKey = iconSources.join("\n");

  useEffect(() => {
    if (!tokenCandidate || lucideIcon) {
      setPhosphorIcon(null);
      return;
    }

    const cached = getCachedPhosphorIconByToken(tokenCandidate);
    if (cached) {
      setPhosphorIcon(cached);
      return;
    }

    setPhosphorIcon(null);

    let cancelled = false;
    void ensurePhosphorIconByToken(tokenCandidate).then((resolved) => {
      if (!cancelled) {
        setPhosphorIcon(resolved);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [tokenCandidate, lucideIcon]);

  useEffect(() => {
    setFailedImage(false);
    setSourceIndex(0);
  }, [iconSourcesKey]);

  if (iconSource && !failedImage) {
    if (imageValue?.tintColor) {
      return (
        <span
          className={cn("inline-block bg-current", imageValue.maskClass, className)}
          style={{
            color: imageValue.tintColor,
            WebkitMaskImage: `url(${iconSource})`,
            WebkitMaskRepeat: "no-repeat",
            WebkitMaskSize: "contain",
            WebkitMaskPosition: "center",
            maskImage: `url(${iconSource})`,
            maskRepeat: "no-repeat",
            maskSize: "contain",
            maskPosition: "center",
          }}
          aria-hidden
        />
      );
    }

    return (
      <img
        src={iconSource}
        alt=""
        loading="lazy"
        className={cn("object-contain", imageValue?.maskClass, className)}
        onError={() => {
          if (sourceIndex < iconSources.length - 1) {
            setSourceIndex((previous) => previous + 1);
            return;
          }

          setFailedImage(true);
        }}
      />
    );
  }

  if (lucideIcon) {
    const Lucide = lucideIcon;
    return <Lucide className={cn("size-4", className)} />;
  }

  if (phosphorIcon) {
    const Icon = phosphorIcon.icon;
    return <Icon className={cn("size-4", className)} weight={phosphorIcon.weight} />;
  }

  if (tokenCandidate && isEmojiOrSymbol(tokenCandidate)) {
    return (
      <span className={cn("inline-flex items-center justify-center", className)} aria-hidden>
        {tokenCandidate}
      </span>
    );
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return <ImageIcon className={cn("size-4 text-muted-foreground", className)} />;
}
