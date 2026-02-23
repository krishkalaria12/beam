import { AlertTriangle, Search } from "lucide-react";
import { useCommandState } from "cmdk";

import { CommandGroup, CommandItem } from "@/components/ui/command";

import { useApplicationSearch } from "../hooks/use-application-search";
import { useOpenApplication } from "../hooks/use-open-application";
import ApplicationCommandItem from "./application-command-item";

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
        <CommandItem disabled className="opacity-60">
          <Search className="size-4 text-muted-foreground/40" />
          <p className="truncate text-foreground/80">Searching applications...</p>
        </CommandItem>
      )}

      {isError && (
        <CommandItem disabled className="opacity-60">
          <AlertTriangle className="size-4 text-destructive/60" />
          <p className="truncate text-foreground/80">Could not load applications</p>
        </CommandItem>
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
