import { useEffect, useState } from "react";

import { getUiLayoutMode, setUiLayoutMode } from "../api/ui-layout-mode";

export type UiLayoutMode = "expanded" | "compressed";

const UI_LAYOUT_CHANGE_EVENT = "beam-ui-layout-mode-change";

export function useUiLayout() {
  const [layoutMode, setLayoutMode] = useState<UiLayoutMode>("expanded");

  useEffect(() => {
    let mounted = true;

    const syncFromSource = async () => {
      try {
        const mode = await getUiLayoutMode();
        if (mounted) {
          setLayoutMode(mode);
        }
      } catch {
        if (mounted) {
          setLayoutMode("expanded");
        }
      }
    };

    syncFromSource();

    const syncOnEvent = () => {
      syncFromSource();
    };

    window.addEventListener("storage", syncOnEvent);
    window.addEventListener(UI_LAYOUT_CHANGE_EVENT, syncOnEvent);

    return () => {
      mounted = false;
      window.removeEventListener("storage", syncOnEvent);
      window.removeEventListener(UI_LAYOUT_CHANGE_EVENT, syncOnEvent);
    };
  }, []);

  const setMode = async (mode: UiLayoutMode) => {
    setLayoutMode(mode);

    try {
      await setUiLayoutMode(mode);
    } finally {
      window.dispatchEvent(new Event(UI_LAYOUT_CHANGE_EVENT));
    }
  };

  return {
    layoutMode,
    isCompressed: layoutMode === "compressed",
    setMode,
  };
}
