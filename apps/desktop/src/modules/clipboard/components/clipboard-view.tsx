import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";

import debounce from "@/lib/debounce";
import {
  useManagedItemPreferencesStore,
  useManagedItemRankedGroups,
} from "@/modules/launcher/managed-items";
import {
  clearClipboardActionsState,
  syncClipboardActionsState,
  toManagedClipboardItem,
} from "@/modules/clipboard/hooks/use-clipboard-action-items";
import { copyToClipboard } from "../api/copy-to-clipboard";
import { buildClipboardPinnedEntryId } from "../api/history-actions";
import { useClipboardHistory } from "../hooks/use-clipboard-history";
import { usePinnedClipboardHistory } from "../hooks/use-pinned-clipboard-history";
import {
  ClipboardContentType,
  type ClipboardHistoryEntry,
  type ClipboardTypeFilter,
} from "../types";
import { ClipboardFooter } from "./clipboard-footer";
import { ClipboardHeader } from "./clipboard-header";
import { ClipboardDetails } from "./clipboard-details";
import { ClipboardList } from "./clipboard-list";
import { useMountEffect } from "@/hooks/use-mount-effect";

interface ClipboardViewProps {
  onBack: () => void;
  onToggleActions: () => void;
}

interface ClipboardViewState {
  query: string;
  debouncedQuery: string;
  typeFilter: ClipboardTypeFilter;
  selectionState: { key: string; entryId: string };
  copiedEntryId: string | null;
  copyError: string | null;
}

type ClipboardViewAction =
  | { type: "set-query"; value: string }
  | { type: "set-debounced-query"; value: string }
  | { type: "set-type-filter"; value: ClipboardTypeFilter }
  | { type: "set-selection"; value: { key: string; entryId: string } }
  | { type: "set-copied-state"; copiedEntryId: string | null; copyError: string | null };

const INITIAL_CLIPBOARD_VIEW_STATE: ClipboardViewState = {
  query: "",
  debouncedQuery: "",
  typeFilter: "all",
  selectionState: { key: "", entryId: "" },
  copiedEntryId: null,
  copyError: null,
};

function clipboardViewReducer(
  state: ClipboardViewState,
  action: ClipboardViewAction,
): ClipboardViewState {
  switch (action.type) {
    case "set-query":
      return { ...state, query: action.value };
    case "set-debounced-query":
      return { ...state, debouncedQuery: action.value };
    case "set-type-filter":
      return { ...state, typeFilter: action.value };
    case "set-selection":
      return { ...state, selectionState: action.value };
    case "set-copied-state":
      return {
        ...state,
        copiedEntryId: action.copiedEntryId,
        copyError: action.copyError,
      };
  }
}

