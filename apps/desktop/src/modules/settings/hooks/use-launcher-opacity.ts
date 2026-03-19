import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  DEFAULT_LAUNCHER_OPACITY,
  LAUNCHER_OPACITY_QUERY_KEY,
  applyLauncherOpacity,
  getLauncherOpacity,
  setLauncherOpacity,
} from "@/modules/settings/api/launcher-opacity";

export function useLauncherOpacity() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: LAUNCHER_OPACITY_QUERY_KEY,
    queryFn: getLauncherOpacity,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const mutation = useMutation({
    mutationFn: setLauncherOpacity,
    onSuccess(savedOpacity) {
      queryClient.setQueryData(LAUNCHER_OPACITY_QUERY_KEY, savedOpacity);
      applyLauncherOpacity(savedOpacity);
    },
  });

  return {
    opacity: query.data ?? DEFAULT_LAUNCHER_OPACITY,
    isLoading: query.isLoading,
    error: query.error?.message ?? mutation.error?.message ?? null,
    setOpacity: mutation.mutateAsync,
  };
}
