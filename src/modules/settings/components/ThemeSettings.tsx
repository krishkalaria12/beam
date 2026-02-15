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
        "group relative flex flex-col gap-2 rounded-xl border-2 p-2 transition-all duration-300 outline-none",
        isSelected 
          ? "border-primary bg-primary/5 ring-2 ring-primary/10" 
          : "border-border/40 hover:border-border hover:bg-muted/50"
      )}
    >
      <div 
        className="relative h-20 w-full overflow-hidden rounded-lg border border-border/20 shadow-sm transition-transform duration-500 group-hover:scale-[1.02]"
        style={{ background: theme.background }}
      >
        {/* Minimalist preview elements */}
        <div className="absolute top-2 left-2 flex gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-border/40" />
          <div className="h-1.5 w-1.5 rounded-full bg-border/40" />
        </div>
        
        <div 
          className="absolute bottom-0 right-0 h-12 w-12 rounded-tl-2xl shadow-2xl transition-all duration-500 group-hover:h-14 group-hover:w-14"
          style={{ background: theme.primary }}
        />
        
        {isSelected && (
          <div className="absolute inset-0 flex items-center justify-center bg-primary/10 backdrop-blur-[1px]">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
              <Check className="size-5" />
            </div>
          </div>
        )}
      </div>
      
      <div className="flex items-center justify-between px-1">
        <span className={cn(
          "font-mono text-[10px] font-bold uppercase tracking-wider",
          isSelected ? "text-primary" : "text-muted-foreground"
        )}>
          {theme.name}
        </span>
      </div>
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
          Theme Palette
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
