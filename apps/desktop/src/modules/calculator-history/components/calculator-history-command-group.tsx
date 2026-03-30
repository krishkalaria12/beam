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
  toManagedCalculatorHistoryItem,
} from "@/modules/calculator-history/hooks/use-calculator-history-action-items";
import { usePinnedCalculatorHistory } from "@/modules/calculator-history/hooks/use-pinned-calculator-history";
import { useMountEffect } from "@/hooks/use-mount-effect";
import {
  useManagedItemPreferencesStore,
  useManagedItemRankedGroups,
} from "@/modules/launcher/managed-items";

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
  const selectedCommandValue = useCommandState((state) => state.value);
  const query = normalizeCommandQuery(searchInput);

  const { data, isLoading, isError } = useCalculatorHistory(isOpen);
  const { data: pinnedTimestamps = [] } = usePinnedCalculatorHistory();
  const recordUsage = useManagedItemPreferencesStore((state) => state.recordUsage);
  const history = data ?? [];
  const [copiedEntryTimestamp, setCopiedEntryTimestamp] = useState<number | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const copiedResetTimerRef = useRef<number | null>(null);
  const pinnedTimestampSet = useMemo(() => new Set(pinnedTimestamps), [pinnedTimestamps]);

  useMountEffect(() => clearCalculatorHistoryActionsState);

  const pinnedHistory = history.filter((entry) => pinnedTimestampSet.has(entry.timestamp));
  const unpinnedHistory = history.filter((entry) => !pinnedTimestampSet.has(entry.timestamp));
  const filteredHistory = useManagedItemRankedGroups({
    groups: [pinnedHistory, unpinnedHistory],
    query,
    getManagedItem: toManagedCalculatorHistoryItem,
    getSearchableText: (entry) => `${entry.query} ${entry.result}`,
    compareFallback: (left, right) => right.timestamp - left.timestamp,
  });

  const selectedEntry =
    filteredHistory.find(
      (entry) => `calculator-history-${entry.timestamp}` === selectedCommandValue,
    ) ??
    filteredHistory[0] ??
    null;

  useEffect(() => {
    syncCalculatorHistoryActionsState({
      selectedEntry: isOpen ? selectedEntry : null,
    });
  }, [isOpen, selectedEntry]);

  const handleCopyEntry = (entry: (typeof filteredHistory)[number]) => {
    copyCalculatorEntry(entry.result)
      .then(() => {
        recordUsage(toManagedCalculatorHistoryItem(entry));
        setCopiedEntryTimestamp(entry.timestamp);
        setCopyError(null);
        if (copiedResetTimerRef.current !== null) {
          window.clearTimeout(copiedResetTimerRef.current);
        }
        copiedResetTimerRef.current = window.setTimeout(() => {
          copiedResetTimerRef.current = null;
          setCopiedEntryTimestamp(null);
        }, HISTORY_COPY_FEEDBACK_MS);
      })
      .catch(() => {
        setCopyError("Could not copy to clipboard");
      });
  };

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

  return (
    <CommandGroup>
      {isLoading ? (
        <CommandItem disabled className="calc-history-loading px-4 py-6">
          <div className="flex w-full flex-col items-center justify-center text-center">
            <div className="mb-3 size-10 rounded-xl bg-[var(--launcher-card-bg)] p-2.5">
              <Loader2 className="size-full animate-spin text-[var(--icon-orange-fg)]" />
            </div>
            <p className="text-launcher-sm text-muted-foreground">Loading history...</p>
          </div>
        </CommandItem>
      ) : null}

      {isError ? <CalculatorHistoryError /> : null}

      {!isLoading && !isError && copyError ? <CalculatorHistoryError message={copyError} /> : null}

      {!isLoading && !isError && filteredHistory.length === 0 ? <CalculatorHistoryEmpty /> : null}

      {!isLoading &&
        !isError &&
        filteredHistory.map((entry, index) => (
          <CalculatorHistoryItem
            key={`${entry.timestamp}:${entry.result}`}
            entry={entry}
            index={index}
            isCopied={copiedEntryTimestamp === entry.timestamp}
            onActivate={() => {
              syncCalculatorHistoryActionsState({
                selectedEntry: entry,
              });
            }}
            onSelect={() => {
              handleCopyEntry(entry);
            }}
          />
        ))}
    </CommandGroup>
  );
}
