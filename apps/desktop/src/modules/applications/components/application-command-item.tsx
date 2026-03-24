import { AsyncCommandRow } from "@/components/command/async-command-row";
import { CommandIcon } from "@/components/icons/command-icon";
import { syncApplicationActionsState } from "@/modules/applications/hooks/use-application-action-items";

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

  const activate = () => {
    syncApplicationActionsState({
      selectedApplication: application,
      onOpen,
    });
  };

  return (
    <AsyncCommandRow
      value={application.name}
      disabled={!isLaunchable}
      isBusy={isLaunching}
      onSelect={() => {
        activate();
        if (!isLaunchable || isLaunching) {
          return;
        }

        onOpen(execPath);
      }}
      onPointerEnter={activate}
      onFocus={activate}
      icon={<CommandIcon icon={`app-icon:${application.icon}`} />}
      title={application.name}
      subtitle={launchErrorMessage ?? undefined}
      subtitleClassName="truncate text-launcher-2xs text-destructive"
      busyShortcut="launching"
      idleShortcut={isLaunchable ? "app" : "unavailable"}
    />
  );
}
