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

  const packageId = input.packageId.trim();
  const slug = input.slug.trim();
  const releaseVersion = input.releaseVersion?.trim();
  const channel = input.channel?.trim();

  if (!packageId || !slug) {
    throw new Error("packageId and slug are required");
  }

  const response = await invoke<unknown>("install_store_extension", {
    packageId,
    releaseVersion: releaseVersion && releaseVersion.length > 0 ? releaseVersion : null,
    channel: channel && channel.length > 0 ? channel : null,
    force: Boolean(input.force),
  });

  const parsed = installResultSchema.safeParse(response);
  if (!parsed.success) {
    throw new Error("invalid install extension response from backend");
  }

  return parsed.data;
}
