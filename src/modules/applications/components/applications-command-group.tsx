import { AlertTriangle, Loader2 } from "lucide-react";
import { useCommandState } from "cmdk";

import { CommandGroup } from "@/components/ui/command";

import { useApplicationSearch } from "../hooks/use-application-search";
import { useOpenApplication } from "../hooks/use-open-application";
import ApplicationCommandItem from "./application-command-item";
import ApplicationsStateItem from "./applications-state-item";

export default function ApplicationsCommandGroup() {
  const searchInput = useCommandState((state) => state.search);
  const query = searchInput.trim();

  const { data, isLoading, isError, isFetching } = useApplicationSearch(query);
  const { launchApplication, launchingExecPath, launchError } = useOpenApplication();
  const applications = data ?? [];

  if (!query) {
    return null;
  }

  if (!isLoading && !isError && applications.length === 0) {
    return null;
  }

  return (
    <CommandGroup>
      {isLoading && (
        <ApplicationsStateItem
          icon={Loader2}
          iconClassName="size-4 animate-spin text-muted-foreground/40"
          title="Searching Applications..."
        />
      )}

      {isError && (
        <ApplicationsStateItem
          icon={AlertTriangle}
          iconClassName="size-4 text-destructive/60"
          title="Could not load applications"
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
