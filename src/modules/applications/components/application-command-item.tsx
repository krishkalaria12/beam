import { CommandItem, CommandShortcut } from "@/components/ui/command";

import { type Application } from "../api/get-applications";
import ApplicationIcon from "./application-icon";

type ApplicationCommandItemProps = {
  application: Application;
};

export default function ApplicationCommandItem({ application }: ApplicationCommandItemProps) {
  return (
    <CommandItem
      value={`${application.name} ${application.description}`}
      className="rounded-md px-3 py-3"
    >
      <ApplicationIcon iconPath={application.icon} />
      <div className="min-w-0">
        <p className="truncate text-[1.08rem] leading-tight text-zinc-100">{application.name}</p>
        <p className="truncate text-base leading-tight text-zinc-400">{application.description}</p>
      </div>
      <CommandShortcut className="normal-case tracking-normal text-zinc-400">
        application
      </CommandShortcut>
    </CommandItem>
  );
}
