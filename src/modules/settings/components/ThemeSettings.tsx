import { ArrowLeft, Check } from "lucide-react";
import { CommandGroup, CommandItem } from "@/components/ui/command";
import { useTheme } from "@/components/theme-provider";
import { THEME_OPTIONS } from "../constants";
import type { ThemeOption } from "../constants";
import { cn } from "@/lib/utils";

interface ThemeSettingsProps {
  onBack: () => void;
}

function ThemeSwatch({ theme, isSelected, onClick }: { theme: ThemeOption; isSelected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex flex-col gap-1.5 rounded-lg border p-1.5 transition-all outline-none",
        isSelected 
          ? "border-primary bg-primary/5 ring-1 ring-primary/10" 
          : "border-border/40 hover:border-border hover:bg-muted/30"
      )}
    >
      <div 
        className="relative h-12 w-full overflow-hidden rounded-md border border-border/10"
        style={{ background: theme.background }}
      >
        <div 
          className="absolute bottom-0 right-0 h-6 w-6 rounded-tl-lg"
          style={{ background: theme.primary }}
        />
        
        {isSelected && (
          <div className="absolute inset-0 flex items-center justify-center bg-primary/5 backdrop-blur-[0.5px]">
            <Check className="size-3.5 text-primary" />
          </div>
        )}
      </div>
      
      <span className={cn(
        "font-mono text-[8px] font-bold uppercase tracking-wider text-center",
        isSelected ? "text-primary" : "text-muted-foreground"
      )}>
        {theme.name}
      </span>
    </button>
  );
}

export function ThemeSettings({ onBack }: ThemeSettingsProps) {
  const { theme, setTheme } = useTheme();
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
          Theme Palette
        </p>
        <p className="px-2 pb-2 text-[10px] text-muted-foreground/70">
          Glass is the default Beam style.
        </p>

        <div className="grid grid-cols-3 gap-2 px-1 sm:grid-cols-4">
          {THEME_OPTIONS.map((option) => (
            <ThemeSwatch
              key={option.id}
              theme={option}
              isSelected={currentThemeBase === option.id}
              onClick={() => handleThemeChange(option.id)}
            />
          ))}
        </div>
      </div>
    </CommandGroup>
  );
}
