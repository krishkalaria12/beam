import { useQueryClient } from "@tanstack/react-query";

import { useMountEffect } from "@/hooks/use-mount-effect";
import {
  DEFAULT_LAUNCHER_FONT_FAMILY,
  DEFAULT_LAUNCHER_FONT_SIZE,
  LAUNCHER_FONT_FAMILY_QUERY_KEY,
  LAUNCHER_FONT_SIZE_QUERY_KEY,
  applyLauncherFontFamily,
  applyLauncherFontSize,
  getLauncherFontFamily,
  getLauncherFontSize,
} from "@/modules/settings/api/launcher-font";

interface LauncherFontProviderProps {
  children: React.ReactNode;
}

export function LauncherFontProvider({ children }: LauncherFontProviderProps) {
  const queryClient = useQueryClient();

  useMountEffect(() => {
    let mounted = true;

    const syncFont = async () => {
      try {
        const [family, size] = await Promise.all([getLauncherFontFamily(), getLauncherFontSize()]);
        if (!mounted) {
          return;
        }

        queryClient.setQueryData(LAUNCHER_FONT_FAMILY_QUERY_KEY, family);
        queryClient.setQueryData(LAUNCHER_FONT_SIZE_QUERY_KEY, size);
        applyLauncherFontFamily(family);
        applyLauncherFontSize(size);
      } catch {
        if (!mounted) {
          return;
        }

        queryClient.setQueryData(LAUNCHER_FONT_FAMILY_QUERY_KEY, DEFAULT_LAUNCHER_FONT_FAMILY);
        queryClient.setQueryData(LAUNCHER_FONT_SIZE_QUERY_KEY, DEFAULT_LAUNCHER_FONT_SIZE);
        applyLauncherFontFamily(DEFAULT_LAUNCHER_FONT_FAMILY);
        applyLauncherFontSize(DEFAULT_LAUNCHER_FONT_SIZE);
      }
    };

    void syncFont();
    return () => {
      mounted = false;
    };
  });

  return <>{children}</>;
}
