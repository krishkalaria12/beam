import { useMutation } from "@tanstack/react-query";

import { extensionManagerService } from "@/modules/extensions/extension-manager-service";

export function useLoadExtensionPreferencesMutation() {
  return useMutation({
    mutationFn: (pluginName: string) => extensionManagerService.getPreferences(pluginName),
  });
}

export function useSaveExtensionPreferencesMutation() {
  return useMutation({
    mutationFn: (input: { pluginName: string; values: Record<string, unknown> }) =>
      extensionManagerService.setPreferences(input.pluginName, input.values),
  });
}
