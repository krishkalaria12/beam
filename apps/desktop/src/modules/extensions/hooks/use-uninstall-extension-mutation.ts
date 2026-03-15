import { useMutation } from "@tanstack/react-query";

import { uninstallExtension } from "@/modules/extensions/api/uninstall-extension";

export function useUninstallExtensionMutation() {
  return useMutation({
    mutationFn: (slug: string) => uninstallExtension(slug),
  });
}
