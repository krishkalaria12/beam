import { useRef } from "react";

import { useMountEffect } from "@/hooks/use-mount-effect";
import { setLauncherCompactMode } from "@/modules/settings/api/set-launcher-compact-mode";

export function useLauncherWindowSizeSync(shouldSync: boolean, shouldCollapseToInputOnly: boolean) {
  const frameRef = useRef<number | null>(null);
  const syncKeyRef = useRef("");
  const syncKey = `${shouldSync}:${shouldCollapseToInputOnly}`;

  if (syncKeyRef.current !== syncKey) {
    syncKeyRef.current = syncKey;
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    if (shouldSync) {
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        void (async () => {
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
        })();
      });
    }
  }

  useMountEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  });
}
