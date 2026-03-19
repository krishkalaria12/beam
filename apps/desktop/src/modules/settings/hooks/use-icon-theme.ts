import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  ICON_THEME_QUERY_KEY,
  ICON_THEMES_QUERY_KEY,
  getIconTheme,
  listIconThemes,
  setIconTheme,
} from "@/modules/settings/api/icon-theme";
import { getWindowEntriesQueryKey } from "@/modules/window-switcher/hooks/use-window-entries-query";

export function useIconTheme() {
  const queryClient = useQueryClient();
  const themesQuery = useQuery({
    queryKey: ICON_THEMES_QUERY_KEY,
    queryFn: listIconThemes,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });
  const selectedThemeQuery = useQuery({
    queryKey: ICON_THEME_QUERY_KEY,
    queryFn: getIconTheme,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const themes = themesQuery.data ?? [];
  const rawSelectedThemeId = selectedThemeQuery.data ?? "auto";
  const selectedThemeId =
    rawSelectedThemeId === "auto" ||
    themes.some((theme) => theme.id === rawSelectedThemeId)
      ? rawSelectedThemeId
      : "auto";

  const mutation = useMutation({
    mutationFn: setIconTheme,
    async onSuccess(savedThemeId) {
      queryClient.setQueryData(ICON_THEME_QUERY_KEY, savedThemeId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["applications"] }),
        queryClient.invalidateQueries({ queryKey: getWindowEntriesQueryKey() }),
      ]);
    },
  });

  return {
    themes,
    selectedThemeId,
    isLoading: themesQuery.isLoading || selectedThemeQuery.isLoading,
    error:
      themesQuery.error?.message ??
      selectedThemeQuery.error?.message ??
      mutation.error?.message ??
      null,
    refresh: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ICON_THEMES_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ICON_THEME_QUERY_KEY }),
      ]);
    },
    setTheme: mutation.mutateAsync,
  };
}
