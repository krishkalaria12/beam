import { isTauri } from "@tauri-apps/api/core";
import { writeImageBase64, writeText } from "tauri-plugin-clipboard-api";

export async function copyToClipboard(content: string, isImage: boolean) {
  if (isTauri()) {
    if (isImage) {
      // Plugin expects base64 payload without data URL prefix.
      const base64Data = content.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
      await writeImageBase64(base64Data);
      return;
    }

    await writeText(content);
    return;
  }

  await navigator.clipboard.writeText(content);
}
