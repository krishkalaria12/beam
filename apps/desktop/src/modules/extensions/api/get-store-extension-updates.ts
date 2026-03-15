import { invoke, isTauri } from "@tauri-apps/api/core";
import { parseExtensionStoreUpdates } from "@beam/extension-protocol";

import type { ExtensionStoreUpdate } from "@/modules/extensions/types";

export async function getStoreExtensionUpdates(): Promise<ExtensionStoreUpdate[]> {
  if (!isTauri()) {
    return [];
  }

  const response = await invoke<unknown>("get_extension_store_updates");
  const parsed = parseExtensionStoreUpdates(response);
  if (!parsed) {
    throw new Error("invalid extension store update response");
  }

  return parsed;
}
