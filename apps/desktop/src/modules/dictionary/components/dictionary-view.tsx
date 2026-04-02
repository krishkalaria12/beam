import { AlertCircle, ArrowLeft, BookOpen, Check, Copy, Loader2, Search } from "lucide-react";
import { type RefObject, useCallback, useMemo, useRef, useState } from "react";
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

function DictionaryEmptyState({
  error,
  isLoading,
  query,
  inputRef,
  onClear,
}: {
  error: Error | null;
  isLoading: boolean;
  query: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onClear: () => void;
}) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center p-12 text-center">
      <IconChip variant="primary" size="lg" className="mb-5 size-16 rounded-2xl p-4">
        <BookOpen className="size-full" />
      </IconChip>

      {error ? (
        <>
          <div className="mb-3 flex items-center gap-2 text-destructive">
            <AlertCircle className="size-5" />
            <h3 className="text-launcher-lg font-semibold">Error loading definition</h3>
          </div>
          <p className="max-w-xs text-launcher-sm text-muted-foreground">{error.message}</p>
        </>
      ) : isLoading ? (
        <>
          <h3 className="mb-2 text-launcher-lg font-semibold text-foreground">Searching...</h3>
          <p className="text-launcher-sm text-muted-foreground">
            Finding the perfect definition for you.
          </p>
        </>
      ) : (
        <>
          <h3 className="mb-2 text-launcher-lg font-semibold text-foreground">
            {query.trim() ? "Word not found" : "Dictionary"}
          </h3>
          <p className="max-w-xs text-launcher-sm text-muted-foreground">
            {query.trim()
              ? `We couldn't find "${query.trim()}" in our database.`
              : "Type a word above to explore its meanings, synonyms, and more."}
          </p>
          {query.trim() ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="mt-4 text-launcher-sm font-medium text-[var(--ring)] hover:text-[var(--ring)]"
              onClick={() => {
                onClear();
                inputRef.current?.focus();
              }}
            >
              Clear search
            </Button>
          ) : null}
        </>
      )}
    </div>
  );
}

function DictionaryResults({
  data,
  totalSenses,
  copied,
  selectedSenseIndex,
  setSelectedSenseRef,
  setSelectedSenseIndex,
  onCopyWord,
  onSynonymClick,
}: {
  data: NonNullable<ReturnType<typeof useDictionary>["data"]>;
  totalSenses: number;
  copied: boolean;
  selectedSenseIndex: number;
  setSelectedSenseRef: (node: HTMLDivElement | null) => void;
  setSelectedSenseIndex: (value: number) => void;
  onCopyWord: () => void;
  onSynonymClick: (synonym: string) => void;
}) {
  return (
    <div className="w-full space-y-6 p-5">
      <div className="flex items-end justify-between pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-[length:calc(var(--beam-font-size-base)*2.1538)] font-bold tracking-[-0.02em] capitalize text-foreground">
              {data.word}
            </h2>
            <span className="rounded-full bg-[var(--ring)]/15 px-2.5 py-0.5 text-launcher-2xs font-semibold uppercase tracking-[0.06em] text-[var(--ring)]">
              Word
            </span>
          </div>
          <p className="text-launcher-sm text-muted-foreground">
            {data.entries.length} meaning{data.entries.length !== 1 ? "s" : ""} • {totalSenses}{" "}
            sense
            {totalSenses !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onCopyWord}
          className={cn(
            "h-8 gap-2 rounded-lg px-3 text-launcher-sm font-medium",
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

      <div className="space-y-8">
        {data.entries.map((entry, entryIdx) => (
          <div key={entryIdx} className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-[var(--ui-divider)]" />
              <span className="text-launcher-xs font-semibold uppercase tracking-[0.08em] text-[var(--ring)]">
                {entry.part_of_speech}
              </span>
              <div className="h-px flex-1 bg-[var(--ui-divider)]" />
            </div>

            <div className="grid gap-3">
              {entry.senses.map((sense, senseIdx) => {
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
                    containerRef={
                      globalIdx === selectedSenseIndex ? setSelectedSenseRef : undefined
                    }
                    onSelect={() => setSelectedSenseIndex(globalIdx)}
                    onSynonymClick={onSynonymClick}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="h-4" />
    </div>
  );
}

export function DictionaryView({ initialQuery, onBack }: DictionaryViewProps) {
  const [query, setQuery] = useState(() => initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(() => initialQuery);
  const [senseSelectionState, setSenseSelectionState] = useState({ wordKey: "", index: 0 });
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
  const currentWordKey = data?.word ?? "";
  if (senseSelectionState.wordKey !== currentWordKey) {
    setSenseSelectionState({ wordKey: currentWordKey, index: 0 });
  }
  const selectedSenseIndex =
    totalSenses > 0 ? Math.min(senseSelectionState.index, totalSenses - 1) : 0;

  const contentRef = useRef<HTMLDivElement>(null);
  const copiedResetTimerRef = useRef<number | null>(null);
  const setSelectedSenseIndex = useCallback(
    (value: number | ((previous: number) => number)) => {
      setSenseSelectionState((previous) => ({
        wordKey: currentWordKey,
        index:
          typeof value === "function"
            ? value(previous.wordKey === currentWordKey ? previous.index : 0)
            : value,
      }));
    },
    [currentWordKey],
  );
  const setSelectedSenseRef = useCallback((node: HTMLDivElement | null) => {
    node?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);
  const focusInputRef = useCallback((node: HTMLInputElement | null) => {
    inputRef.current = node;
    node?.focus();
  }, []);

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
        if (copiedResetTimerRef.current !== null) {
          window.clearTimeout(copiedResetTimerRef.current);
        }
        copiedResetTimerRef.current = window.setTimeout(() => {
          copiedResetTimerRef.current = null;
          setCopied(false);
        }, 2000);
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
      if (copiedResetTimerRef.current !== null) {
        window.clearTimeout(copiedResetTimerRef.current);
      }
      copiedResetTimerRef.current = window.setTimeout(() => {
        copiedResetTimerRef.current = null;
        setCopied(false);
      }, 2000);
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
          ref={focusInputRef}
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
          <DictionaryEmptyState
            error={error ?? null}
            isLoading={isLoading}
            query={query}
            inputRef={inputRef}
            onClear={() => {
              setQuery("");
              setDebouncedQuery("");
            }}
          />
        ) : (
          <DictionaryResults
            data={data}
            totalSenses={totalSenses}
            copied={copied}
            selectedSenseIndex={selectedSenseIndex}
            setSelectedSenseRef={setSelectedSenseRef}
            setSelectedSenseIndex={setSelectedSenseIndex}
            onCopyWord={handleCopyWord}
            onSynonymClick={handleSynonymClick}
          />
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
