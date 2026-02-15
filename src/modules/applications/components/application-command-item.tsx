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
      disabled={!isLaunchable || isLaunching}
      onSelect={() => {
        if (!isLaunchable || isLaunching) {
          return;
        }

        onOpen(execPath);
      }}
    >
      <ApplicationIcon iconPath={application.icon} className="size-6 rounded-sm" />
      <p className="truncate text-foreground capitalize">{application.name}</p>
      {launchErrorMessage && (
        <p className="truncate text-[10px] text-destructive ml-2">{launchErrorMessage}</p>
      )}
      <CommandShortcut>
        {isLaunching ? "launching" : isLaunchable ? "app" : "unavailable"}
      </CommandShortcut>
    </CommandItem>
  );
}
