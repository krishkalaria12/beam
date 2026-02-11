import { AlertTriangle, AppWindow, Loader2 } from "lucide-react";

import { CommandGroup } from "@/components/ui/command";

import { useApplications } from "../hooks/use-applications";
import { useOpenApplication } from "../hooks/use-open-application";
import ApplicationCommandItem from "./application-command-item";
import ApplicationsStateItem from "./applications-state-item";

export default function ApplicationsCommandGroup() {
  const { data, isLoading, isError, error, isFetching } = useApplications();
  const { launchApplication, launchingExecPath, launchError } = useOpenApplication();
  const applications = data ?? [];
  const errorMessage =
    error instanceof Error && error.message.trim().length > 0
      ? error.message
      : "unexpected backend error";

  return (
    <CommandGroup heading={isFetching && !isLoading ? "applications (updating)" : "applications"}>
      {isLoading && (
        <ApplicationsStateItem
          icon={Loader2}
          iconClassName="size-4 animate-spin text-zinc-400"
          title="loading applications"
          description="indexing desktop entries"
        />
      )}

      {isError && (
        <ApplicationsStateItem
          icon={AlertTriangle}
          iconClassName="size-4 text-amber-400"
          title="could not load applications"
          description={errorMessage}
        />
      )}

      {!isLoading && !isError && applications.length === 0 && (
        <ApplicationsStateItem
          icon={AppWindow}
          title="no applications found"
          description="check desktop entries and try again"
        />
      )}

      {!isLoading &&
        !isError &&
        applications.map((application) => (
          <ApplicationCommandItem
            key={`${application.name}-${application.exec_path}`}
            application={application}
            isLaunching={launchingExecPath === application.exec_path}
            launchErrorMessage={
              launchError?.execPath === application.exec_path ? launchError.message : null
            }
            onOpen={launchApplication}
          />
        ))}
    </CommandGroup>
  );
}
