import { useEffect } from "react";

import { setLauncherCompactMode } from "@/modules/settings/api/set-launcher-compact-mode";

export function useLauncherWindowSizeSync(shouldSync: boolean, shouldCollapseToInputOnly: boolean) {
  useEffect(() => {
    if (!shouldSync) {
      return;
    }

    const syncWindowSize = async () => {
      try {
        const inputWrapper = document.querySelector<HTMLElement>(
          "[data-slot='command-input-wrapper']",
        );
        const measuredInputHeight = inputWrapper
          ? Math.ceil(inputWrapper.getBoundingClientRect().height)
          : undefined;

        await setLauncherCompactMode(shouldCollapseToInputOnly, measuredInputHeight);
      } catch (error) {
        console.error("Failed to update launcher window size:", error);
      }
    };

    const frame = window.requestAnimationFrame(() => {
      void syncWindowSize();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [shouldSync, shouldCollapseToInputOnly]);
}
