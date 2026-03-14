import { invoke, isTauri } from "@tauri-apps/api/core";
import { parseExtensionStorePackage } from "@beam/extension-protocol";

import type { ExtensionStoreListing } from "@/modules/extensions/types";

export async function getStoreExtensionPackage(
  packageId: string,
): Promise<ExtensionStoreListing | null> {
  if (!isTauri()) {
    return null;
  }

  const normalizedPackageId = packageId.trim();
  if (!normalizedPackageId) {
    return null;
  }

  const response = await invoke<unknown>("get_extension_store_package", {
    packageId: normalizedPackageId,
  });

  if (response === null) {
    return null;
  }

  const parsed = parseExtensionStorePackage(response);
  if (!parsed) {
    throw new Error("invalid extension store package response");
  }

  return parsed;
}
