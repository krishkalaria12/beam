import { invoke, isTauri } from "@tauri-apps/api/core";

export const DEFAULT_LAUNCHER_OPACITY = 0.96;
export const MIN_LAUNCHER_OPACITY = 0;
export const MAX_LAUNCHER_OPACITY = 1;
export const LAUNCHER_OPACITY_QUERY_KEY = [
  "settings",
  "launcher-opacity",
] as const;
const LAUNCHER_OPACITY_STORAGE_KEY = "beam-launcher-opacity";

function normalizeLauncherOpacity(value: unknown): number {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : Number.NaN;

  if (!Number.isFinite(numeric)) {
    return DEFAULT_LAUNCHER_OPACITY;
  }

  return Math.min(
    MAX_LAUNCHER_OPACITY,
    Math.max(MIN_LAUNCHER_OPACITY, Number(numeric.toFixed(2))),
  );
}

export function applyLauncherOpacity(opacity: number): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.style.setProperty(
    "--beam-launcher-opacity",
    normalizeLauncherOpacity(opacity).toFixed(2),
  );
}

export async function getLauncherOpacity(): Promise<number> {
  if (!isTauri()) {
    return normalizeLauncherOpacity(
      localStorage.getItem(LAUNCHER_OPACITY_STORAGE_KEY),
    );
  }

  const result = await invoke<unknown>("get_launcher_opacity");
  return normalizeLauncherOpacity(result);
}

export async function setLauncherOpacity(opacity: number): Promise<number> {
  const normalized = normalizeLauncherOpacity(opacity);

  if (!isTauri()) {
    localStorage.setItem(LAUNCHER_OPACITY_STORAGE_KEY, String(normalized));
    return normalized;
  }

  const result = await invoke<unknown>("set_launcher_opacity", {
    opacity: normalized,
  });
  return normalizeLauncherOpacity(result);
}
