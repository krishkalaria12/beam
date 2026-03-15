import { isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { startTransition, useEffect } from "react";

import { CLI_DMENU_REQUEST_EVENT, markCliDmenuUiReady } from "@/modules/dmenu/api/bridge";
import type { DmenuSession } from "@/modules/dmenu/types";
import { useLauncherUiStore } from "@/store/use-launcher-ui-store";

export function useCliDmenuRequests() {
  const openDmenuSession = useLauncherUiStore((state) => state.openDmenuSession);

  useEffect(() => {
    if (!isTauri()) {
      return;
    }

    void markCliDmenuUiReady().catch((error) => {
      console.error("Failed to mark cli dmenu UI ready:", error);
    });

    let disposed = false;
    let unlisten: (() => void) | undefined;

    void listen<DmenuSession>(CLI_DMENU_REQUEST_EVENT, (event) => {
      startTransition(() => {
        openDmenuSession(event.payload);
      });
    })
      .then((cleanup) => {
        if (disposed) {
          cleanup();
          return;
        }
        unlisten = cleanup;
      })
      .catch((error) => {
        console.error("Failed to subscribe to cli dmenu requests:", error);
      });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [openDmenuSession]);
}
