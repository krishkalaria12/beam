import { startTransition, useState } from "react";

import { useMountEffect } from "@/hooks/use-mount-effect";
import {
  getLoadedExtensionInfrastructure,
  preloadExtensionInfrastructure,
} from "@/modules/extensions/lib/extension-infrastructure-loader";

export function useExtensionInfrastructure() {
  const [extensionInfrastructure, setExtensionInfrastructure] = useState(() =>
    getLoadedExtensionInfrastructure(),
  );

  useMountEffect(() => {
    if (extensionInfrastructure) {
      return;
    }

    let cancelled = false;

    void preloadExtensionInfrastructure()
      .then((loadedInfrastructure) => {
        if (cancelled) {
          return;
        }

        startTransition(() => {
          setExtensionInfrastructure(loadedInfrastructure);
        });
      })
      .catch(() => {
        // Keep the launcher usable even if the background extension bridge fails to load.
      });

    return () => {
      cancelled = true;
    };
  });

  return extensionInfrastructure;
}
