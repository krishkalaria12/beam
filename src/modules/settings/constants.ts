export type ThemeOption = {
  id: string;
  name: string;
  primary: string;
  background: string;
};

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: "glass",
    name: "Glass",
    primary: "oklch(0.5 0 0)",
    background: "oklch(1 0 0 / 20%)",
  },
  {
    id: "default",
    name: "Default",
    primary: "oklch(0.205 0 0)",
    background: "oklch(1 0 0)",
  },
  {
    id: "twitter",
    name: "Twitter",
    primary: "oklch(0.6723 0.1606 244.9955)",
    background: "oklch(1.0000 0 0)",
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    primary: "oklch(0.6489 0.2370 26.9728)",
    background: "oklch(1.0000 0 0)",
  },
  {
    id: "nepbrutalism",
    name: "Nepbrut",
    primary: "oklch(0.6487 0.1538 150.3071)",
    background: "oklch(0.9824 0.0013 286.3757)",
  },
  {
    id: "northern-lights",
    name: "Northern",
    primary: "oklch(0.6726 0.2904 341.4084)",
    background: "oklch(0.9816 0.0017 247.8390)",
  },
];

export type SettingsView = "main" | "appearance" | "themes" | "layout";
