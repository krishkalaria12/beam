import { useEffect, useMemo, useRef, useState } from "react";

import debounce from "@/lib/debounce";
import { LauncherActionsPanel } from "@/modules/launcher/components/launcher-actions-panel";
import { copyToClipboard } from "../api/copy-to-clipboard";
import { useClipboardHistory } from "../hooks/use-clipboard-history";
import {
  ClipboardContentType,
  type ClipboardHistoryEntry,
  type ClipboardTypeFilter,
} from "../types";
import { ClipboardDetails } from "./clipboard-details";
import { buildClipboardActionItems } from "./clipboard-action-items";
import { ClipboardFooter } from "./clipboard-footer";
import { ClipboardHeader } from "./clipboard-header";
import { ClipboardList } from "./clipboard-list";

interface ClipboardViewProps {
  onBack: () => void;
}

export function ClipboardView({ onBack }: ClipboardViewProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<ClipboardTypeFilter>("all");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copiedEntryIndex, setCopiedEntryIndex] = useState<number | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const actionsPreviousFocusRef = useRef<HTMLElement | null>(null);

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

  const handleActionsOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      const currentActiveElement = document.activeElement;
      actionsPreviousFocusRef.current =
        currentActiveElement instanceof HTMLElement ? currentActiveElement : null;
      setActionsOpen(true);
      return;
    }

    setActionsOpen(false);
    window.requestAnimationFrame(() => {
      const previousFocusElement = actionsPreviousFocusRef.current;
      if (previousFocusElement && previousFocusElement.isConnected) {
        previousFocusElement.focus({ preventScroll: true });
        return;
      }

      inputRef.current?.focus({ preventScroll: true });
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const isActionShortcut =
      e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey;

    if (isActionShortcut) {
      e.preventDefault();
      e.stopPropagation();
      handleActionsOpenChange(!actionsOpen);
      return;
    }

    if (actionsOpen) {
      return;
    }

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

  const clipboardActionItems = buildClipboardActionItems({
    selectedEntry,
    selectedIndex,
    onCopy: (entry, index) => {
      void handleCopy(entry, index);
    },
  });

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
          handleActionsOpenChange(!actionsOpen);
        }}
      />

      <LauncherActionsPanel
        open={actionsOpen}
        onOpenChange={handleActionsOpenChange}
        rootTitle="Clipboard History Actions..."
        rootSearchPlaceholder="Search for actions..."
        rootItems={clipboardActionItems}
        targetCommandId="clipboard.panel.open"
        targetCommandTitle="Clipboard History"
        containerClassName="bottom-14 right-4"
      />
    </div>
  );
}
