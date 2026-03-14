export const CLIPBOARD_HISTORY_UPDATED_EVENT = "beam:clipboard-history-updated";

export function emitClipboardHistoryUpdated(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(CLIPBOARD_HISTORY_UPDATED_EVENT));
}
