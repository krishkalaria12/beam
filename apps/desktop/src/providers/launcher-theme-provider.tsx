import { useMountEffect } from "@/hooks/use-mount-effect";

import {
  LAUNCHER_THEME_CHANGE_EVENT,
  getLauncherThemeCss,
  getSelectedLauncherThemeId,
} from "@/modules/settings/api/launcher-theme";

const USER_THEME_CLASS_PREFIX = "theme-user-";
const USER_THEME_STYLE_ID = "beam-user-theme-style";

function removeClassesByPrefix(element: Element | null, classPrefix: string): void {
  if (!element) {
    return;
  }

  const classesToRemove: string[] = [];
  for (const className of element.classList) {
    if (className.startsWith(classPrefix)) {
      classesToRemove.push(className);
    }
  }
  if (classesToRemove.length > 0) {
    element.classList.remove(...classesToRemove);
  }
}

function applyUserThemeClass(themeId: string | null): void {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  const body = document.body;

  removeClassesByPrefix(root, USER_THEME_CLASS_PREFIX);
  removeClassesByPrefix(body, USER_THEME_CLASS_PREFIX);

  if (!themeId) {
    return;
  }

  const className = `${USER_THEME_CLASS_PREFIX}${themeId}`;
  root.classList.add(className);
  body?.classList.add(className);
}

function applyUserThemeCss(css: string | null): void {
  if (typeof document === "undefined") {
    return;
  }

  const existing = document.getElementById(USER_THEME_STYLE_ID) as HTMLStyleElement | null;
  if (!css || css.trim().length === 0) {
    existing?.remove();
    return;
  }

  const styleElement = existing || document.createElement("style");
  styleElement.id = USER_THEME_STYLE_ID;
  styleElement.textContent = css;

  if (!existing) {
    document.head.appendChild(styleElement);
  }
}

interface LauncherThemeProviderProps {
  children: React.ReactNode;
}

export function LauncherThemeProvider({ children }: LauncherThemeProviderProps) {
  useMountEffect(() => {
    let mounted = true;

    const syncTheme = async () => {
      const selectedThemeId = await getSelectedLauncherThemeId().catch(() => null);
      const css = selectedThemeId
        ? await getLauncherThemeCss(selectedThemeId).catch(() => null)
        : "";

      if (!mounted) {
        return;
      }

      applyUserThemeClass(selectedThemeId);
      applyUserThemeCss(css);
    };

    void syncTheme();

    const onThemeChanged = () => {
      void syncTheme();
    };

    window.addEventListener(LAUNCHER_THEME_CHANGE_EVENT, onThemeChanged);
    return () => {
      mounted = false;
      window.removeEventListener(LAUNCHER_THEME_CHANGE_EVENT, onThemeChanged);
    };
  });

  return <>{children}</>;
}
