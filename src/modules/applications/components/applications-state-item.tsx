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
    <CommandItem disabled className="px-3 py-3 opacity-80">
      <Icon className={iconClassName ?? "size-4 text-muted-foreground"} />
      <div className="min-w-0">
        <p className="truncate text-[1.04rem] leading-tight text-foreground/90">{title}</p>
      </div>
    </CommandItem>
  );
}
