import { useMountEffect } from "@/hooks/use-mount-effect";

type ThemeProviderProps = {
  children: React.ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  useMountEffect(() => {
    const root = window.document.documentElement;
    const themeClasses = ["light", "dark", "glass"];

    root.classList.remove(...themeClasses);
    root.classList.add("glass", "dark");
  });

  return <>{children}</>;
}
