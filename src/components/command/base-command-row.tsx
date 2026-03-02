import type { ReactNode } from "react";

import { CommandItem, CommandShortcut } from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface BaseCommandRowProps {
  value: string;
  disabled?: boolean;
  onSelect?: () => void;
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  shortcut?: ReactNode;
  endSlot?: ReactNode;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
}

export function BaseCommandRow({
  value,
  disabled,
  onSelect,
  icon,
  title,
  subtitle,
  shortcut,
  endSlot,
  className,
  titleClassName,
  subtitleClassName,
}: BaseCommandRowProps) {
  return (
    <CommandItem
      value={value}
      disabled={disabled}
      onSelect={onSelect}
      className={cn("py-2.5", className)}
    >
      {icon ?? null}
      <div className="min-w-0 flex-1 leading-tight">
        {typeof title === "string" ? (
          <p className={cn("truncate text-foreground text-base font-medium", titleClassName)}>
            {title}
          </p>
        ) : (
          title
        )}
        {subtitle ? (
          typeof subtitle === "string" ? (
            <p className={cn("truncate text-sm text-muted-foreground", subtitleClassName)}>
              {subtitle}
            </p>
          ) : (
            subtitle
          )
        ) : null}
      </div>
      {endSlot ?? (shortcut ? <CommandShortcut>{shortcut}</CommandShortcut> : null)}
    </CommandItem>
  );
}
