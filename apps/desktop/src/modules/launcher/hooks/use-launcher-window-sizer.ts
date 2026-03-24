import { invoke, isTauri } from "@tauri-apps/api/core";
import { useEffect, useRef } from "react";

interface LauncherWindowSize {
  width: number;
  height: number;
}

async function resizeLauncherWindow(width: number, height: number): Promise<void> {
  if (!isTauri()) {
    return;
  }

  const normalizedWidth = Math.max(640, Math.ceil(width));
  const normalizedHeight = Math.max(440, Math.ceil(height));

  try {
    await invoke("set_launcher_window_size", {
      width: normalizedWidth,
      height: normalizedHeight,
    });
  } catch (error) {
    console.error("Failed to resize launcher window:", error);
  }
}

export function useLauncherWindowSizer(
  activeSize: LauncherWindowSize,
  resetSize: LauncherWindowSize,
) {
  const resetSizeRef = useRef(resetSize);
  resetSizeRef.current = resetSize;

  useEffect(() => {
    if (!isTauri()) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      void resizeLauncherWindow(activeSize.width, activeSize.height);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [activeSize.height, activeSize.width]);

  useEffect(() => {
    return () => {
      if (!isTauri()) {
        return;
      }

      void resizeLauncherWindow(resetSizeRef.current.width, resetSizeRef.current.height);
    };
  }, []);
}
