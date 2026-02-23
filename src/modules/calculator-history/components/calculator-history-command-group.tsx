import { useCommandState } from "cmdk";
import { useEffect, useState } from "react";

import { OpenModuleCommandRow } from "@/components/command/open-module-command-row";
import { CommandIcon } from "@/components/icons/command-icon";
import { CommandGroup } from "@/components/ui/command";
import { matchesCommandKeywords, normalizeCommandQuery } from "@/modules/launcher/lib/command-query";
import { useCalculatorHistory } from "../hooks/use-calculator-history";
import { HISTORY_COPY_FEEDBACK_MS } from "../constants";

import { CalculatorHistoryEmpty } from "./calculator-history-empty";
import { CalculatorHistoryError } from "./calculator-history-error";
import { CalculatorHistoryItem } from "./calculator-history-item";
import { CalculatorHistoryLoading } from "./calculator-history-loading";

type CalculatorHistoryCommandGroupProps = {
  isOpen: boolean;
  onOpen: () => void;
};

const CALCULATOR_HISTORY_KEYWORDS = [
  "calculator",
  "calculator history",
] as const;

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
  const history = data ?? [];
  const [copiedEntryIndex, setCopiedEntryIndex] = useState<number | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  useEffect(() => {
    if (copiedEntryIndex === null) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setCopiedEntryIndex(null);
    }, HISTORY_COPY_FEEDBACK_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [copiedEntryIndex]);

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

  const filteredHistory = history.filter((entry) => {
    if (!query) {
      return true;
    }
    return (
      entry.query.toLowerCase().includes(query) ||
      entry.result.toLowerCase().includes(query)
    );
  });

  return (
    <CommandGroup>
      {isLoading && <CalculatorHistoryLoading />}

      {isError && <CalculatorHistoryError />}

      {!isLoading && !isError && copyError && (
        <CalculatorHistoryError message={copyError} />
      )}

      {!isLoading && !isError && filteredHistory.length === 0 && (
        <CalculatorHistoryEmpty />
      )}

      {!isLoading &&
        !isError &&
        filteredHistory.map((entry, index) => {
          const isCopied = copiedEntryIndex === index;

          return (
            <CalculatorHistoryItem
              key={`${index}-${entry.timestamp}`}
              entry={entry}
              index={index}
              isCopied={isCopied}
              onSelect={() => {
                copyCalculatorEntry(entry.result)
                  .then(() => {
                    setCopiedEntryIndex(index);
                    setCopyError(null);
                  })
                  .catch(() => {
                    setCopyError("could not copy entry");
                  });
              }}
            />
          );
        })}
    </CommandGroup>
  );
}
