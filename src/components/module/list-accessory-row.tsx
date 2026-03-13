import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { ListAccessory } from "./list-accessory";

export interface ListAccessoryItem {
  key: string;
  text: ReactNode;
  accentColor?: string;
  fill?: boolean;
  icon?: ReactNode;
  tooltip?: string;
}

interface ListAccessoryRowProps {
  items: ListAccessoryItem[];
  className?: string;
}

export function ListAccessoryRow({ items, className }: ListAccessoryRowProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {items.map((item) => (
        <ListAccessory
          key={item.key}
          text={item.text}
          accentColor={item.accentColor}
          fill={item.fill}
          icon={item.icon}
          tooltip={item.tooltip}
        />
      ))}
    </div>
  );
}
