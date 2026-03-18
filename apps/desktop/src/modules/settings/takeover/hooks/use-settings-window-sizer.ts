import { useLauncherWindowSizer } from "@/modules/launcher/hooks/use-launcher-window-sizer";

const SETTINGS_WINDOW_WIDTH = 1240;
const SETTINGS_WINDOW_HEIGHT = 760;
const LAUNCHER_DEFAULT_WIDTH = 960;
const LAUNCHER_DEFAULT_HEIGHT = 520;

export function useSettingsWindowSizer() {
  useLauncherWindowSizer(
    {
      width: SETTINGS_WINDOW_WIDTH,
      height: SETTINGS_WINDOW_HEIGHT,
    },
    {
      width: LAUNCHER_DEFAULT_WIDTH,
      height: LAUNCHER_DEFAULT_HEIGHT,
    },
  );
}
