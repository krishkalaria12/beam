import { createContext, useContext, useEffect, useMemo, useState } from "react";

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

function applyUiStyle(uiStyle: UiStylePreference): void {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  const body = document.body;

  const removeStyleClasses = (element: Element | null) => {
    if (!element) {
      return;
    }

    const classesToRemove: string[] = [];
    for (const className of element.classList) {
      if (className.startsWith(STYLE_CLASS_PREFIX)) {
        classesToRemove.push(className);
      }
    }
    if (classesToRemove.length > 0) {
      element.classList.remove(...classesToRemove);
    }
  };

  // Remove all style classes first
  root.classList.remove("sc-glassy", "sc-solid");
  body?.classList.remove("sc-glassy", "sc-solid");
  removeStyleClasses(root);
  removeStyleClasses(body);

  const styleClass = `${STYLE_CLASS_PREFIX}${uiStyle}`;
  root.classList.add(styleClass);
  body?.classList.add(styleClass);

  // Apply the selected style
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

  useEffect(() => {
    applyUiStyle(uiStyle);
  }, [uiStyle]);

  useEffect(() => {
    applyBaseColor(baseColor);
  }, [baseColor]);

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
