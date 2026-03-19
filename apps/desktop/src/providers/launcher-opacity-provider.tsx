import { useQueryClient } from "@tanstack/react-query";

import { useMountEffect } from "@/hooks/use-mount-effect";
import {
  DEFAULT_LAUNCHER_OPACITY,
  LAUNCHER_OPACITY_QUERY_KEY,
  applyLauncherOpacity,
  getLauncherOpacity,
} from "@/modules/settings/api/launcher-opacity";

interface LauncherOpacityProviderProps {
  children: React.ReactNode;
}

export function LauncherOpacityProvider({
  children,
}: LauncherOpacityProviderProps) {
  const queryClient = useQueryClient();

  useMountEffect(() => {
    let mounted = true;

    const syncOpacity = async () => {
      try {
        const opacity = await getLauncherOpacity();
        if (!mounted) {
          return;
        }
        queryClient.setQueryData(LAUNCHER_OPACITY_QUERY_KEY, opacity);
        applyLauncherOpacity(opacity);
      } catch {
        if (!mounted) {
          return;
        }
        queryClient.setQueryData(
          LAUNCHER_OPACITY_QUERY_KEY,
          DEFAULT_LAUNCHER_OPACITY,
        );
        applyLauncherOpacity(DEFAULT_LAUNCHER_OPACITY);
      }
    };

    void syncOpacity();
    return () => {
      mounted = false;
    };
  });

  return <>{children}</>;
}
