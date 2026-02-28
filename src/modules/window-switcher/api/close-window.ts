import { invoke } from "@tauri-apps/api/core";

import { assertDesktopRuntime, getInvokeErrorMessage } from "@/modules/window-switcher/api/runtime";

export async function closeWindow(windowId: string): Promise<void> {
  const normalizedWindowId = windowId.trim();
  if (!normalizedWindowId) {
    throw new Error("Window id is required.");
  }

  assertDesktopRuntime();

  try {
    await invoke("close_window", { windowId: normalizedWindowId });
  } catch (error) {
    throw new Error(getInvokeErrorMessage(error, "Failed to close the selected window."));
  }
}
