import type { LucideIcon } from "lucide-react";

import { CommandItem } from "@/components/ui/command";

type ApplicationsStateItemProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  iconClassName?: string;
};

export default function ApplicationsStateItem({
  icon: Icon,
  title,
  description,
  iconClassName,
}: ApplicationsStateItemProps) {
  return (
    <CommandItem disabled className="px-3 py-4 opacity-80">
      <Icon className={iconClassName ?? "size-4 text-zinc-400"} />
      <div className="min-w-0">
        <p className="truncate text-[1.04rem] leading-tight text-zinc-200">{title}</p>
        <p className="truncate text-sm leading-tight text-zinc-500">{description}</p>
      </div>
    </CommandItem>
  );
}
