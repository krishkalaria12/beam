import { invoke, isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { useLayoutEffect, useRef } from "react";

import { useMountEffect } from "@/hooks/use-mount-effect";

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

  try {
    const currentWindow = getCurrentWindow();
    const size = new LogicalSize(normalizedWidth, normalizedHeight);
    await currentWindow.setMinSize(size);
    await currentWindow.setMaxSize(size);
    await currentWindow.setSize(size);
    await currentWindow.center();
  } catch (error) {
    console.error("Failed to sync launcher window geometry:", error);
  }
}

export function useLauncherWindowSizer(
  activeSize: LauncherWindowSize,
  resetSize: LauncherWindowSize,
) {
  const resetSizeRef = useRef(resetSize);
  resetSizeRef.current = resetSize;

  useLayoutEffect(() => {
    if (!isTauri()) {
      return;
    }

    const delays = [0, 48];
    const timers: number[] = [];

    const scheduleResize = (width: number, height: number) => {
      for (const delay of delays) {
        timers.push(
          window.setTimeout(() => {
            void resizeLauncherWindow(width, height);
          }, delay),
        );
      }
    };

    scheduleResize(activeSize.width, activeSize.height);

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, [activeSize.height, activeSize.width]);

  useMountEffect(() => {
    return () => {
      if (!isTauri()) {
        return;
      }

      void resizeLauncherWindow(resetSizeRef.current.width, resetSizeRef.current.height);
      window.setTimeout(() => {
        void resizeLauncherWindow(resetSizeRef.current.width, resetSizeRef.current.height);
      }, 48);
    };
  });
}
