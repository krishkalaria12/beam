import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

import {
  LAUNCHER_THEME_CHANGE_EVENT,
  getSelectedLauncherThemeId,
} from "@/modules/settings/api/launcher-theme";
import {
  DEFAULT_BASE_COLOR as DEFAULT_BASE_COLOR_HEX,
  normalizeBaseColor,
  normalizeUiStyle,
  setBaseColorPreference,
  setUiStylePreference,
  type UiStylePreference,
} from "@/modules/settings/api/ui-style";
import { useMountEffect } from "@/hooks/use-mount-effect";

type UiStyleProviderState = {
  uiStyle: UiStylePreference;
  baseColor: string;
  setUiStyle: (style: UiStylePreference) => Promise<void>;
  setBaseColor: (color: string) => Promise<void>;
};

type UiStyleProviderProps = {
  children: React.ReactNode;
  defaultUiStyle?: UiStylePreference;
  defaultBaseColor?: string;
};

const STYLE_CLASS_PREFIX = "theme-style-";
const USER_THEME_CLASS_PREFIX = "theme-user-";
const CUSTOM_THEME_ACTIVE_CLASS = "theme-custom-active";

const initialState: UiStyleProviderState = {
  uiStyle: "glassy",
  baseColor: DEFAULT_BASE_COLOR_HEX,
  setUiStyle: async () => {},
  setBaseColor: async () => {},
};

const UiStyleProviderContext = createContext<UiStyleProviderState>(initialState);

function hexToRgb(hexColor: string): [number, number, number] {
  const value = parseInt(hexColor.slice(1), 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

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

function hasClassByPrefix(element: Element | null, classPrefix: string): boolean {
  if (!element) {
    return false;
  }

  for (const className of element.classList) {
    if (className.startsWith(classPrefix)) {
      return true;
    }
  }
  return false;
}

function applyUiStyle(uiStyle: UiStylePreference, customThemeActive: boolean): void {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  const body = document.body;

  // Remove all style classes first
  root.classList.remove("sc-glassy", "sc-solid");
  body?.classList.remove("sc-glassy", "sc-solid");
  removeClassesByPrefix(root, STYLE_CLASS_PREFIX);
  removeClassesByPrefix(body, STYLE_CLASS_PREFIX);

  if (customThemeActive) {
    root.classList.add(CUSTOM_THEME_ACTIVE_CLASS);
    body?.classList.add(CUSTOM_THEME_ACTIVE_CLASS);
    return;
  }

  root.classList.remove(CUSTOM_THEME_ACTIVE_CLASS);
  body?.classList.remove(CUSTOM_THEME_ACTIVE_CLASS);

  // Apply the selected style
  const styleClass = `${STYLE_CLASS_PREFIX}${uiStyle}`;
  root.classList.add(styleClass);
  body?.classList.add(styleClass);

  if (uiStyle === "glassy") {
    root.classList.add("sc-glassy");
    body?.classList.add("sc-glassy");
  } else if (uiStyle === "solid") {
    root.classList.add("sc-solid");
    body?.classList.add("sc-solid");
  }
}

function applyBaseColor(baseColor: string): void {
  if (typeof document === "undefined") {
    return;
  }

  const [r, g, b] = hexToRgb(baseColor);
  document.documentElement.style.setProperty("--sc-base-rgb", `${r}, ${g}, ${b}`);
}

export function UiStyleProvider({
  children,
  defaultUiStyle = "glassy",
  defaultBaseColor = DEFAULT_BASE_COLOR_HEX,
}: UiStyleProviderProps) {
  const [uiStyle, setUiStyleState] = useState<UiStylePreference>(() =>
    normalizeUiStyle(defaultUiStyle),
  );
  const [baseColor, setBaseColorState] = useState<string>(() =>
    normalizeBaseColor(defaultBaseColor),
  );
  const [customThemeActive, setCustomThemeActive] = useState<boolean>(false);
  const uiStyleRef = useRef(uiStyle);
  const baseColorRef = useRef(baseColor);

  uiStyleRef.current = uiStyle;
  baseColorRef.current = baseColor;

  useMountEffect(() => {
    let mounted = true;

    const syncCustomThemeState = async () => {
      try {
        const selectedThemeId = await getSelectedLauncherThemeId();
        if (!mounted) {
          return;
        }
        const active = Boolean(selectedThemeId);
        setCustomThemeActive(active);
        applyUiStyle(uiStyleRef.current, active);
        if (active) {
          document.documentElement.style.removeProperty("--sc-base-rgb");
        } else {
          applyBaseColor(baseColorRef.current);
        }
      } catch {
        if (!mounted) {
          return;
        }

        const rootHasThemeClass = hasClassByPrefix(
          document.documentElement,
          USER_THEME_CLASS_PREFIX,
        );
        const bodyHasThemeClass = hasClassByPrefix(document.body, USER_THEME_CLASS_PREFIX);
        const active = rootHasThemeClass || bodyHasThemeClass;
        setCustomThemeActive(active);
        applyUiStyle(uiStyleRef.current, active);
        if (active) {
          document.documentElement.style.removeProperty("--sc-base-rgb");
        } else {
          applyBaseColor(baseColorRef.current);
        }
      }
    };

    void syncCustomThemeState();
    const onLauncherThemeChanged = () => {
      void syncCustomThemeState();
    };

    window.addEventListener(LAUNCHER_THEME_CHANGE_EVENT, onLauncherThemeChanged);
    return () => {
      mounted = false;
      window.removeEventListener(LAUNCHER_THEME_CHANGE_EVENT, onLauncherThemeChanged);
    };
  });

  applyUiStyle(uiStyle, customThemeActive);
  if (customThemeActive) {
    document.documentElement.style.removeProperty("--sc-base-rgb");
  } else {
    applyBaseColor(baseColor);
  }

  const setUiStyle = useCallback(
    async (style: UiStylePreference) => {
      const saved = await setUiStylePreference(style);
      setUiStyleState(saved);
      applyUiStyle(saved, customThemeActive);
      return;
    },
    [customThemeActive],
  );

  const setBaseColor = useCallback(
    async (color: string) => {
      const saved = await setBaseColorPreference(color);
      setBaseColorState(saved);
      if (!customThemeActive) {
        applyBaseColor(saved);
      }
      return;
    },
    [customThemeActive],
  );

  const value = useMemo(
    () => ({
      uiStyle,
      baseColor,
      setUiStyle,
      setBaseColor,
    }),
    [uiStyle, baseColor, setUiStyle, setBaseColor],
  );

  return (
    <UiStyleProviderContext.Provider value={value}>{children}</UiStyleProviderContext.Provider>
  );
}

export function useUiStyle() {
  const context = useContext(UiStyleProviderContext);
  if (context === undefined) {
    throw new Error("useUiStyle must be used within UiStyleProvider");
  }
  return context;
}
