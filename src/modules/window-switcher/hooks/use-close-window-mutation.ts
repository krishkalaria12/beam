import { useMutation, useQueryClient } from "@tanstack/react-query";

import { closeWindow } from "@/modules/window-switcher/api/close-window";
import { getWindowEntriesQueryKey } from "@/modules/window-switcher/hooks/use-window-entries-query";

export function useCloseWindowMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: closeWindow,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: getWindowEntriesQueryKey() });
    },
  });
}
