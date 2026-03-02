import { ArrowLeft, BookOpen, Search, Copy, Check, AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useRef, useState, useMemo } from "react";
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
    <div className="dictionary-view-enter flex h-full w-full flex-col text-white">
      {/* Header */}
      <header className="dictionary-header-enter flex h-14 shrink-0 items-center gap-3 border-b border-white/[0.06] px-4">
        <button
          type="button"
          onClick={onBack}
          className="flex size-9 items-center justify-center rounded-lg bg-white/[0.03] text-white/40 transition-all duration-200 hover:bg-white/[0.06] hover:text-white/70"
          aria-label="Back"
        >
          <ArrowLeft className="size-4" />
        </button>

        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/30" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                handleKeyDown(e);
              } else {
                handleKeyDown(e);
              }
            }}
            placeholder="Search word..."
            className={cn(
              "h-10 w-full rounded-xl bg-white/[0.04] pl-10 pr-3 text-[14px] text-white/90 placeholder:text-white/30",
              "ring-1 ring-white/[0.06] transition-all duration-200",
              "focus:outline-none focus:ring-[var(--solid-accent,#4ea2ff)]",
            )}
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="size-4 animate-spin text-[var(--solid-accent,#4ea2ff)]" />
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <div
        ref={contentRef}
        className="dictionary-content-enter list-area custom-scrollbar flex min-h-0 flex-1 overflow-y-auto"
      >
        {!data ? (
          <div className="flex h-full w-full flex-col items-center justify-center p-12 text-center">
            <div className="mb-5 size-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 p-4">
              <BookOpen className="size-full text-indigo-400/60" />
            </div>

            {error ? (
              <>
                <div className="mb-3 flex items-center gap-2 text-red-400">
                  <AlertCircle className="size-5" />
                  <h3 className="text-[14px] font-semibold">Error loading definition</h3>
                </div>
                <p className="max-w-xs text-[12px] text-white/40">{error.message}</p>
              </>
            ) : isLoading ? (
              <>
                <h3 className="mb-2 text-[14px] font-semibold text-white/80">Searching...</h3>
                <p className="text-[12px] text-white/40">Finding the perfect definition for you.</p>
              </>
            ) : (
              <>
                <h3 className="mb-2 text-[14px] font-semibold text-white/80">
                  {query.trim() ? "Word not found" : "Dictionary"}
                </h3>
                <p className="max-w-xs text-[12px] text-white/40">
                  {query.trim()
                    ? `We couldn't find "${query.trim()}" in our database.`
                    : "Type a word above to explore its meanings, synonyms, and more."}
                </p>
                {query.trim() && (
                  <button
                    type="button"
                    className="mt-4 text-[12px] font-medium text-[var(--solid-accent,#4ea2ff)] transition-colors hover:text-[var(--solid-accent,#4ea2ff)]/80"
                    onClick={() => {
                      setQuery("");
                      setDebouncedQuery("");
                      inputRef.current?.focus();
                    }}
                  >
                    Clear search
                  </button>
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
                  <h2 className="text-[28px] font-bold tracking-[-0.02em] capitalize text-white/95">
                    {data.word}
                  </h2>
                  <span className="rounded-full bg-[var(--solid-accent,#4ea2ff)]/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--solid-accent,#4ea2ff)]">
                    Word
                  </span>
                </div>
                <p className="text-[12px] text-white/40">
                  {data.entries.length} meaning{data.entries.length !== 1 ? "s" : ""} •{" "}
                  {totalSenses} sense
                  {totalSenses !== 1 ? "s" : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyWord}
                className={cn(
                  "inline-flex h-8 items-center gap-2 rounded-lg px-3 text-[12px] font-medium transition-all duration-200",
                  copied
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "border border-white/[0.08] bg-white/[0.03] text-white/60 hover:bg-white/[0.06] hover:text-white/80",
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
              </button>
            </div>

            {/* Entries with Senses */}
            <div className="space-y-8">
              {data.entries.map((entry, entryIdx) => (
                <div key={entryIdx} className="space-y-4">
                  {/* Part of Speech Header */}
                  <div className="flex items-center gap-4">
                    <div className="h-px flex-1 bg-white/[0.06]" />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--solid-accent,#4ea2ff)]/70">
                      {entry.part_of_speech}
                    </span>
                    <div className="h-px flex-1 bg-white/[0.06]" />
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
      <footer className="dictionary-footer-enter flex h-12 shrink-0 items-center justify-between border-t border-white/[0.06] px-4">
        <div className="flex items-center gap-2 text-[12px] text-white/40">
          <BookOpen className="size-3.5" />
          <span>
            {data
              ? `${totalSenses} sense${totalSenses !== 1 ? "s" : ""} found`
              : "Dictionary Search"}
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-white/30">
          <span>
            <kbd className="rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-[10px]">↑↓</kbd>{" "}
            Select
          </span>
          <span>
            <kbd className="rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-[10px]">Enter</kbd>{" "}
            Copy
          </span>
          <span>
            <kbd className="rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-[10px]">Esc</kbd>{" "}
            Back
          </span>
        </div>
      </footer>
    </div>
  );
}
