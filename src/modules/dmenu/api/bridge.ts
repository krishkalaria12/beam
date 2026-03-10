import { invoke, isTauri } from "@tauri-apps/api/core";

import type { DmenuResolvePayload } from "@/modules/dmenu/types";

export const CLI_DMENU_REQUEST_EVENT = "cli-dmenu-request";

export async function markCliDmenuUiReady() {
  if (!isTauri()) {
    return;
  }

  await invoke("cli_bridge_mark_ui_ready");
}

export async function completeCliDmenuRequest(response: DmenuResolvePayload) {
  if (!isTauri()) {
    return;
  }

  await invoke("cli_bridge_complete_request", { response });
}

export async function searchCliDmenuRequest(requestId: string, query: string): Promise<string[]> {
  if (!isTauri()) {
    return [];
  }

  return invoke<string[]>("cli_bridge_search_request", { requestId, query });
}
