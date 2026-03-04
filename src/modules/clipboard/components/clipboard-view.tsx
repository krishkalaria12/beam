import { useEffect, useMemo, useRef, useState } from "react";

import debounce from "@/lib/debounce";
import { copyToClipboard } from "../api/copy-to-clipboard";
import { useClipboardHistory } from "../hooks/use-clipboard-history";
import {
  ClipboardContentType,
  type ClipboardHistoryEntry,
  type ClipboardTypeFilter,
} from "../types";
import { ClipboardFooter } from "./clipboard-footer";
import { ClipboardHeader } from "./clipboard-header";
import { ClipboardDetails } from "./clipboard-details";
import { ClipboardList } from "./clipboard-list";

interface ClipboardViewProps {
  onBack: () => void;
  onToggleActions: () => void;
}

export function ClipboardView({ onBack, onToggleActions }: ClipboardViewProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<ClipboardTypeFilter>("all");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copiedEntryIndex, setCopiedEntryIndex] = useState<number | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: history = [], isLoading } = useClipboardHistory(true);

  const updateDebouncedQuery = useMemo(
    () => debounce((value: string) => setDebouncedQuery(value), 150),
    [],
  );

  const filteredHistory = useMemo(() => {
    const lowerQuery = debouncedQuery.toLowerCase();
    const filteredByType =
      typeFilter === "all" ? history : history.filter((entry) => entry.content_type === typeFilter);

    if (!lowerQuery) {
      return filteredByType;
    }

    return filteredByType.filter((entry) => {
      if (entry.content_type === ClipboardContentType.Image) {
        return "image screenshot clipboard".includes(lowerQuery);
      }

      const searchableValue =
        entry.value.length > 4096
          ? entry.value.slice(0, 4096).toLowerCase()
          : entry.value.toLowerCase();
      return searchableValue.includes(lowerQuery);
    });
  }, [history, debouncedQuery, typeFilter]);

  const selectedEntry = filteredHistory[selectedIndex] || null;
  const isInitialLoading = isLoading && history.length === 0;

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredHistory.length, query, typeFilter]);

  // Handle copy feedback timeout
  useEffect(() => {
    if (copiedEntryIndex === null && !copyError) return;

    const timeout = setTimeout(() => {
      setCopiedEntryIndex(null);
      setCopyError(null);
    }, 1400);

    return () => clearTimeout(timeout);
  }, [copiedEntryIndex, copyError]);

  const handleCopy = async (entry: ClipboardHistoryEntry, index: number) => {
    try {
      const isImage = entry.content_type === ClipboardContentType.Image;
      await copyToClipboard(entry.value, isImage);
      setCopiedEntryIndex(index);
      setCopyError(null);
    } catch (error) {
      console.error("Failed to copy:", error);
      setCopiedEntryIndex(null);
      setCopyError("Could not copy entry");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      setSelectedIndex((prev) => {
        if (filteredHistory.length === 0) return 0;
        return Math.min(prev + 1, filteredHistory.length - 1);
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (selectedEntry) {
        void handleCopy(selectedEntry, selectedIndex);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      if (query) {
        setQuery("");
        updateDebouncedQuery("");
      } else {
        onBack();
      }
    }
  };

  const handleChange = (value: string) => {
    setQuery(value);
    updateDebouncedQuery(value);
  };

  return (
    <div
      className="clipboard-view relative flex h-full w-full flex-col outline-none"
      onClick={(event) => {
        const target = event.target;
        if (
          target instanceof HTMLElement &&
          target.closest('[data-slot="launcher-actions-panel"]')
        ) {
          return;
        }
        inputRef.current?.focus();
      }}
      onKeyDown={handleKeyDown}
    >
      <ClipboardHeader
        query={query}
        onQueryChange={handleChange}
        onKeyDown={handleKeyDown}
        onBack={onBack}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        inputRef={inputRef}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <ClipboardList
          entries={filteredHistory}
          selectedIndex={selectedIndex}
          onSelect={setSelectedIndex}
          isLoading={isInitialLoading}
        />
        <ClipboardDetails
          entry={selectedEntry}
          isCopied={copiedEntryIndex === selectedIndex && !copyError}
          copyError={copyError}
          isLoading={isInitialLoading}
          onCopy={() => {
            if (selectedEntry) {
              void handleCopy(selectedEntry, selectedIndex);
            }
          }}
        />
      </div>

      <ClipboardFooter
        copiedEntryIndex={copiedEntryIndex}
        selectedIndex={selectedIndex}
        copyError={copyError}
        canCopy={Boolean(selectedEntry)}
        onBack={onBack}
        onCopySelected={() => {
          if (selectedEntry) {
            void handleCopy(selectedEntry, selectedIndex);
          }
        }}
        onToggleActions={() => {
          inputRef.current?.focus({ preventScroll: true });
          onToggleActions();
        }}
      />
    </div>
  );
}
