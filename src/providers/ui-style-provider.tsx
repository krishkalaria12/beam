import { createContext, useContext, useEffect, useMemo, useState } from "react";

import {
  LAUNCHER_THEME_CHANGE_EVENT,
  getSelectedLauncherThemeId,
} from "@/modules/settings/api/launcher-theme";

export type UiStylePreference = "default" | "glassy" | "solid";

type UiStyleProviderState = {
  uiStyle: UiStylePreference;
  baseColor: string;
  setUiStyle: (style: UiStylePreference) => void;
  setBaseColor: (color: string) => void;
};

type UiStyleProviderProps = {
  children: React.ReactNode;
  defaultUiStyle?: UiStylePreference;
  defaultBaseColor?: string;
  styleStorageKey?: string;
  baseColorStorageKey?: string;
};

const DEFAULT_BASE_COLOR_RGB: [number, number, number] = [16, 17, 19];

function rgbTupleToHex([r, g, b]: readonly [number, number, number]): string {
  const toHex = (value: number) => value.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const DEFAULT_BASE_COLOR = rgbTupleToHex(DEFAULT_BASE_COLOR_RGB);
const DEFAULT_STYLE_STORAGE_KEY = "beam-ui-style";
const DEFAULT_BASE_COLOR_STORAGE_KEY = "beam-ui-base-color";
const STYLE_CLASS_PREFIX = "theme-style-";
const USER_THEME_CLASS_PREFIX = "theme-user-";
const CUSTOM_THEME_ACTIVE_CLASS = "theme-custom-active";

const initialState: UiStyleProviderState = {
  uiStyle: "glassy",
  baseColor: DEFAULT_BASE_COLOR,
  setUiStyle: () => null,
  setBaseColor: () => null,
};

const UiStyleProviderContext = createContext<UiStyleProviderState>(initialState);

function normalizeUiStyle(value: string | null | undefined): UiStylePreference {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (normalized === "glassy") return "glassy";
  if (normalized === "solid") return "solid";
  return "default";
}

function normalizeBaseColor(value: string | null | undefined): string {
  const raw = String(value || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) {
    return raw.toLowerCase();
  }
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    const expanded = raw
      .slice(1)
      .split("")
      .map((ch) => `${ch}${ch}`)
      .join("");
    return `#${expanded}`.toLowerCase();
  }
  return DEFAULT_BASE_COLOR;
}

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
  defaultBaseColor = DEFAULT_BASE_COLOR,
  styleStorageKey = DEFAULT_STYLE_STORAGE_KEY,
  baseColorStorageKey = DEFAULT_BASE_COLOR_STORAGE_KEY,
}: UiStyleProviderProps) {
  const [uiStyle, setUiStyleState] = useState<UiStylePreference>(() =>
    normalizeUiStyle(localStorage.getItem(styleStorageKey) || defaultUiStyle),
  );
  const [baseColor, setBaseColorState] = useState<string>(() =>
    normalizeBaseColor(localStorage.getItem(baseColorStorageKey) || defaultBaseColor),
  );
  const [customThemeActive, setCustomThemeActive] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;

    const syncCustomThemeState = async () => {
      try {
        const selectedThemeId = await getSelectedLauncherThemeId();
        if (!mounted) {
          return;
        }
        setCustomThemeActive(Boolean(selectedThemeId));
      } catch {
        if (!mounted) {
          return;
        }

        const rootHasThemeClass = hasClassByPrefix(
          document.documentElement,
          USER_THEME_CLASS_PREFIX,
        );
        const bodyHasThemeClass = hasClassByPrefix(document.body, USER_THEME_CLASS_PREFIX);
        setCustomThemeActive(rootHasThemeClass || bodyHasThemeClass);
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
  }, []);

  useEffect(() => {
    applyUiStyle(uiStyle, customThemeActive);
  }, [uiStyle, customThemeActive]);

  useEffect(() => {
    if (customThemeActive) {
      document.documentElement.style.removeProperty("--sc-base-rgb");
      return;
    }
    applyBaseColor(baseColor);
  }, [baseColor, customThemeActive]);

  const setUiStyle = (style: UiStylePreference) => {
    localStorage.setItem(styleStorageKey, style);
    setUiStyleState(style);
  };

  const setBaseColor = (color: string) => {
    const normalized = normalizeBaseColor(color);
    localStorage.setItem(baseColorStorageKey, normalized);
    setBaseColorState(normalized);
  };

  const value = useMemo(
    () => ({
      uiStyle,
      baseColor,
      setUiStyle,
      setBaseColor,
    }),
    [uiStyle, baseColor],
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
