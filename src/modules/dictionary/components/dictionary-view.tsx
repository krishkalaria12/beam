import { BookOpen, Search, Copy, Check, Info, AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useRef, useState, useMemo } from "react";
import { useDictionary } from "../hooks/use-dictionary";
import { DictionarySkeleton } from "./dictionary-skeleton";
import { SenseCard } from "./definition-card";
import { CommandFooterBar } from "@/components/command/command-footer-bar";
import { CommandPanelBackButton, CommandPanelHeader } from "@/components/command/command-panel-header";
import { CommandKeyHint } from "@/components/command/command-key-hint";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import debounce from "@/lib/debounce";
import { cn } from "@/lib/utils";

interface DictionaryViewProps {
  initialQuery: string;
  onBack: () => void;
}

export function DictionaryView({ initialQuery, onBack }: DictionaryViewProps) {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [selectedSenseIndex, setSelectedSenseIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce the query update
  const updateDebouncedQuery = useMemo(
    () => debounce((value: string) => setDebouncedQuery(value), 300),
    []
  );

  // Only fetch data with debounced query
  const { data, isLoading, error } = useDictionary(debouncedQuery.trim());

  // Calculate total senses for navigation
  const getAllSenses = () => {
    if (!data) return [];
    const senses: { entryIdx: number; senseIdx: number; entry: any; sense: any }[] = [];
    data.entries.forEach((entry, entryIdx) => {
      entry.senses.forEach((sense, senseIdx) => {
        senses.push({ entryIdx, senseIdx, entry, sense });
      });
    });
    return senses;
  };

  const allSenses = getAllSenses();
  const totalSenses = allSenses.length;

  const contentRef = useRef<HTMLDivElement>(null);

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Reset selection when data changes
  useEffect(() => {
    setSelectedSenseIndex(0);
  }, [data?.word]);

  // Scroll selected sense into view
  useEffect(() => {
    if (selectedSenseIndex >= 0) {
      const selectedElement = contentRef.current?.querySelector(`[data-selected="true"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [selectedSenseIndex]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    updateDebouncedQuery(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!data || totalSenses === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedSenseIndex((prev) => Math.min(prev + 1, totalSenses - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedSenseIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selectedSense = allSenses[selectedSenseIndex];
      if (selectedSense) {
        navigator.clipboard.writeText(selectedSense.sense.definition);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onBack();
    }
  };

  const handleCopyWord = () => {
    if (data?.word) {
      navigator.clipboard.writeText(data.word);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSynonymClick = (synonym: string) => {
    setQuery(synonym);
    setDebouncedQuery(synonym);
  };

  // Only show skeleton for initial load, not when user is typing
  const showSkeleton = isLoading && !data && debouncedQuery === initialQuery;

  if (showSkeleton) {
    return <DictionarySkeleton />;
  }

  return (
    <div className="glass-effect flex h-full w-full flex-col text-foreground">
      <CommandPanelHeader>
        <CommandPanelBackButton onClick={onBack} aria-label="Back" />

        <InputGroup className="h-9 flex-1 rounded-full border-none bg-background/20 px-1">
          <InputGroupAddon align="inline-start" className="pl-3">
            <Search className="size-4 text-muted-foreground/50" />
          </InputGroupAddon>
          <InputGroupInput
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              // Priority for arrow keys to avoid default input behavior or parent suppression
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                handleKeyDown(e);
              } else {
                handleKeyDown(e);
              }
            }}
            placeholder="Search word..."
            className="text-sm"
          />
          {isLoading && (
            <InputGroupAddon align="inline-end" className="pr-3">
              <Loader2 className="size-3.5 animate-spin text-primary" />
            </InputGroupAddon>
          )}
        </InputGroup>
      </CommandPanelHeader>

      {/* Content */}
      <div ref={contentRef} className="list-area custom-scrollbar flex min-h-0 flex-1 overflow-y-auto">
        {!data ? (
          <div className="flex h-full w-full flex-col items-center justify-center p-12 text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="relative mb-6">
              <div className="absolute inset-0 scale-150 blur-2xl opacity-10 bg-primary rounded-full" />
              <BookOpen className="relative size-20 text-muted-foreground/20" />
            </div>
            
            {error ? (
              <>
                <div className="mb-3 flex items-center gap-2 text-destructive">
                  <AlertCircle className="size-5" />
                  <h3 className="text-lg font-semibold">Error loading definition</h3>
                </div>
                <p className="max-w-xs text-sm text-muted-foreground">
                  {error.message}
                </p>
              </>
            ) : isLoading ? (
              <>
                <h3 className="mb-2 text-lg font-semibold text-foreground">Searching...</h3>
                <p className="text-sm text-muted-foreground">Finding the perfect definition for you.</p>
              </>
            ) : (
              <>
                <h3 className="mb-2 text-lg font-semibold text-foreground">
                  {query.trim() ? "Word not found" : "Dictionary"}
                </h3>
                <p className="max-w-xs text-sm text-muted-foreground">
                  {query.trim()
                    ? `We couldn't find "${query.trim()}" in our database.`
                    : "Type a word above to explore its meanings, synonyms, and more."}
                </p>
                {query.trim() && (
                  <Button 
                    variant="link" 
                    className="mt-4 text-primary"
                    onClick={() => {
                      setQuery("");
                      setDebouncedQuery("");
                      inputRef.current?.focus();
                    }}
                  >
                    Clear search
                  </Button>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="w-full p-6 space-y-8 animate-in slide-in-from-bottom-2 duration-500">
            {/* Word Header */}
            <div className="flex items-end justify-between pb-2">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-4xl font-extrabold tracking-tight capitalize text-foreground">
                    {data.word}
                  </h2>
                  <div className="flex h-6 items-center rounded-full bg-primary/10 px-2.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                    Word
                  </div>
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  {data.entries.length} meaning{data.entries.length !== 1 ? "s" : ""} • {totalSenses} sense
                  {totalSenses !== 1 ? "s" : ""} available
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyWord}
                className={cn(
                  "gap-2 rounded-full h-9 px-4 transition-all duration-300",
                  copied && "bg-green-500/10 border-green-500/50 text-green-600 dark:text-green-400"
                )}
              >
                {copied ? (
                  <>
                    <Check className="size-3.5" />
                    <span className="text-xs font-bold uppercase tracking-wider">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" />
                    <span className="text-xs font-bold uppercase tracking-wider">Copy word</span>
                  </>
                )}
              </Button>
            </div>

            {/* Entries with Senses */}
            <div className="space-y-10">
              {data.entries.map((entry, entryIdx) => (
                <div key={entryIdx} className="space-y-4">
                  {/* Part of Speech Header */}
                  <div className="flex items-center gap-4">
                    <div className="h-px flex-1 bg-border/40" />
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-primary/70">
                      {entry.part_of_speech}
                    </span>
                    <div className="h-px flex-1 bg-border/40" />
                  </div>

                  {/* Senses */}
                  <div className="grid gap-4">
                    {entry.senses.map((sense, senseIdx) => {
                      // Calculate global sense index
                      let globalIdx = 0;
                      for (let i = 0; i < entryIdx; i++) {
                        globalIdx += data.entries[i].senses.length;
                      }
                      globalIdx += senseIdx;

                      return (
                        <SenseCard
                          key={senseIdx}
                          sense={sense}
                          senseNumber={senseIdx + 1}
                          entryNumber={entryIdx + 1}
                          isSelected={globalIdx === selectedSenseIndex}
                          onSynonymClick={handleSynonymClick}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Bottom spacer */}
            <div className="h-4" />
          </div>
        )}
      </div>

      {/* Footer */}
      <CommandFooterBar
        className="h-10 px-4 text-[10px] font-bold tracking-[0.1em]"
        leftSlot={(
          <>
            <Info className="size-3" />
            <span>
              {data
                ? `${totalSenses} sense${totalSenses !== 1 ? "s" : ""} found`
                : "Dictionary Search"}
            </span>
          </>
        )}
        rightSlot={(
          <>
            <CommandKeyHint keyLabel="↑↓" label="Select" />
            <CommandKeyHint keyLabel="ENTER" label="Copy Sense" />
            <CommandKeyHint keyLabel="ESC" label="Back" />
          </>
        )}
      />
    </div>
  );
}
