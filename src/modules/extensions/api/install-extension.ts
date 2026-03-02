import { invoke, isTauri } from "@tauri-apps/api/core";

import {
  installResultSchema,
  type InstallExtensionInput,
  type InstallResult,
} from "@/modules/extensions/types";

export async function installExtension(input: InstallExtensionInput): Promise<InstallResult> {
  if (!isTauri()) {
    throw new Error("desktop runtime is required");
  }

  const downloadUrl = input.downloadUrl.trim();
  const slug = input.slug.trim();
  if (!downloadUrl || !slug) {
    throw new Error("downloadUrl and slug are required");
  }

  const response = await invoke<unknown>("install_extension", {
    downloadUrl,
    slug,
    force: Boolean(input.force),
  });

  const parsed = installResultSchema.safeParse(response);
  if (!parsed.success) {
    throw new Error("invalid install extension response from backend");
  }

  return parsed.data;
}
