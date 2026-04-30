import { invoke, isTauri } from "@tauri-apps/api/core";

import { emitClipboardHistoryUpdated } from "../lib/updates";

async function copyViaBackend(content: string, isImage: boolean) {
  await invoke("clipboard_copy", {
    content: isImage
      ? { text: undefined, html: undefined, file: undefined, image: content }
      : { text: content, html: undefined, file: undefined, image: undefined },
    options: undefined,
  });
}

export async function copyToClipboard(content: string, isImage: boolean) {
  if (isTauri()) {
    await copyViaBackend(content, isImage);
    emitClipboardHistoryUpdated();
    return;
  }

  await navigator.clipboard.writeText(content);
  emitClipboardHistoryUpdated();
}
