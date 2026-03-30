import { open as shellOpen } from "@tauri-apps/plugin-shell";

export function fallbackOpenExternalUrl(url: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

export async function openExternalUrl(url: string): Promise<void> {
  try {
    await shellOpen(url);
  } catch {
    fallbackOpenExternalUrl(url);
  }
}
