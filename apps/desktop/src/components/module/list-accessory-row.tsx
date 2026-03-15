import type { CSSProperties, ReactNode } from "react";

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
  style?: CSSProperties;
}

export function ListAccessoryRow({ items, className, style }: ListAccessoryRowProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className={cn("module-list-accessory-row flex items-center gap-2", className)} style={style}>
      {items.map((item) => (
        <ListAccessory
          key={item.key}
          text={item.text}
          accentColor={item.accentColor}
          fill={item.fill}
          icon={item.icon}
          tooltip={item.tooltip}
          style={style}
        />
      ))}
    </div>
  );
}
