import { useEffect } from "react";

import {
  listenForPersistentMenuBarEvents,
  persistentExtensionRunnerManager,
} from "@/modules/extensions/background/persistent-runners";
import {
  getExtensionCatalogPlugins,
  isPersistentExtensionPlugin,
} from "@/modules/extensions/extension-catalog";

interface PersistentExtensionsHostProps {
  launchCommand: (payload: {
    requestId: string;
    name: string;
    type?: string;
    context?: Record<string, unknown>;
    arguments?: Record<string, unknown>;
    extensionName?: string;
  }) => Promise<void>;
  openExtensions?: () => void;
}

export function PersistentExtensionsHost({
  launchCommand,
  openExtensions,
}: PersistentExtensionsHostProps) {
  useEffect(() => {
    let disposed = false;
    let removeMenuBarListener: (() => void) | undefined;
    let refreshTimerId: ReturnType<typeof setInterval> | undefined;

    persistentExtensionRunnerManager.setCallbacks({
      launchCommand,
      openExtensions,
    });

    void listenForPersistentMenuBarEvents().then((cleanup) => {
      if (disposed) {
        cleanup();
        return;
      }
      removeMenuBarListener = cleanup;
    });

    const refresh = () => {
      void getExtensionCatalogPlugins()
        .then((plugins) => {
          if (disposed) {
            return;
          }
          void persistentExtensionRunnerManager.bootstrap(
            plugins.filter((plugin) => isPersistentExtensionPlugin(plugin)),
          );
        })
        .catch((error) => {
          console.error("Failed to bootstrap persistent extension runners:", error);
        });
    };

    refresh();
    refreshTimerId = setInterval(refresh, 15_000);

    return () => {
      disposed = true;
      removeMenuBarListener?.();
      if (refreshTimerId) {
        clearInterval(refreshTimerId);
      }
      void persistentExtensionRunnerManager.stopAll();
    };
  }, [launchCommand, openExtensions]);

  return null;
}
