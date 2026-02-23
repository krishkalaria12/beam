import type { ReactNode } from "react";

import { BaseCommandRow } from "@/components/command/base-command-row";

interface OpenModuleCommandRowProps {
  value: string;
  icon: ReactNode;
  title: string;
  onSelect: () => void;
  disabled?: boolean;
  subtitle?: string;
  shortcut?: ReactNode;
}

export function OpenModuleCommandRow({
  value,
  icon,
  title,
  onSelect,
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
      shortcut={shortcut}
      titleClassName="truncate text-foreground capitalize"
      subtitleClassName="truncate text-xs text-muted-foreground"
    />
  );
}
