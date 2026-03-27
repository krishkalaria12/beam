import { invoke, isTauri } from "@tauri-apps/api/core";

const LAUNCHER_EXPANDED_HEIGHT = 520;
const DEFAULT_COMPACT_HEIGHT = 60;

function getTargetHeight(compact: boolean, compactHeight?: number) {
  if (!compact) {
    return LAUNCHER_EXPANDED_HEIGHT;
  }

  if (typeof compactHeight === "number" && Number.isFinite(compactHeight)) {
    return Math.max(44, Math.min(LAUNCHER_EXPANDED_HEIGHT, Math.ceil(compactHeight)));
  }

  return DEFAULT_COMPACT_HEIGHT;
}

export async function setLauncherCompactMode(
  compact: boolean,
  compactHeight?: number,
): Promise<void> {
  if (!isTauri()) {
    return;
  }

  const targetHeight = getTargetHeight(compact, compactHeight);

  await invoke("set_launcher_compact_mode", {
    compact,
    compactHeight: targetHeight,
    compact_height: targetHeight,
  });
}
