import { useMutation, useQueryClient } from "@tanstack/react-query";

import { focusWindow } from "@/modules/window-switcher/api/focus-window";
import { getWindowEntriesQueryKey } from "@/modules/window-switcher/hooks/use-window-entries-query";

export function useFocusWindowMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: focusWindow,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: getWindowEntriesQueryKey() });
    },
  });
}
