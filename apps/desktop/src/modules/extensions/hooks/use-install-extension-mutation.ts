import { useMutation } from "@tanstack/react-query";

import { installExtension } from "@/modules/extensions/api/install-extension";
import type { InstallExtensionInput } from "@/modules/extensions/types";

export function useInstallExtensionMutation() {
  return useMutation({
    mutationFn: (input: InstallExtensionInput) => installExtension(input),
  });
}
