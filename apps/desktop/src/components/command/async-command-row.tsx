import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

import { BaseCommandRow } from "@/components/command/base-command-row";

interface AsyncCommandRowProps {
  value: string;
  icon: ReactNode;
  title: string;
  onSelect: () => void;
  isBusy: boolean;
  disabled?: boolean;
  subtitle?: string;
  busyShortcut?: ReactNode;
  idleShortcut?: ReactNode;
  titleClassName?: string;
  subtitleClassName?: string;
  endSlot?: ReactNode;
}

export function AsyncCommandRow({
  value,
  icon,
  title,
  onSelect,
  isBusy,
  disabled,
  subtitle,
  busyShortcut = "running",
  idleShortcut,
  titleClassName,
  subtitleClassName,
  endSlot,
}: AsyncCommandRowProps) {
  return (
    <BaseCommandRow
      value={value}
      icon={
        isBusy ? (
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-transparent">
            <Loader2 className="size-5 animate-spin text-muted-foreground/65" />
          </div>
        ) : (
          icon
        )
      }
      title={title}
      subtitle={subtitle}
      disabled={disabled || isBusy}
      onSelect={onSelect}
      endSlot={endSlot}
      shortcut={!endSlot ? (isBusy ? busyShortcut : idleShortcut) : undefined}
      titleClassName={titleClassName ?? "truncate text-foreground capitalize"}
      subtitleClassName={subtitleClassName ?? "truncate text-launcher-sm text-muted-foreground"}
    />
  );
}
