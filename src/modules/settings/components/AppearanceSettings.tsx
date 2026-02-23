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
      if (currentThemeBase === "glass") {
        setTheme("glass-dark");
      } else if (currentThemeBase === "default") {
        setTheme("dark");
      } else {
        setTheme(`${currentThemeBase}-dark` as any);
      }
    } else {
      if (currentThemeBase === "glass") {
        setTheme("glass");
      } else if (currentThemeBase === "default") {
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
        className="mb-1 opacity-60 hover:opacity-100 transition-opacity" 
        onSelect={onBack}
      >
        <div className="flex items-center gap-2">
          <ArrowLeft className="size-5" />
          <span className="font-mono text-[10px] uppercase tracking-widest">Back</span>
        </div>
      </CommandItem>

      <div className="px-1 pb-1">
        <p className="px-2 mb-2 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50">
          Appearance Mode
        </p>

        <div className="grid grid-cols-2 gap-2 px-1">
          <button
            onClick={() => toggleDarkMode(false)}
            className={cn(
              "group relative flex flex-col items-center gap-2 rounded-xl border p-3 transition-all duration-300",
              !isDarkMode 
                ? "border-primary bg-primary/5 ring-2 ring-primary/10" 
                : "border-border/50 bg-muted/10 hover:border-border hover:bg-muted/20"
            )}
          >
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg transition-all",
              !isDarkMode ? "bg-primary text-primary-foreground shadow-md" : "bg-background text-muted-foreground"
            )}>
              <Sun className="size-6" />
            </div>
            <span className={cn("text-xs font-bold tracking-tight", !isDarkMode ? "text-foreground" : "text-muted-foreground")}>Light</span>
          </button>

          <button
            onClick={() => toggleDarkMode(true)}
            className={cn(
              "group relative flex flex-col items-center gap-2 rounded-xl border p-3 transition-all duration-300",
              isDarkMode 
                ? "border-primary bg-primary/5 ring-2 ring-primary/10" 
                : "border-border/50 bg-muted/10 hover:border-border hover:bg-muted/20"
            )}
          >
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg transition-all",
              isDarkMode ? "bg-primary text-primary-foreground shadow-md" : "bg-background text-muted-foreground"
            )}>
              <Moon className="size-6" />
            </div>
            <span className={cn("text-xs font-bold tracking-tight", isDarkMode ? "text-foreground" : "text-muted-foreground")}>Dark</span>
          </button>
        </div>
      </div>
    </CommandGroup>
  );
}
