import { CommandItem, CommandShortcut } from "@/components/ui/command";
import { memo } from "react";

import { type Application } from "../api/get-applications";
import ApplicationIcon from "./application-icon";

type ApplicationCommandItemProps = {
  application: Application;
  isLaunching: boolean;
  launchErrorMessage: string | null;
  onOpen: (execPath: string) => void;
};

const ApplicationCommandItem = memo(function ApplicationCommandItem({
  application,
  isLaunching,
  launchErrorMessage,
  onOpen,
}: ApplicationCommandItemProps) {
  const execPath = application.exec_path.trim();
  const isLaunchable = execPath.length > 0;
  const subtitle = launchErrorMessage ?? application.description;

  return (
    <CommandItem
      value={`${application.name} ${application.description}`}
      className="rounded-md px-3 py-3"
      disabled={!isLaunchable || isLaunching}
      onSelect={() => {
        if (!isLaunchable || isLaunching) {
          return;
        }

        onOpen(execPath);
      }}
    >
      <ApplicationIcon iconPath={application.icon} />
      <div className="min-w-0">
        <p className="truncate text-[1.08rem] leading-tight text-zinc-100">{application.name}</p>
        <p
          className={`truncate text-base leading-tight ${
            launchErrorMessage ? "text-amber-400" : "text-zinc-400"
          }`}
        >
          {subtitle}
        </p>
      </div>
      <CommandShortcut className="normal-case tracking-normal text-zinc-400">
        {isLaunching ? "launching" : isLaunchable ? "application" : "unavailable"}
      </CommandShortcut>
    </CommandItem>
  );
});

export default ApplicationCommandItem;
