import { Search, ArrowLeft, FolderSearch, Zap, ArrowUpRight } from "lucide-react";
import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import debounce from "@/lib/debounce";

import { CommandFooterBar } from "@/components/command/command-footer-bar";
import { DetailPanel, SearchInput } from "@/components/module";
import { Button } from "@/components/ui/button";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { openExternalUrl } from "@/lib/open-external-url";
import {
  getManagedItemPreferenceId,
  useManagedItemPreferencesStore,
} from "@/modules/launcher/managed-items";
import {
  clearFileSearchActionsState,
  syncFileSearchActionsState,
  toManagedFileItem,
} from "@/modules/file-search/hooks/use-file-search-action-items";
import { useFileSearch } from "../hooks/use-file-search";
import { useFileSearchBackendStatus } from "../hooks/use-file-search-backend-status";
import { useOpenFile } from "../hooks/use-open-file";
import { FileList } from "./file-list";
import { FileDetails } from "./file-details";

interface FileSearchViewProps {
  initialQuery: string;
  onBack: () => void;
}

export function FileSearchView({ initialQuery, onBack }: FileSearchViewProps) {
  const [query, setQuery] = useState(() => initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(() => initialQuery);
  const [selectionState, setSelectionState] = useState({ key: "", path: "" });
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const favoriteIds = useManagedItemPreferencesStore((state) => state.favoriteIds);
  const usageById = useManagedItemPreferencesStore((state) => state.usageById);
  const recordUsage = useManagedItemPreferencesStore((state) => state.recordUsage);

  const { data, isLoading } = useFileSearch(debouncedQuery);
  const { data: backendStatus } = useFileSearchBackendStatus();
  const { mutate: openFile } = useOpenFile();

  useMountEffect(() => clearFileSearchActionsState);

  const updateDebouncedQuery = useMemo(
    () => debounce((value: string) => setDebouncedQuery(value), 150),
    [],
  );

  const results = useMemo(() => {
    const baseResults = data?.results ?? [];

    return [...baseResults].sort((left, right) => {
      const leftItem = toManagedFileItem(left.entry);
      const rightItem = toManagedFileItem(right.entry);
      const leftId = getManagedItemPreferenceId(leftItem);
      const rightId = getManagedItemPreferenceId(rightItem);

      if (left.score !== right.score) {
        return right.score - left.score;
      }

      const leftFavorite = favoriteIds.includes(leftId);
      const rightFavorite = favoriteIds.includes(rightId);
      if (leftFavorite !== rightFavorite) {
        return leftFavorite ? -1 : 1;
      }

      const leftUsage = usageById[leftId]?.count ?? 0;
      const rightUsage = usageById[rightId]?.count ?? 0;
      if (leftUsage !== rightUsage) {
        return rightUsage - leftUsage;
      }

      return left.entry.path.localeCompare(right.entry.path);
    });
  }, [data?.results, favoriteIds, usageById]);
  const selectionKey = `${debouncedQuery}\u0000${results.length}`;
  const selectedIndex =
    selectionState.key === selectionKey
      ? Math.max(
          0,
          results.findIndex((result) => result.entry.path === selectionState.path),
        )
      : 0;
  const setSelectedIndex = useCallback(
    (value: number | ((previous: number) => number)) => {
      setSelectionState((previous) => {
        const nextIndex =
          typeof value === "function"
            ? value(
                previous.key === selectionKey
                  ? Math.max(
                      0,
                      results.findIndex((result) => result.entry.path === previous.path),
                    )
                  : 0,
              )
            : value;
        const boundedIndex = Math.max(0, Math.min(nextIndex, Math.max(results.length - 1, 0)));
        const nextResult = results[boundedIndex]?.entry ?? null;

        return {
          key: selectionKey,
          path: nextResult?.path ?? "",
        };
      });
    },
    [results, selectionKey],
  );
  const selectedFile = results[selectedIndex]?.entry || null;
  const handleOpenSelected = useCallback(() => {
    if (selectedFile) {
      recordUsage(toManagedFileItem(selectedFile));
      openFile(selectedFile.path);
    }
  }, [openFile, recordUsage, selectedFile]);

  useEffect(() => {
    syncFileSearchActionsState({
      selectedFile,
      onOpenSelected: handleOpenSelected,
    });
  }, [handleOpenSelected, selectedFile]);
  const focusInputRef = useCallback((node: HTMLInputElement | null) => {
    inputRef.current = node;
    node?.focus();
  }, []);

  // Centralized keyboard handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedFile) {
          recordUsage(toManagedFileItem(selectedFile));
          openFile(selectedFile.path);
        }
        break;
      case "Escape":
        e.preventDefault();
        onBack();
        break;
    }
  };

  const handleChange = (value: string) => {
    setQuery(value);
    updateDebouncedQuery(value);
  };

  const showUpgradeHint =
    query.trim().length > 0 &&
    backendStatus?.backend === "native" &&
    Boolean(backendStatus.install_url);

  return (
    <div
      ref={containerRef}
      className="glass-effect flex h-full w-full flex-col text-foreground"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      role="region"
      aria-label="File search"
    >
      {/* Header - Refined minimal design */}
      <header className="file-search-header flex items-center gap-4 px-4 h-14 border-b border-[var(--ui-divider)] flex-shrink-0">
        {/* Back button - subtle but clear */}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onBack}
          className="group flex size-8 items-center justify-center rounded-lg 
            text-muted-foreground/70 hover:text-foreground
            hover:bg-[var(--command-item-hover-bg)] 
            transition-all duration-150 active:scale-95"
          aria-label="Go back"
        >
          <ArrowLeft className="size-[18px] transition-transform group-hover:-translate-x-0.5" />
        </Button>

        {/* Search input - clean and focused */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-0 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/40 pointer-events-none" />
          <SearchInput
            ref={focusInputRef}
            value={query}
            onChange={handleChange}
            className="w-full h-10 pl-7 pr-4 
              bg-transparent border-none
              text-launcher-2xl text-foreground font-medium tracking-[-0.02em]
              outline-none
              placeholder:text-muted-foreground/40 placeholder:font-normal"
            placeholder="Search files by name..."
          />
        </div>

        <div className="flex items-center gap-2">
          {showUpgradeHint ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                if (!backendStatus?.install_url) {
                  return;
                }

                void openExternalUrl(backendStatus.install_url);
              }}
              className="file-search-upgrade-hint h-8 rounded-md border border-[var(--ui-divider)] px-2.5 text-muted-foreground/82 hover:text-foreground"
            >
              <Zap className="size-3.5 text-[var(--ring)]" />
              <span className="tracking-[-0.01em]">Faster with dsearch</span>
              <ArrowUpRight className="size-3.5 text-muted-foreground/55" />
            </Button>
          ) : null}

          <div
            className="flex items-center gap-1.5 rounded-md border border-[var(--ui-divider)] 
            bg-[var(--command-item-hover-bg)] px-2.5 py-1.5"
          >
            <FolderSearch className="size-3.5 text-muted-foreground/60" />
            <span className="text-launcher-xs font-medium tracking-wide text-muted-foreground/80">
              Local
            </span>
          </div>
        </div>
      </header>

      {/* Content Area - Split View */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left: File List */}
        <div className="file-search-list-pane w-[42%] border-r border-[var(--ui-divider)] overflow-hidden flex flex-col">
          <FileList
            results={results}
            selectedIndex={selectedIndex}
            onSelect={setSelectedIndex}
            isLoading={isLoading}
            query={query}
            onOpen={(path) => {
              const entry = results.find((result) => result.entry.path === path)?.entry;
              if (entry) {
                recordUsage(toManagedFileItem(entry));
              }
              openFile(path);
            }}
          />
        </div>

        {/* Right: Details Panel */}
        <DetailPanel className="file-search-detail-pane">
          <FileDetails selectedFile={selectedFile} />
        </DetailPanel>
      </div>

      {/* Footer - Clean action bar */}
      <CommandFooterBar
        leftSlot={
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <div className="size-1.5 rounded-full bg-[var(--solid-success)] animate-pulse" />
              <span className="text-launcher-sm font-medium text-muted-foreground/80">
                {results.length} {results.length === 1 ? "file" : "files"}
              </span>
            </div>
          </div>
        }
        primaryAction={{
          label: "Open",
          shortcut: ["↵"],
          onClick: () => {
            if (!selectedFile) {
              return;
            }

            recordUsage(toManagedFileItem(selectedFile));
            openFile(selectedFile.path);
          },
          disabled: !selectedFile,
        }}
        secondaryActions={[
          {
            label: "Back",
            shortcut: ["Esc"],
            onClick: onBack,
          },
        ]}
      />
    </div>
  );
}
