import { ArrowLeft, Moon, Sun } from "lucide-react";
import { CommandGroup, CommandItem } from "@/components/ui/command";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

interface AppearanceSettingsProps {
  onBack: () => void;
}

export function AppearanceSettings({ onBack }: AppearanceSettingsProps) {
  const { theme, setTheme } = useTheme();
  
  const isDarkMode = theme === "dark" || theme.endsWith("-dark");
  const currentThemeBase = theme.replace("-dark", "");

  const toggleDarkMode = (isDark: boolean) => {
    if (isDark) {
      if (currentThemeBase === "default") {
        setTheme("dark");
      } else {
        setTheme(`${currentThemeBase}-dark` as any);
      }
    } else {
      if (currentThemeBase === "default") {
        setTheme("default");
      } else {
        setTheme(currentThemeBase as any);
      }
    }
  };

  return (
    <CommandGroup>
      <CommandItem 
        value="back to settings" 
        className="rounded-md px-3 py-2.5 mb-2 opacity-60 hover:opacity-100 transition-opacity" 
        onSelect={onBack}
      >
        <div className="flex items-center gap-3">
          <ArrowLeft className="size-4" />
          <span className="font-mono text-xs uppercase tracking-widest">Back to Settings</span>
        </div>
      </CommandItem>

      <div className="px-2 pb-2">
        <p className="px-2 mb-4 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50">
          Appearance Mode
        </p>

        <div className="grid grid-cols-2 gap-3 px-1">
          <button
            onClick={() => toggleDarkMode(false)}
            className={cn(
              "group relative flex flex-col items-center gap-4 rounded-2xl border-2 p-6 transition-all duration-300",
              !isDarkMode 
                ? "border-primary bg-primary/5 ring-4 ring-primary/10" 
                : "border-border/50 bg-muted/20 hover:border-border hover:bg-muted/40"
            )}
          >
            <div className={cn(
              "flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-500",
              !isDarkMode ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-background text-muted-foreground"
            )}>
              <Sun className="size-8" />
            </div>
            <div className="text-center">
              <span className={cn("text-sm font-bold tracking-tight", !isDarkMode ? "text-foreground" : "text-muted-foreground")}>Light</span>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">Crisp & Clear</p>
            </div>
          </button>

          <button
            onClick={() => toggleDarkMode(true)}
            className={cn(
              "group relative flex flex-col items-center gap-4 rounded-2xl border-2 p-6 transition-all duration-300",
              isDarkMode 
                ? "border-primary bg-primary/5 ring-4 ring-primary/10" 
                : "border-border/50 bg-muted/20 hover:border-border hover:bg-muted/40"
            )}
          >
            <div className={cn(
              "flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-500",
              isDarkMode ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-background text-muted-foreground"
            )}>
              <Moon className="size-8" />
            </div>
            <div className="text-center">
              <span className={cn("text-sm font-bold tracking-tight", isDarkMode ? "text-foreground" : "text-muted-foreground")}>Dark</span>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">Easy on eyes</p>
            </div>
          </button>
        </div>
      </div>
    </CommandGroup>
  );
}
