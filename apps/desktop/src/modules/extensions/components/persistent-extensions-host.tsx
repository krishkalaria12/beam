import { useRef } from "react";

import {
  listenForPersistentMenuBarEvents,
  persistentExtensionRunnerManager,
} from "@/modules/extensions/background/persistent-runners";
import {
  getExtensionCatalogPlugins,
  isPersistentExtensionPlugin,
} from "@/modules/extensions/extension-catalog";
import { useMountEffect } from "@/hooks/use-mount-effect";

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
  const launchCommandRef = useRef(launchCommand);
  const openExtensionsRef = useRef(openExtensions);
  launchCommandRef.current = launchCommand;
  openExtensionsRef.current = openExtensions;

  useMountEffect(() => {
    let disposed = false;
    let removeMenuBarListener: (() => void) | undefined;
    let refreshTimerId: ReturnType<typeof setInterval> | undefined;

    persistentExtensionRunnerManager.setCallbacks({
      launchCommand: (payload) => launchCommandRef.current(payload),
      openExtensions: openExtensionsRef.current,
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
  });

  return null;
}
