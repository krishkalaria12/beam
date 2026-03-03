import { invoke, isTauri } from "@tauri-apps/api/core";
import { useEffect } from "react";

const AI_WINDOW_WIDTH = 1100;
const AI_WINDOW_HEIGHT = 750;
const LAUNCHER_DEFAULT_WIDTH = 960;
const LAUNCHER_DEFAULT_HEIGHT = 520;

async function resizeLauncherWindow(width: number, height: number): Promise<void> {
  if (!isTauri()) {
    return;
  }

  const normalizedHeight = Math.max(440, Math.ceil(height));
  try {
    await invoke("set_launcher_window_size", {
      width,
      height: normalizedHeight,
    });
  } catch (error) {
    console.error("Failed to resize launcher window:", error);
  }
}

export function useAiWindowSizer() {
  useEffect(() => {
    if (!isTauri()) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      void resizeLauncherWindow(AI_WINDOW_WIDTH, AI_WINDOW_HEIGHT);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (!isTauri()) {
        return;
      }
      void resizeLauncherWindow(LAUNCHER_DEFAULT_WIDTH, LAUNCHER_DEFAULT_HEIGHT);
    };
  }, []);
}
