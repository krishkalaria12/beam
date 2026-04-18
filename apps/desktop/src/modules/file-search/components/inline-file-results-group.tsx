import { useCommandState } from "cmdk";
import { useCallback, useMemo } from "react";

import { BaseCommandRow } from "@/components/command/base-command-row";
import { CommandIcon } from "@/components/icons/command-icon";
import { CommandGroup } from "@/components/ui/command";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { openFile } from "@/modules/file-search/api/open-file";
import { useFileSearch } from "@/modules/file-search/hooks/use-file-search";
import {
  clearFileSearchActionsState,
  syncFileSearchActionsState,
  toManagedFileItem,
} from "@/modules/file-search/hooks/use-file-search-action-items";
import {
  selectInlineFileBestBand,
  sortInlineFileResults,
} from "@/modules/file-search/lib/inline-results";
import type { FileEntry } from "@/modules/file-search/types";
import { useManagedItemPreferencesStore } from "@/modules/launcher/managed-items";

interface InlineFileResultsGroupProps {
  query: string;
  onPrimaryCommandValueChange?: (value: string) => void;
}

function getInlineFileRowValue(file: FileEntry): string {
  return `inline-file ${file.path} ${file.name}`;
}

function InlineFileResultsLifecycle() {
  useMountEffect(() => {
    return () => {
      clearFileSearchActionsState();
    };
  });
  return null;
}

function InlineFileSelectionSync({
  file,
  onOpenSelected,
}: {
  file: FileEntry;
  onOpenSelected: () => void;
}) {
  useMountEffect(() => {
    syncFileSearchActionsState({
      selectedFile: file,
      onOpenSelected,
    });

    return () => {
      clearFileSearchActionsState();
    };
  });

  return null;
}

function InlineFilePrimarySelectionSync({
  value,
  onPrimaryCommandValueChange,
}: {
  value: string;
  onPrimaryCommandValueChange: (value: string) => void;
}) {
  useMountEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      onPrimaryCommandValueChange(value);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  });

  return null;
}

export function InlineFileResultsGroup({
  query,
  onPrimaryCommandValueChange,
}: InlineFileResultsGroupProps) {
  const selectedCommandValue = useCommandState((state) => state.value);
  const favoriteIds = useManagedItemPreferencesStore((state) => state.favoriteIds);
  const usageById = useManagedItemPreferencesStore((state) => state.usageById);
  const recordUsage = useManagedItemPreferencesStore((state) => state.recordUsage);
  const { data, isFetching } = useFileSearch(query, 1, 20);

  const sortedResults = useMemo(
    () =>
      sortInlineFileResults(data?.results ?? [], {
        query,
        favoriteIds,
        usageById,
      }),
    [data?.results, favoriteIds, query, usageById],
  );

  const visibleResults = useMemo(() => selectInlineFileBestBand(sortedResults), [sortedResults]);
  const visibleResultsKey = useMemo(
    () => visibleResults.map((result) => result.entry.path).join("\u0000"),
    [visibleResults],
  );

  const handleOpenFile = useCallback(
    (file: FileEntry) => {
      recordUsage(toManagedFileItem(file));
      void openFile(file.path);
    },
    [recordUsage],
  );

  const selectedFile =
    visibleResults.find((result) => getInlineFileRowValue(result.entry) === selectedCommandValue)
      ?.entry ?? null;

  if (visibleResults.length === 0) {
    return null;
  }

  return (
    <>
      <InlineFileResultsLifecycle key={visibleResultsKey} />
      {onPrimaryCommandValueChange && visibleResults.length > 0 ? (
        <InlineFilePrimarySelectionSync
          key={`inline-primary\u0000${visibleResultsKey}`}
          value={getInlineFileRowValue(visibleResults[0].entry)}
          onPrimaryCommandValueChange={onPrimaryCommandValueChange}
        />
      ) : null}
      {selectedFile ? (
        <InlineFileSelectionSync
          key={`${visibleResultsKey}\u0000${selectedFile.path}`}
          file={selectedFile}
          onOpenSelected={() => {
            handleOpenFile(selectedFile);
          }}
        />
      ) : null}

      <CommandGroup
        heading="Files"
        className={isFetching ? "transition-opacity duration-150 opacity-85" : "transition-opacity duration-150"}
      >
        {visibleResults.map((result) => (
          <BaseCommandRow
            key={result.entry.path}
            value={getInlineFileRowValue(result.entry)}
            onSelect={() => {
              handleOpenFile(result.entry);
            }}
            onPointerEnter={() => {
              syncFileSearchActionsState({
                selectedFile: result.entry,
                onOpenSelected: () => {
                  handleOpenFile(result.entry);
                },
              });
            }}
            onFocus={() => {
              syncFileSearchActionsState({
                selectedFile: result.entry,
                onOpenSelected: () => {
                  handleOpenFile(result.entry);
                },
              });
            }}
            icon={<CommandIcon icon="file" />}
            title={result.entry.name}
            subtitle={result.entry.path}
            shortcut="file"
          />
        ))}
      </CommandGroup>
    </>
  );
}
