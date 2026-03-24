import { useCommandState } from "cmdk";
import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { OpenModuleCommandRow } from "@/components/command/open-module-command-row";
import { CommandIcon } from "@/components/icons/command-icon";
import { CommandGroup, CommandItem } from "@/components/ui/command";
import {
  matchesCommandKeywords,
  normalizeCommandQuery,
} from "@/modules/launcher/lib/command-query";
import { useCalculatorHistory } from "../hooks/use-calculator-history";
import { HISTORY_COPY_FEEDBACK_MS } from "../constants";
import {
  clearCalculatorHistoryActionsState,
  syncCalculatorHistoryActionsState,
} from "@/modules/calculator-history/hooks/use-calculator-history-action-items";
import { usePinnedCalculatorHistory } from "@/modules/calculator-history/hooks/use-pinned-calculator-history";
import { useMountEffect } from "@/hooks/use-mount-effect";

import { CalculatorHistoryEmpty } from "./calculator-history-empty";
import { CalculatorHistoryError } from "./calculator-history-error";
import { CalculatorHistoryItem } from "./calculator-history-item";

type CalculatorHistoryCommandGroupProps = {
  isOpen: boolean;
  onOpen: () => void;
};

const CALCULATOR_HISTORY_KEYWORDS = ["calculator", "calculator history"] as const;

async function copyCalculatorEntry(value: string) {
  if (!navigator?.clipboard?.writeText) {
    throw new Error("clipboard write is unavailable");
  }

  await navigator.clipboard.writeText(value);
}

export default function CalculatorHistoryCommandGroup({
  isOpen,
  onOpen,
}: CalculatorHistoryCommandGroupProps) {
  const searchInput = useCommandState((state) => state.search);
  const query = normalizeCommandQuery(searchInput);

  const { data, isLoading, isError } = useCalculatorHistory(isOpen);
  const { data: pinnedTimestamps = [] } = usePinnedCalculatorHistory();
  const history = data ?? [];
  const [copiedEntryIndex, setCopiedEntryIndex] = useState<number | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const copiedResetTimerRef = useRef<number | null>(null);
  const pinnedTimestampSet = useMemo(() => new Set(pinnedTimestamps), [pinnedTimestamps]);

  useMountEffect(() => clearCalculatorHistoryActionsState);

  if (!isOpen) {
    const shouldShowOpenHistory = matchesCommandKeywords(query, CALCULATOR_HISTORY_KEYWORDS);

    if (!shouldShowOpenHistory) {
      return null;
    }

    return (
      <CommandGroup>
        <OpenModuleCommandRow
          value="open calculator history"
          onSelect={onOpen}
          icon={<CommandIcon icon="calculator" />}
          title="calculator history"
        />
      </CommandGroup>
    );
  }

  const filteredHistory = history
    .filter((entry) => {
      if (!query) {
        return true;
      }
      return (
        entry.query.toLowerCase().includes(query) || entry.result.toLowerCase().includes(query)
      );
    })
    .toSorted((left, right) => {
      const leftPinned = pinnedTimestampSet.has(left.timestamp);
      const rightPinned = pinnedTimestampSet.has(right.timestamp);
      if (leftPinned !== rightPinned) {
        return leftPinned ? -1 : 1;
      }

      return right.timestamp - left.timestamp;
    });

  const selectedEntry = filteredHistory[0] ?? null;
  useEffect(() => {
    syncCalculatorHistoryActionsState({
      selectedEntry,
    });
  }, [selectedEntry]);

  return (
    <CommandGroup>
      {/* Loading state */}
      {isLoading && (
        <CommandItem disabled className="calc-history-loading px-4 py-6">
          <div className="flex flex-col items-center justify-center w-full text-center">
            <div className="size-10 rounded-xl bg-[var(--launcher-card-bg)] p-2.5 mb-3">
              <Loader2 className="size-full text-[var(--icon-orange-fg)] animate-spin" />
            </div>
            <p className="text-launcher-sm text-muted-foreground">Loading history...</p>
          </div>
        </CommandItem>
      )}

      {/* Error state */}
      {isError && <CalculatorHistoryError />}

      {/* Copy error */}
      {!isLoading && !isError && copyError && <CalculatorHistoryError message={copyError} />}

      {/* Empty state */}
      {!isLoading && !isError && filteredHistory.length === 0 && <CalculatorHistoryEmpty />}

      {/* History items */}
      {!isLoading &&
        !isError &&
        filteredHistory.map((entry, index) => {
          const isCopied = copiedEntryIndex === index;

          return (
            <CalculatorHistoryItem
              key={`${entry.timestamp}:${entry.result}`}
              entry={entry}
              index={index}
              isCopied={isCopied}
              onActivate={() => {
                syncCalculatorHistoryActionsState({
                  selectedEntry: entry,
                });
              }}
              onSelect={() => {
                copyCalculatorEntry(entry.result)
                  .then(() => {
                    setCopiedEntryIndex(index);
                    setCopyError(null);
                    if (copiedResetTimerRef.current !== null) {
                      window.clearTimeout(copiedResetTimerRef.current);
                    }
                    copiedResetTimerRef.current = window.setTimeout(() => {
                      copiedResetTimerRef.current = null;
                      setCopiedEntryIndex(null);
                    }, HISTORY_COPY_FEEDBACK_MS);
                  })
                  .catch(() => {
                    setCopyError("Could not copy to clipboard");
                  });
              }}
            />
          );
        })}
    </CommandGroup>
  );
}
