import { useEffect } from "react";
import { toast } from "sonner";

import { extensionSidecarService } from "@/modules/extensions/sidecar-service";
import { useExtensionRuntimeStore } from "@/modules/extensions/runtime/store";

interface UseExtensionSidecarEventsInput {
  backToCommands: () => void;
  openExtensions?: () => void;
}

export function useExtensionSidecarEvents({
  backToCommands,
  openExtensions,
}: UseExtensionSidecarEventsInput) {
  useEffect(() => {
    const unsubscribe = extensionSidecarService.subscribe((event) => {
      if (event.type === "go-back-to-plugin-list") {
        useExtensionRuntimeStore.getState().resetRuntime();
        backToCommands();
        return;
      }

      if (event.type === "show-hud") {
        toast.message(event.title);
        return;
      }

      if (event.type === "update-command-metadata") {
        useExtensionRuntimeStore.getState().updateRunningSessionMetadata({
          subtitle: event.subtitle,
        });
        return;
      }

      if (event.type === "open-extension-preferences" || event.type === "open-command-preferences") {
        if (openExtensions) {
          openExtensions();
        } else {
          backToCommands();
        }
      }
    });

    return () => {
      unsubscribe();
      extensionSidecarService.stop();
      useExtensionRuntimeStore.getState().resetRuntime();
    };
  }, [backToCommands, openExtensions]);
}
