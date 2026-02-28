import { invoke } from "@tauri-apps/api/core";

import { assertDesktopRuntime, getInvokeErrorMessage } from "@/modules/window-switcher/api/runtime";

export async function focusWindow(windowId: string): Promise<void> {
  const normalizedWindowId = windowId.trim();
  if (!normalizedWindowId) {
    throw new Error("Window id is required.");
  }

  assertDesktopRuntime();

  try {
    await invoke("focus_window", { windowId: normalizedWindowId });
  } catch (error) {
    throw new Error(getInvokeErrorMessage(error, "Failed to focus the selected window."));
  }
}
