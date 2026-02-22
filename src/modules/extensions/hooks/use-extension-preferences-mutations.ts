import { useMutation } from "@tanstack/react-query";

import { extensionSidecarService } from "@/modules/extensions/sidecar-service";

export function useLoadExtensionPreferencesMutation() {
  return useMutation({
    mutationFn: (pluginName: string) => extensionSidecarService.getPreferences(pluginName),
  });
}

export function useSaveExtensionPreferencesMutation() {
  return useMutation({
    mutationFn: (input: { pluginName: string; values: Record<string, unknown> }) =>
      extensionSidecarService.setPreferences(input.pluginName, input.values),
  });
}
