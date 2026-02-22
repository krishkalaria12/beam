import { ImageIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { resolveExtensionIconSource } from "@/modules/extensions/lib/icon";

interface ThemeableValue {
  light: string;
  dark: string;
}

interface ImageLikeObject {
  source?: string | ThemeableValue;
  mask?: "circle" | "roundedRectangle";
  tintColor?: string | ThemeableValue;
  fallback?: string | ThemeableValue;
}

interface FileIconObject {
  fileIcon?: string;
}

function isThemeableValue(value: unknown): value is ThemeableValue {
  return Boolean(
    value &&
    typeof value === "object" &&
    typeof (value as { light?: unknown }).light === "string" &&
    typeof (value as { dark?: unknown }).dark === "string",
  );
}

function resolveThemeableValue(value: string | ThemeableValue | undefined): string {
  if (!value) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }

  const prefersDark = typeof window !== "undefined"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
    : false;
  return prefersDark ? value.dark : value.light;
}

function resolveImageSource(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object") {
    const image = value as ImageLikeObject & FileIconObject;
    if (isThemeableValue(image.source)) {
      return resolveThemeableValue(image.source);
    }
    if (typeof image.source === "string") {
      return image.source;
    }
    if (typeof image.fileIcon === "string") {
      return image.fileIcon;
    }
    if (isThemeableValue(image.fallback)) {
      return resolveThemeableValue(image.fallback);
    }
    if (typeof image.fallback === "string") {
      return image.fallback;
    }
  }

  return "";
}

function resolveTintColor(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }
  if (isThemeableValue(value)) {
    return resolveThemeableValue(value);
  }
  return undefined;
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

interface RunnerIconProps {
  icon: unknown;
  className?: string;
}

export function RunnerIcon({ icon, className }: RunnerIconProps) {
  const imageLike = typeof icon === "object" && icon !== null
    ? (icon as ImageLikeObject & FileIconObject)
    : null;
  const source = resolveImageSource(icon).trim();
  const resolvedSource = source ? resolveExtensionIconSource(source) : null;
  const tintColor = resolveTintColor(imageLike?.tintColor);
  const maskClass = resolveMaskClass(imageLike?.mask);

  if (resolvedSource) {
    if (tintColor) {
      return (
        <span
          className={cn("inline-block bg-current", maskClass, className)}
          style={{
            color: tintColor,
            WebkitMaskImage: `url(${resolvedSource})`,
            WebkitMaskRepeat: "no-repeat",
            WebkitMaskSize: "contain",
            WebkitMaskPosition: "center",
            maskImage: `url(${resolvedSource})`,
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
        src={resolvedSource}
        alt=""
        className={cn("object-contain", maskClass, className)}
        loading="lazy"
      />
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-sm bg-muted/40 text-muted-foreground",
        className,
      )}
      aria-hidden
    >
      <ImageIcon className="size-3.5" />
    </span>
  );
}
