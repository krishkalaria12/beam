import { AsyncCommandRow } from "@/components/command/async-command-row";
import { CommandIcon } from "@/components/icons/command-icon";

import { type Application } from "../api/search-applications";

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
    <AsyncCommandRow
      value={application.name}
      disabled={!isLaunchable}
      isBusy={isLaunching}
      onSelect={() => {
        if (!isLaunchable || isLaunching) {
          return;
        }

        onOpen(execPath);
      }}
      icon={<CommandIcon icon={`app-icon:${application.icon}`} />}
      title={application.name}
      subtitle={launchErrorMessage ?? undefined}
      subtitleClassName="truncate text-launcher-2xs text-destructive"
      busyShortcut="launching"
      idleShortcut={isLaunchable ? "app" : "unavailable"}
    />
  );
}
