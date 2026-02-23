import { ArrowLeft, Search } from "lucide-react";
import { useEffect, useState, useRef, useMemo } from "react";
import debounce from "@/lib/debounce";

import { CommandFooterBar } from "@/components/command/command-footer-bar";
import { CommandKeyHint } from "@/components/command/command-key-hint";
import { CommandStatusChip } from "@/components/command/command-status-chip";
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

  const { data, isLoading } = useFileSearch(debouncedQuery);
  const { mutate: openFile } = useOpenFile();

  const updateDebouncedQuery = useMemo(
    () => debounce((value: string) => setDebouncedQuery(value), 150),
    []
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedFile) {
        openFile(selectedFile.path);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (query === "") {
        onBack();
      } else {
        setQuery("");
        updateDebouncedQuery("");
        onBack();
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    updateDebouncedQuery(value);
  };

  return (
    <div className="flex h-full w-full flex-col bg-background/90">
      {/* Top Bar */}
      <div className="flex h-[52px] items-center gap-3 border-b border-border/40 px-4">
        <button
          onClick={onBack}
          className="flex items-center justify-center rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
        </button>

        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
          <input
            ref={inputRef}
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className="h-9 w-full rounded-md border border-border/50 bg-background/40 pl-8 text-sm outline-none transition-colors focus:border-primary/50 placeholder:text-muted-foreground/50"
            placeholder="Search files..."
            autoFocus
          />
        </div>

        <CommandStatusChip label="Local System" tone="neutral" />
      </div>

      {/* Content Area - Split View */}
      <div className="flex min-h-0 flex-1 overflow-hidden animate-in fade-in-50 duration-300">
        {/* Left: List */}
        <div className="w-[45%] border-r border-border/40 bg-background/40">
          <FileList 
            results={results} 
            selectedIndex={selectedIndex} 
            onSelect={setSelectedIndex} 
            isLoading={isLoading}
            onOpen={(path) => openFile(path)} // Double click in list handles open
          />
        </div>

        {/* Right: Details */}
        <div className="flex-1 bg-muted/5">
          <FileDetails selectedFile={selectedFile} />
        </div>
      </div>
      
      {/* Footer / Status Bar (Optional, can match main launcher footer) */}
      <CommandFooterBar
        className="bg-background"
        leftSlot={<span>{results.length} results</span>}
        rightSlot={(
          <>
            <CommandKeyHint keyLabel="ENTER" label={selectedFile ? "Open" : "Select"} />
            <CommandKeyHint keyLabel="ESC" label="Back" />
          </>
        )}
      />
    </div>
  );
}
