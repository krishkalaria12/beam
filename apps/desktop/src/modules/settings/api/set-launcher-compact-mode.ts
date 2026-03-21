import { invoke, isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";

const LAUNCHER_WIDTH = 960;
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

async function applyWindowSize(compact: boolean, compactHeight?: number) {
  const targetHeight = getTargetHeight(compact, compactHeight);
  const size = new LogicalSize(LAUNCHER_WIDTH, targetHeight);

  const window = getCurrentWindow();
  await window.setMinSize(size);
  await window.setMaxSize(size);
  await window.setSize(size);
}

export async function setLauncherCompactMode(
  compact: boolean,
  compactHeight?: number,
): Promise<void> {
  if (!isTauri()) {
    return;
  }

  const targetHeight = getTargetHeight(compact, compactHeight);

  // Backend path
  await invoke("set_launcher_compact_mode", {
    compact,
    compactHeight: targetHeight,
    compact_height: targetHeight,
  });

  // Frontend sync path (helps with compositor timing quirks)
  try {
    await applyWindowSize(compact, targetHeight);
    setTimeout(() => {
      void applyWindowSize(compact, targetHeight).catch(() => undefined);
    }, 60);
  } catch {
    // Backend path already attempted; ignore fallback errors.
  }
}
