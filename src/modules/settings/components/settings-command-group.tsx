import { useCommandState } from "cmdk";
import { ArrowLeft, Moon, Sun } from "lucide-react";

import { CommandGroup, CommandItem, CommandShortcut } from "@/components/ui/command";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/theme-provider";

type SettingsCommandGroupProps = {
  isOpen: boolean;
  onOpen: () => void;
  onBack: () => void;
};

type ThemeOption = {
  id: string;
  name: string;
  primary: string;
  background: string;
};

const themeOptions: ThemeOption[] = [
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
  {
    id: "glass",
    name: "Glass",
    primary: "oklch(0.5 0 0)",
    background: "oklch(1 0 0 / 20%)",
  },
];

function ThemeSwatch({ theme, isSelected, onClick }: { theme: ThemeOption; isSelected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-lg border p-2 transition-all hover:scale-105 ${
        isSelected ? "border-primary ring-2 ring-primary/50" : "border-border hover:border-border/80"
      }`}
    >
      <div className="flex h-6 w-12 overflow-hidden rounded-md">
        <div className="w-1/2" style={{ background: theme.background }} />
        <div className="w-1/2" style={{ background: theme.primary }} />
      </div>
      <span className="text-[10px] text-muted-foreground">{theme.name}</span>
    </button>
  );
}

export default function SettingsCommandGroup({ isOpen, onOpen, onBack }: SettingsCommandGroupProps) {
  const searchInput = useCommandState((state) => state.search);
  const query = searchInput.trim().toLowerCase();
  const { theme, setTheme } = useTheme();

  if (!isOpen) {
    const shouldShowOpenSettings = query.length === 0 || "settings theme colors".includes(query);

    if (!shouldShowOpenSettings) {
      return null;
    }

    return (
      <CommandGroup>
        <CommandItem value="open settings" className="rounded-md px-3 py-2.5" onSelect={onOpen}>
          <div className="flex h-4 w-4 items-center justify-center rounded bg-gradient-to-br from-blue-500 to-purple-500 text-[10px] font-bold text-white">
            S
          </div>
          <div className="min-w-0">
            <p className="truncate text-[1.08rem] leading-tight text-foreground">settings</p>
          </div>
          <CommandShortcut className="normal-case tracking-normal text-muted-foreground">open</CommandShortcut>
        </CommandItem>
      </CommandGroup>
    );
  }

  const isDarkMode = theme === "dark" || theme.endsWith("-dark");
  const currentThemeBase = theme.replace("-dark", "");

  const handleThemeChange = (themeId: string) => {
    if (isDarkMode) {
      if (themeId === "default") {
        setTheme("dark");
      } else {
        setTheme(`${themeId}-dark` as any);
      }
    } else {
      setTheme(themeId as any);
    }
  };

  const toggleDarkMode = (checked: boolean) => {
    if (checked) {
      // Switch to dark mode
      if (currentThemeBase === "default") {
        setTheme("dark");
      } else {
        setTheme(`${currentThemeBase}-dark` as any);
      }
    } else {
      // Switch to light mode
      if (currentThemeBase === "default") {
        setTheme("default");
      } else {
        setTheme(currentThemeBase as any);
      }
    }
  };

  return (
    <CommandGroup>
      <CommandItem value="back to commands" className="rounded-md px-3 py-2.5" onSelect={onBack}>
        <ArrowLeft className="size-4 text-foreground/80" />
        <div className="min-w-0">
          <p className="truncate text-[1.08rem] leading-tight text-foreground">back to commands</p>
        </div>
        <CommandShortcut className="normal-case tracking-normal text-muted-foreground">back</CommandShortcut>
      </CommandItem>

      <div className="px-3 py-2">
        <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Theme</p>
        <div className="grid grid-cols-3 gap-2">
          {themeOptions.map((option) => (
            <ThemeSwatch
              key={option.id}
              theme={option}
              isSelected={currentThemeBase === option.id}
              onClick={() => handleThemeChange(option.id)}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-md px-3 py-2.5 hover:bg-accent/50 cursor-pointer">
        <div className="flex items-center gap-2">
          {isDarkMode ? <Moon className="size-4 text-foreground/80" /> : <Sun className="size-4 text-foreground/80" />}
          <div className="min-w-0">
            <p className="truncate text-[1.08rem] leading-tight text-foreground">
              {isDarkMode ? "Dark Mode" : "Light Mode"}
            </p>
          </div>
        </div>
        <Switch
          checked={isDarkMode}
          onCheckedChange={toggleDarkMode}
        />
      </div>
    </CommandGroup>
  );
}
