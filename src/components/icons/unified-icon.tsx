import { ImageIcon } from "lucide-react";
import { useMemo, useState } from "react";

import {
  resolveLucideIconByToken,
} from "@/components/icons/icon-registry";
import { cn } from "@/lib/utils";
import { resolveExtensionIconSource } from "@/modules/extensions/lib/icon";

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

function isThemeableValue(value: unknown): value is ThemeableValue {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as ThemeableValue).light === "string" &&
      typeof (value as ThemeableValue).dark === "string",
  );
}

function resolveThemeableValue(value: string | ThemeableValue | undefined): string {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  const prefersDark = typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches;

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

  if (value.startsWith("data:") || value.startsWith("http") || value.startsWith("asset:") || value.startsWith("tauri://")) {
    return false;
  }

  if (/\p{Extended_Pictographic}/u.test(value)) {
    return true;
  }

  return /^[^\w\s]{1,4}$/u.test(value);
}

function resolveDirectImageSource(rawValue: string): string | null {
  const value = rawValue.trim();
  if (!value) {
    return null;
  }

  const looksLikePath = value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:") ||
    value.startsWith("file://") ||
    value.startsWith("asset:") ||
    value.startsWith("tauri://") ||
    value.includes("/") ||
    value.includes("\\") ||
    /\.(svg|png|jpe?g|gif|webp|ico|tiff?)$/i.test(value);

  if (!looksLikePath) {
    return null;
  }

  const resolved = resolveExtensionIconSource(value);
  if (resolved) {
    return resolved;
  }

  if (value.startsWith("/") && (value.includes("/assets/") || value.includes("/src/"))) {
    return value;
  }

  if (/\.(svg|png|jpe?g|gif|webp|ico|tiff?)$/i.test(value)) {
    return value;
  }

  return null;
}

interface UnifiedIconProps {
  icon: unknown;
  className?: string;
  fallback?: React.ReactNode;
}

export function UnifiedIcon({ icon, className, fallback }: UnifiedIconProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const imageValue = useMemo(() => resolveImageValue(icon), [icon]);
  const iconSource = imageValue ? resolveDirectImageSource(imageValue.value) : null;

  if (iconSource && failedSource !== iconSource) {
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
          setFailedSource(iconSource);
        }}
      />
    );
  }

  const tokenCandidate = imageValue?.value?.trim() ?? "";
  const Lucide = tokenCandidate ? resolveLucideIconByToken(tokenCandidate) : null;
  if (Lucide) {
    return <Lucide className={cn("size-4", className)} />;
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
