import type { ComponentType } from "react";

type ExtensionToastBridgeComponent = ComponentType;
type PersistentExtensionsHostComponent = ComponentType<{
  launchCommand: (payload: {
    requestId: string;
    name: string;
    type?: string;
    context?: Record<string, unknown>;
    arguments?: Record<string, unknown>;
    extensionName?: string;
  }) => Promise<void>;
  openExtensions?: () => void;
}>;

export interface LoadedExtensionInfrastructure {
  ExtensionToastBridge: ExtensionToastBridgeComponent;
  PersistentExtensionsHost: PersistentExtensionsHostComponent;
}

let loadedExtensionInfrastructure: LoadedExtensionInfrastructure | null = null;
let extensionInfrastructurePromise: Promise<LoadedExtensionInfrastructure> | null = null;

export function getLoadedExtensionInfrastructure(): LoadedExtensionInfrastructure | null {
  return loadedExtensionInfrastructure;
}

export async function preloadExtensionInfrastructure(): Promise<LoadedExtensionInfrastructure> {
  if (loadedExtensionInfrastructure) {
    return loadedExtensionInfrastructure;
  }

  if (extensionInfrastructurePromise) {
    return extensionInfrastructurePromise;
  }

  extensionInfrastructurePromise = Promise.all([
    import("@/modules/extensions/components/extension-toast-bridge"),
    import("@/modules/extensions/components/persistent-extensions-host"),
  ])
    .then(([toastBridgeModule, persistentHostModule]) => {
      const nextInfrastructure = {
        ExtensionToastBridge: toastBridgeModule.ExtensionToastBridge,
        PersistentExtensionsHost: persistentHostModule.PersistentExtensionsHost,
      } satisfies LoadedExtensionInfrastructure;

      loadedExtensionInfrastructure = nextInfrastructure;
      extensionInfrastructurePromise = null;
      return nextInfrastructure;
    })
    .catch((error) => {
      extensionInfrastructurePromise = null;
      throw error;
    });

  return extensionInfrastructurePromise;
}
