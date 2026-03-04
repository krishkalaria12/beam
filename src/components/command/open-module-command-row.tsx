import type { FocusEventHandler, PointerEventHandler, ReactNode } from "react";

import { BaseCommandRow } from "@/components/command/base-command-row";

interface OpenModuleCommandRowProps {
  value: string;
  icon: ReactNode;
  title: string;
  onSelect: () => void;
  onPointerEnter?: PointerEventHandler<HTMLDivElement>;
  onFocus?: FocusEventHandler<HTMLDivElement>;
  disabled?: boolean;
  subtitle?: string;
  shortcut?: ReactNode;
}

export function OpenModuleCommandRow({
  value,
  icon,
  title,
  onSelect,
  onPointerEnter,
  onFocus,
  disabled,
  subtitle,
  shortcut = "open",
}: OpenModuleCommandRowProps) {
  return (
    <BaseCommandRow
      value={value}
      icon={icon}
      title={title}
      subtitle={subtitle}
      disabled={disabled}
      onSelect={onSelect}
      onPointerEnter={onPointerEnter}
      onFocus={onFocus}
      shortcut={shortcut}
      titleClassName="truncate text-foreground capitalize"
      subtitleClassName="truncate text-xs text-muted-foreground"
    />
  );
}
