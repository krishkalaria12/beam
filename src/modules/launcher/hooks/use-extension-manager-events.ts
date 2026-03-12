import { useEffect } from "react";
import { toast } from "sonner";

import { extensionManagerService } from "@/modules/extensions/extension-manager-service";
import { useExtensionRuntimeStore } from "@/modules/extensions/runtime/store";

interface UseExtensionManagerEventsInput {
  backToCommands: () => void;
  openExtensions?: () => void;
}

export function useExtensionManagerEvents({
  backToCommands,
  openExtensions,
}: UseExtensionManagerEventsInput) {
  useEffect(() => {
    const unsubscribe = extensionManagerService.subscribe((event) => {
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
      extensionManagerService.stop();
      useExtensionRuntimeStore.getState().resetRuntime();
    };
  }, [backToCommands, openExtensions]);
}
