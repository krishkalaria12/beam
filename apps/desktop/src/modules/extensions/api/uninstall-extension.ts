import { invoke, isTauri } from "@tauri-apps/api/core";

export async function uninstallExtension(slug: string): Promise<boolean> {
  if (!isTauri()) {
    throw new Error("desktop runtime is required");
  }

  const normalizedSlug = slug.trim();
  if (!normalizedSlug) {
    throw new Error("extension slug is required");
  }

  return invoke<boolean>("uninstall_extension", {
    slug: normalizedSlug,
  });
}
