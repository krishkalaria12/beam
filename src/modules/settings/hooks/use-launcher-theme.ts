import { useCallback, useEffect, useState } from "react";

import {
  LAUNCHER_THEME_CHANGE_EVENT,
  getSelectedLauncherThemeId,
  listLauncherThemes,
  setSelectedLauncherThemeId,
  type LauncherThemeSummary,
} from "@/modules/settings/api/launcher-theme";

interface UseLauncherThemeResult {
  themes: LauncherThemeSummary[];
  selectedThemeId: string | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setTheme: (themeId: string | null) => Promise<void>;
}

export function useLauncherTheme(): UseLauncherThemeResult {
  const [themes, setThemes] = useState<LauncherThemeSummary[]>([]);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [discoveredThemes, selectedId] = await Promise.all([
        listLauncherThemes(),
        getSelectedLauncherThemeId(),
      ]);
      setThemes(discoveredThemes);

      const selectedExists =
        !selectedId || discoveredThemes.some((theme) => theme.id === selectedId);
      setSelectedThemeId(selectedExists ? selectedId : null);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Failed to load themes.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setTheme = useCallback(async (themeId: string | null) => {
    setError(null);
    try {
      await setSelectedLauncherThemeId(themeId);
      setSelectedThemeId(themeId);
      window.dispatchEvent(new Event(LAUNCHER_THEME_CHANGE_EVENT));
    } catch (setErrorCause) {
      setError(setErrorCause instanceof Error ? setErrorCause.message : "Failed to save theme.");
      throw setErrorCause;
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    themes,
    selectedThemeId,
    isLoading,
    error,
    refresh,
    setTheme,
  };
}
