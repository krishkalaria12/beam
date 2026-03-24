import { useCallback, useEffect } from "react";
import { AlertTriangle, Search } from "lucide-react";
import { useCommandState } from "cmdk";

import { CommandGroup, CommandItem } from "@/components/ui/command";
import { useMountEffect } from "@/hooks/use-mount-effect";
import {
  useManagedItemPreferencesStore,
  useManagedItemRankedList,
} from "@/modules/launcher/managed-items";
import {
  clearApplicationActionsState,
  syncApplicationActionsState,
  toManagedApplicationItem,
} from "@/modules/applications/hooks/use-application-action-items";

import { useApplicationSearch } from "../hooks/use-application-search";
import { useOpenApplication } from "../hooks/use-open-application";
import ApplicationCommandItem from "./application-command-item";
import type { Application } from "../api/search-applications";

export default function ApplicationsCommandGroup() {
  const searchInput = useCommandState((state) => state.search);
  const query = searchInput.trim();
  const recordUsage = useManagedItemPreferencesStore((state) => state.recordUsage);

  const { data, isLoading, isError } = useApplicationSearch(query);
  const { launchApplication, launchingExecPath, launchError } = useOpenApplication();
  const applications = useManagedItemRankedList({
    items: data ?? [],
    query,
    getManagedItem: toManagedApplicationItem,
    getSearchableText: (application) =>
      `${application.description} ${application.app_id} ${application.exec_path}`,
  });

  const handleOpen = useCallback(
    (application: Application) => {
      recordUsage(toManagedApplicationItem(application));
      launchApplication(application.exec_path);
    },
    [launchApplication, recordUsage],
  );

  useMountEffect(() => clearApplicationActionsState);

  useEffect(() => {
    syncApplicationActionsState({
      selectedApplication: query ? (applications[0] ?? null) : null,
      onOpen: handleOpen,
    });
  }, [applications, handleOpen, query]);

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
          <p className="truncate text-muted-foreground">Searching applications...</p>
        </CommandItem>
      )}

      {isError && (
        <CommandItem disabled className="opacity-60">
          <AlertTriangle className="size-4 text-destructive/60" />
          <p className="truncate text-muted-foreground">Could not load applications</p>
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
            onOpen={handleOpen}
          />
        ))}
    </CommandGroup>
  );
}
