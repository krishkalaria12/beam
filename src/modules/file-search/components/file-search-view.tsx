import { Search, ArrowLeft, FolderSearch } from "lucide-react";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import debounce from "@/lib/debounce";

import { CommandFooterBar } from "@/components/command/command-footer-bar";
import { useFileSearch } from "../hooks/use-file-search";
import { useOpenFile } from "../hooks/use-open-file";
import { FileList } from "./file-list";
import { FileDetails } from "./file-details";

interface FileSearchViewProps {
  initialQuery: string;
  onBack: () => void;
}

export function FileSearchView({ initialQuery, onBack }: FileSearchViewProps) {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useFileSearch(debouncedQuery);
  const { mutate: openFile } = useOpenFile();

  const updateDebouncedQuery = useMemo(
    () => debounce((value: string) => setDebouncedQuery(value), 150),
    [],
  );

  const results = data?.results || [];
  const selectedFile = results[selectedIndex]?.entry || null;

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results.length, query]);

  // Centralized keyboard handler
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
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
            openFile(selectedFile.path);
          }
          break;
        case "Escape":
          e.preventDefault();
          onBack();
          break;
      }
    },
    [results.length, selectedFile, openFile, onBack],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    updateDebouncedQuery(value);
  };

  return (
    <div
      ref={containerRef}
      className="glass-effect flex h-full w-full flex-col text-foreground"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      {/* Header - Refined minimal design */}
      <header className="file-search-header flex items-center gap-4 px-4 h-14 border-b border-[var(--ui-divider)] flex-shrink-0">
        {/* Back button - subtle but clear */}
        <button
          onClick={onBack}
          className="group flex size-8 items-center justify-center rounded-lg 
            text-muted-foreground/70 hover:text-foreground
            hover:bg-[var(--command-item-hover-bg)] 
            transition-all duration-150 active:scale-95"
          aria-label="Go back"
        >
          <ArrowLeft className="size-[18px] transition-transform group-hover:-translate-x-0.5" />
        </button>

        {/* Search input - clean and focused */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-0 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/40 pointer-events-none" />
          <input
            ref={inputRef}
            value={query}
            onChange={handleChange}
            className="w-full h-10 pl-7 pr-4 
              bg-transparent border-none
              text-[16px] text-foreground font-medium tracking-[-0.02em]
              outline-none
              placeholder:text-muted-foreground/40 placeholder:font-normal"
            placeholder="Search files by name..."
            autoFocus
          />
        </div>

        {/* Scope indicator - minimal pill */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md 
          bg-[var(--command-item-hover-bg)] border border-[var(--ui-divider)]"
        >
          <FolderSearch className="size-3.5 text-muted-foreground/60" />
          <span className="text-[11px] font-medium text-muted-foreground/80 tracking-wide">
            Local
          </span>
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
            onOpen={(path) => openFile(path)}
          />
        </div>

        {/* Right: Details Panel */}
        <div className="file-search-detail-pane flex-1 overflow-hidden bg-[var(--solid-bg-recessed,transparent)]">
          <FileDetails selectedFile={selectedFile} />
        </div>
      </div>

      {/* Footer - Clean action bar */}
      <CommandFooterBar
        leftSlot={
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <div className="size-1.5 rounded-full bg-[var(--solid-success,#48c78e)] animate-pulse" />
              <span className="text-[12px] font-medium text-muted-foreground/80">
                {results.length} {results.length === 1 ? "file" : "files"}
              </span>
            </div>
          </div>
        }
        primaryAction={{
          label: "Open",
          shortcut: ["↵"],
          onClick: () => selectedFile && openFile(selectedFile.path),
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
