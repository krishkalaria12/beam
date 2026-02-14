import { createContext, useContext, useEffect, useState } from "react";

type Theme = "default" | "dark" | "twitter" | "twitter-dark" | "cyberpunk" | "cyberpunk-dark" | "nepbrutalism" | "nepbrutalism-dark" | "northern-lights" | "northern-lights-dark" | "glass" | "glass-dark" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "beam-theme",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  );

  useEffect(() => {
    const root = window.document.documentElement;
    
    // List of all base theme names defined in CSS
    const allThemes = ["twitter", "cyberpunk", "nepbrutalism", "northern-lights", "glass"];
    
    // Remove all possible theme and dark classes
    root.classList.remove("light", "dark", ...allThemes);

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
      return;
    }

    // Handle theme variants
    const isDark = theme === "dark" || theme.endsWith("-dark");
    const baseTheme = theme.replace("-dark", "");

    if (allThemes.includes(baseTheme)) {
      root.classList.add(baseTheme);
    }

    if (isDark) {
      root.classList.add("dark");
    } else if (baseTheme === "default") {
      root.classList.add("light");
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    localStorage.setItem(storageKey, newTheme);
    setThemeState(newTheme);
  };

  const value = {
    theme,
    setTheme,
  };

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
