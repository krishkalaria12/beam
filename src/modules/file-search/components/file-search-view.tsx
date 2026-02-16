import { ArrowLeft, Search } from "lucide-react";
import { useEffect, useState, useRef, useMemo } from "react";
import { useCommandState } from "cmdk";
import debounce from "@/lib/debounce";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useFileSearch } from "../hooks/use-file-search";
import { useOpenFile } from "../hooks/use-open-file";
import { FileList } from "./file-list";
import { FileDetails } from "./file-details";
import type { FileEntry } from "../types";

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
    console.log("[DEBUG] Key pressed:", e.key);
    console.log("[DEBUG] selectedFile:", selectedFile);
    console.log("[DEBUG] selectedIndex:", selectedIndex);
    console.log("[DEBUG] results length:", results.length);
    
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      console.log("[DEBUG] Enter pressed, selectedFile:", selectedFile);
      if (selectedFile) {
        console.log("[DEBUG] Opening file:", selectedFile.path);
        openFile(selectedFile.path);
      } else {
        console.log("[DEBUG] No selectedFile to open");
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
    <div className="flex h-full w-full flex-col bg-background">
      {/* Top Bar */}
      <div className="flex h-12 items-center gap-3 border-b border-border/40 px-3">
        <button
          onClick={onBack}
          className="flex items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        >
          <ArrowLeft className="size-5" />
        </button>

        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
          <input
            ref={inputRef}
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className="h-9 w-full rounded-md bg-transparent pl-8 text-sm outline-none placeholder:text-muted-foreground/50"
            placeholder="Search files..."
            autoFocus
          />
        </div>

        {/* Optional Right Side Controls (e.g. "This Mac" dropdown from image - placeholder for now) */}
        <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground/50">Local System</span>
        </div>
      </div>

      {/* Content Area - Split View */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left: List */}
        <div className="w-[45%] border-r border-border/40 bg-background/50">
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
       <div className="flex h-8 items-center justify-between border-t border-border/40 px-4 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60 bg-background">
          <div className="flex items-center gap-2">
            <span>{results.length} results</span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <kbd className="rounded border border-border/60 bg-muted/30 px-1 py-0.5 font-mono text-[9px] text-foreground/70">ENTER</kbd>
              <span>Open</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="rounded border border-border/60 bg-muted/30 px-1 py-0.5 font-mono text-[9px] text-foreground/70">ESC</kbd>
              <span>Back</span>
            </div>
          </div>
        </div>
    </div>
  );
}
