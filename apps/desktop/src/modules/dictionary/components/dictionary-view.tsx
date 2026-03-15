import { AlertCircle, ArrowLeft, BookOpen, Check, Copy, Loader2, Search } from "lucide-react";
import { useEffect, useRef, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { IconChip, ModuleFooter, SearchInput } from "@/components/module";
import { useDictionary } from "../hooks/use-dictionary";
import { DictionarySkeleton } from "./dictionary-skeleton";
import { SenseCard } from "./definition-card";
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
    [],
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

  const handleInputChange = (value: string) => {
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
    <div className="dictionary-view-enter flex h-full w-full flex-col text-foreground">
      {/* Header */}
      <header className="dictionary-header-enter flex h-14 shrink-0 items-center gap-3 border-b border-[var(--launcher-card-border)] px-4">
        <Button
          type="button"
          onClick={onBack}
          size="icon-sm"
          variant="ghost"
          className="size-9 rounded-lg bg-[var(--launcher-card-hover-bg)] text-muted-foreground hover:bg-[var(--launcher-card-hover-bg)] hover:text-foreground"
          aria-label="Back"
        >
          <ArrowLeft className="size-4" />
        </Button>

        <SearchInput
          ref={inputRef}
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Search word..."
          leftIcon={<Search />}
          rightSlot={
            isLoading ? <Loader2 className="size-4 animate-spin text-[var(--ring)]" /> : null
          }
          className="tracking-[-0.01em]"
        />
      </header>

      {/* Content */}
      <div
        ref={contentRef}
        className="dictionary-content-enter list-area custom-scrollbar flex min-h-0 flex-1 overflow-y-auto"
      >
        {!data ? (
          <div className="flex h-full w-full flex-col items-center justify-center p-12 text-center">
            <IconChip variant="primary" size="lg" className="mb-5 size-16 rounded-2xl p-4">
              <BookOpen className="size-full" />
            </IconChip>

            {error ? (
              <>
                <div className="mb-3 flex items-center gap-2 text-destructive">
                  <AlertCircle className="size-5" />
                  <h3 className="text-[14px] font-semibold">Error loading definition</h3>
                </div>
                <p className="max-w-xs text-[12px] text-muted-foreground">{error.message}</p>
              </>
            ) : isLoading ? (
              <>
                <h3 className="mb-2 text-[14px] font-semibold text-foreground">Searching...</h3>
                <p className="text-[12px] text-muted-foreground">
                  Finding the perfect definition for you.
                </p>
              </>
            ) : (
              <>
                <h3 className="mb-2 text-[14px] font-semibold text-foreground">
                  {query.trim() ? "Word not found" : "Dictionary"}
                </h3>
                <p className="max-w-xs text-[12px] text-muted-foreground">
                  {query.trim()
                    ? `We couldn't find "${query.trim()}" in our database.`
                    : "Type a word above to explore its meanings, synonyms, and more."}
                </p>
                {query.trim() && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="mt-4 text-[12px] font-medium text-[var(--ring)] hover:text-[var(--ring)]"
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
          <div className="w-full space-y-6 p-5">
            {/* Word Header */}
            <div className="flex items-end justify-between pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-[28px] font-bold tracking-[-0.02em] capitalize text-foreground">
                    {data.word}
                  </h2>
                  <span className="rounded-full bg-[var(--ring)]/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ring)]">
                    Word
                  </span>
                </div>
                <p className="text-[12px] text-muted-foreground">
                  {data.entries.length} meaning{data.entries.length !== 1 ? "s" : ""} •{" "}
                  {totalSenses} sense
                  {totalSenses !== 1 ? "s" : ""}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleCopyWord}
                className={cn(
                  "h-8 gap-2 rounded-lg px-3 text-[12px] font-medium",
                  copied
                    ? "bg-[var(--icon-green-bg)] text-[var(--icon-green-fg)] border-transparent"
                    : "border-[var(--launcher-card-border)] bg-[var(--launcher-card-hover-bg)] text-muted-foreground hover:text-foreground hover:bg-[var(--launcher-card-hover-bg)]",
                )}
              >
                {copied ? (
                  <>
                    <Check className="size-3.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" />
                    Copy word
                  </>
                )}
              </Button>
            </div>

            {/* Entries with Senses */}
            <div className="space-y-8">
              {data.entries.map((entry, entryIdx) => (
                <div key={entryIdx} className="space-y-4">
                  {/* Part of Speech Header */}
                  <div className="flex items-center gap-4">
                    <div className="h-px flex-1 bg-[var(--ui-divider)]" />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ring)]">
                      {entry.part_of_speech}
                    </span>
                    <div className="h-px flex-1 bg-[var(--ui-divider)]" />
                  </div>

                  {/* Senses */}
                  <div className="grid gap-3">
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
                          onSelect={() => setSelectedSenseIndex(globalIdx)}
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

      <ModuleFooter
        className="dictionary-footer-enter"
        leftSlot={
          <>
            <BookOpen className="size-3.5" />
            <span>
              {data
                ? `${totalSenses} sense${totalSenses !== 1 ? "s" : ""} found`
                : "Dictionary Search"}
            </span>
          </>
        }
        shortcuts={[
          { keys: ["↑↓"], label: "Select" },
          { keys: ["Enter"], label: "Copy" },
          { keys: ["Esc"], label: "Back" },
        ]}
      />
    </div>
  );
}
