import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  DEFAULT_LAUNCHER_FONT_FAMILY,
  DEFAULT_LAUNCHER_FONT_SIZE,
  LAUNCHER_FONT_FAMILIES_QUERY_KEY,
  LAUNCHER_FONT_FAMILY_QUERY_KEY,
  LAUNCHER_FONT_SIZE_QUERY_KEY,
  SYSTEM_LAUNCHER_FONT_FAMILY,
  applyLauncherFontFamily,
  applyLauncherFontSize,
  getLauncherFontFamily,
  getLauncherFontSize,
  listFontFamilies,
  setLauncherFontFamily,
  setLauncherFontSize,
  type FontFamilySummary,
} from "@/modules/settings/api/launcher-font";

const BUILTIN_FONT_OPTIONS: FontFamilySummary[] = [
  { id: DEFAULT_LAUNCHER_FONT_FAMILY, name: "Beam Default" },
  { id: SYSTEM_LAUNCHER_FONT_FAMILY, name: "System Default" },
];

export function useLauncherFont() {
  const queryClient = useQueryClient();
  const familiesQuery = useQuery({
    queryKey: LAUNCHER_FONT_FAMILIES_QUERY_KEY,
    queryFn: listFontFamilies,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });
  const selectedFamilyQuery = useQuery({
    queryKey: LAUNCHER_FONT_FAMILY_QUERY_KEY,
    queryFn: getLauncherFontFamily,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  const fontSizeQuery = useQuery({
    queryKey: LAUNCHER_FONT_SIZE_QUERY_KEY,
    queryFn: getLauncherFontSize,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const familyMutation = useMutation({
    mutationFn: setLauncherFontFamily,
    onSuccess(savedFamily) {
      queryClient.setQueryData(LAUNCHER_FONT_FAMILY_QUERY_KEY, savedFamily);
      applyLauncherFontFamily(savedFamily);
    },
  });
  const sizeMutation = useMutation({
    mutationFn: setLauncherFontSize,
    onSuccess(savedSize) {
      queryClient.setQueryData(LAUNCHER_FONT_SIZE_QUERY_KEY, savedSize);
      applyLauncherFontSize(savedSize);
    },
  });

  const seen = new Set(BUILTIN_FONT_OPTIONS.map((entry) => entry.id.toLowerCase()));
  const installedFamilies: FontFamilySummary[] = [];
  for (const family of familiesQuery.data ?? []) {
    const dedupeKey = family.id.trim().toLowerCase();
    if (dedupeKey.length === 0 || seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    installedFamilies.push(family);
  }

  const selectedFamilyId = selectedFamilyQuery.data ?? DEFAULT_LAUNCHER_FONT_FAMILY;
  const fontSize = fontSizeQuery.data ?? DEFAULT_LAUNCHER_FONT_SIZE;

  return {
    families: [...BUILTIN_FONT_OPTIONS, ...installedFamilies],
    selectedFamilyId,
    fontSize,
    isLoading: familiesQuery.isLoading || selectedFamilyQuery.isLoading || fontSizeQuery.isLoading,
    error:
      familiesQuery.error?.message ??
      selectedFamilyQuery.error?.message ??
      fontSizeQuery.error?.message ??
      familyMutation.error?.message ??
      sizeMutation.error?.message ??
      null,
    refresh: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: LAUNCHER_FONT_FAMILIES_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: LAUNCHER_FONT_FAMILY_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: LAUNCHER_FONT_SIZE_QUERY_KEY }),
      ]);
    },
    setFontFamily: async (nextFamilyId: string) => {
      if (nextFamilyId === selectedFamilyId) {
        return selectedFamilyId;
      }

      return familyMutation.mutateAsync(nextFamilyId);
    },
    setFontSize: async (nextSize: number) => {
      if (nextSize === fontSize) {
        return fontSize;
      }

      return sizeMutation.mutateAsync(nextSize);
    },
  };
}
