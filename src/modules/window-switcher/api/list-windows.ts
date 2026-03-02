import { invoke } from "@tauri-apps/api/core";
import { z } from "zod";

import { assertDesktopRuntime, getInvokeErrorMessage } from "@/modules/window-switcher/api/runtime";
import type { WindowEntry } from "@/modules/window-switcher/types";

const windowEntrySchema = z.object({
  id: z
    .string()
    .default("")
    .transform((value) => value.trim()),
  title: z
    .string()
    .default("")
    .transform((value) => value.trim()),
  app_name: z
    .string()
    .default("")
    .transform((value) => value.trim()),
  app_icon: z
    .string()
    .default("")
    .transform((value) => value.trim()),
  workspace: z
    .string()
    .default("")
    .transform((value) => value.trim()),
  is_focused: z.boolean().default(false),
});

const windowsSchema = z.array(windowEntrySchema);

export async function listWindows(): Promise<WindowEntry[]> {
  assertDesktopRuntime();

  try {
    const payload = await invoke<unknown>("list_windows");
    const parsed = windowsSchema.safeParse(payload);

    if (!parsed.success) {
      throw new Error("Invalid window switcher response from backend.");
    }

    return parsed.data.map((entry) => ({
      id: entry.id,
      title: entry.title,
      appName: entry.app_name,
      appIcon: entry.app_icon,
      workspace: entry.workspace,
      isFocused: entry.is_focused,
    }));
  } catch (error) {
    throw new Error(getInvokeErrorMessage(error, "Failed to load open windows."));
  }
}
