import type { LucideIcon } from "lucide-react";

import { CommandItem } from "@/components/ui/command";

type ApplicationsStateItemProps = {
  icon: LucideIcon;
  title: string;
  iconClassName?: string;
};

export default function ApplicationsStateItem({
  icon: Icon,
  title,
  iconClassName,
}: ApplicationsStateItemProps) {
  return (
    <CommandItem disabled className="opacity-60">
      <Icon className={iconClassName ?? "size-4 text-muted-foreground/60"} />
      <p className="truncate text-foreground/80">{title}</p>
    </CommandItem>
  );
}
