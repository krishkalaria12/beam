import { useEffect } from "react";
import { toast } from "sonner";

import { extensionSidecarService } from "@/modules/extensions/sidecar-service";
import { useExtensionRuntimeStore } from "@/modules/extensions/runtime/store";

interface UseExtensionSidecarEventsInput {
  backToCommands: () => void;
}

export function useExtensionSidecarEvents({ backToCommands }: UseExtensionSidecarEventsInput) {
  useEffect(() => {
    const unsubscribe = extensionSidecarService.subscribe((event) => {
      if (event.type === "go-back-to-plugin-list") {
        useExtensionRuntimeStore.getState().resetRuntime();
        backToCommands();
        return;
      }

      if (event.type === "show-hud") {
        toast.message(event.title);
      }
    });

    return () => {
      unsubscribe();
      extensionSidecarService.stop();
      useExtensionRuntimeStore.getState().resetRuntime();
    };
  }, [backToCommands]);
}
