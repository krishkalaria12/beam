import { CommandItem, CommandShortcut } from "@/components/ui/command";

import { type Application } from "../api/search-applications";
import ApplicationIcon from "./application-icon";

type ApplicationCommandItemProps = {
  application: Application;
  isLaunching: boolean;
  launchErrorMessage: string | null;
  onOpen: (execPath: string) => void;
};

export default function ApplicationCommandItem({
  application,
  isLaunching,
  launchErrorMessage,
  onOpen,
}: ApplicationCommandItemProps) {
  const execPath = application.exec_path.trim();
  const isLaunchable = execPath.length > 0;

  return (
    <CommandItem
      value={application.name}
      className="rounded-md px-3 py-2.5"
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
        <p className="truncate text-[1.08rem] leading-tight text-foreground">{application.name}</p>
        {launchErrorMessage && (
          <p className="truncate text-sm leading-tight text-destructive">{launchErrorMessage}</p>
        )}
      </div>
      <CommandShortcut className="normal-case tracking-normal text-muted-foreground">
        {isLaunching ? "launching" : isLaunchable ? "application" : "unavailable"}
      </CommandShortcut>
    </CommandItem>
  );
}
