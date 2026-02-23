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
      className={className}
    >
      {icon ?? null}
      <div className="min-w-0">
        {typeof title === "string" ? (
          <p className={cn("truncate text-foreground", titleClassName)}>{title}</p>
        ) : (
          title
        )}
        {subtitle
          ? typeof subtitle === "string"
            ? (
              <p className={cn("truncate text-xs text-muted-foreground", subtitleClassName)}>{subtitle}</p>
            )
            : subtitle
          : null}
      </div>
      {endSlot ?? (shortcut ? <CommandShortcut>{shortcut}</CommandShortcut> : null)}
    </CommandItem>
  );
}