export function ClipboardView({ onBack, onToggleActions }: ClipboardViewProps) {
  const [state, dispatch] = useReducer(clipboardViewReducer, INITIAL_CLIPBOARD_VIEW_STATE);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: history = [], isLoading } = useClipboardHistory(true);
  const { data: pinnedEntryIds = [] } = usePinnedClipboardHistory();
  const recordUsage = useManagedItemPreferencesStore((managedState) => managedState.recordUsage);
  const pinnedEntryIdSet = useMemo(() => new Set(pinnedEntryIds), [pinnedEntryIds]);

  useMountEffect(() => clearClipboardActionsState);

  const updateDebouncedQuery = useMemo(
    () =>
      debounce((value: string) => {
        dispatch({ type: "set-debounced-query", value });
      }, 150),
    [],
  );

  const filteredByType = useMemo(
    () =>
      state.typeFilter === "all"
        ? history
        : history.filter((entry) => entry.content_type === state.typeFilter),
    [history, state.typeFilter],
  );
  const pinnedEntries = useMemo(
    () =>
      filteredByType.filter((entry) =>
        pinnedEntryIdSet.has(
          buildClipboardPinnedEntryId({ copiedAt: entry.copied_at, value: entry.value }),
        ),
      ),
    [filteredByType, pinnedEntryIdSet],
  );
  const unpinnedEntries = useMemo(
    () =>
      filteredByType.filter(
        (entry) =>
          !pinnedEntryIdSet.has(
            buildClipboardPinnedEntryId({ copiedAt: entry.copied_at, value: entry.value }),
          ),
      ),
    [filteredByType, pinnedEntryIdSet],
  );
  const filteredHistory = useManagedItemRankedGroups({
    groups: [pinnedEntries, unpinnedEntries],
    query: state.debouncedQuery,
    getManagedItem: toManagedClipboardItem,
    getSearchableText: (entry) =>
      entry.content_type === ClipboardContentType.Image
        ? "image screenshot clipboard"
        : entry.value.slice(0, 4096),
    compareFallback: (left, right) => right.copied_at.localeCompare(left.copied_at),
  });
  const getEntryId = useCallback(
    (entry: ClipboardHistoryEntry) =>
      buildClipboardPinnedEntryId({ copiedAt: entry.copied_at, value: entry.value }),
    [],
  );

  const selectionKey = `${state.debouncedQuery}\u0000${state.typeFilter}\u0000${filteredHistory.length}`;
  const selectedIndex =
    state.selectionState.key === selectionKey
      ? Math.max(
          0,
          filteredHistory.findIndex((entry) => getEntryId(entry) === state.selectionState.entryId),
        )
      : 0;
  const setSelectedIndex = (value: number | ((previous: number) => number)) => {
    const nextIndex = typeof value === "function" ? value(selectedIndex) : value;
    const boundedIndex = Math.max(0, Math.min(nextIndex, Math.max(filteredHistory.length - 1, 0)));
    const nextEntry = filteredHistory[boundedIndex] ?? null;

    dispatch({
      type: "set-selection",
      value: {
        key: selectionKey,
        entryId: nextEntry ? getEntryId(nextEntry) : "",
      },
    });
  };

  const selectedEntry = filteredHistory[selectedIndex] || null;
  const isInitialLoading = isLoading && history.length === 0;
  const copyFeedbackTimerRef = useRef<number | null>(null);
  const focusInputRef = useCallback((node: HTMLInputElement | null) => {
    inputRef.current = node;
    node?.focus();
  }, []);

  const handleCopy = useCallback(
    async (entry: ClipboardHistoryEntry) => {
      try {
        const isImage = entry.content_type === ClipboardContentType.Image;
        await copyToClipboard(entry.value, isImage);
        recordUsage(toManagedClipboardItem(entry));
        dispatch({
          type: "set-selection",
          value: {
            key: selectionKey,
            entryId: getEntryId(entry),
          },
        });
        dispatch({ type: "set-copied-state", copiedEntryId: getEntryId(entry), copyError: null });
      } catch (error) {
        console.error("Failed to copy:", error);
        dispatch({
          type: "set-copied-state",
          copiedEntryId: null,
          copyError: "Could not copy entry",
        });
      }

      if (copyFeedbackTimerRef.current !== null) {
        window.clearTimeout(copyFeedbackTimerRef.current);
      }

      copyFeedbackTimerRef.current = window.setTimeout(() => {
        copyFeedbackTimerRef.current = null;
        dispatch({ type: "set-copied-state", copiedEntryId: null, copyError: null });
      }, 1400);
    },
    [getEntryId, recordUsage, selectionKey],
  );

  const handleCopySelected = useCallback(() => {
    if (selectedEntry) {
      return handleCopy(selectedEntry);
    }
  }, [handleCopy, selectedEntry, selectedIndex]);

  useEffect(() => {
    syncClipboardActionsState({
      selectedEntry,
      selectedIndex,
      onCopy: handleCopySelected,
    });
  }, [handleCopySelected, selectedEntry, selectedIndex]);

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
        void handleCopy(selectedEntry);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      if (state.query) {
        dispatch({ type: "set-query", value: "" });
        updateDebouncedQuery("");
      } else {
        onBack();
      }
    }
  };

  const handleChange = (value: string) => {
    dispatch({ type: "set-query", value });
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
      role="region"
      aria-label="Clipboard history"
      tabIndex={-1}
    >
      <ClipboardHeader
        query={state.query}
        onQueryChange={handleChange}
        onKeyDown={handleKeyDown}
        onBack={onBack}
        typeFilter={state.typeFilter}
        onTypeFilterChange={(value) => dispatch({ type: "set-type-filter", value })}
        inputRef={focusInputRef}
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
          isCopied={
            selectedEntry
              ? state.copiedEntryId === getEntryId(selectedEntry) && !state.copyError
              : false
          }
          copyError={state.copyError}
          isLoading={isInitialLoading}
          onCopy={() => {
            if (selectedEntry) {
              void handleCopy(selectedEntry);
            }
          }}
        />
      </div>

      <ClipboardFooter
        copiedEntryIndex={
          selectedEntry && state.copiedEntryId === getEntryId(selectedEntry) ? selectedIndex : null
        }
        selectedIndex={selectedIndex}
        copyError={state.copyError}
        canCopy={Boolean(selectedEntry)}
        onBack={onBack}
        onCopySelected={() => {
          if (selectedEntry) {
            void handleCopy(selectedEntry);
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
