import { toast } from "sonner";

import { extensionManagerService } from "@/modules/extensions/extension-manager-service";
import { useExtensionRuntimeStore } from "@/modules/extensions/runtime/store";
import { useSettingsPageStore } from "@/modules/settings/takeover/store/use-settings-page-store";
import { useMountEffect } from "@/hooks/use-mount-effect";

interface UseExtensionManagerEventsInput {
  backToCommands: () => void;
  openSettings?: () => void;
}

export function useExtensionManagerEvents({
  backToCommands,
  openSettings,
}: UseExtensionManagerEventsInput) {
  useMountEffect(() => {
    void extensionManagerService.start().catch((error) => {
      console.error("[extensions-manager] failed to prewarm foreground runtime:", error);
    });

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

      if (
        event.type === "open-extension-preferences" ||
        event.type === "open-command-preferences"
      ) {
        if (openSettings) {
          useSettingsPageStore
            .getState()
            .openExtensions(
              event.extensionName,
              event.type === "open-command-preferences" ? event.commandName : null,
            );
          openSettings();
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
  });
}
