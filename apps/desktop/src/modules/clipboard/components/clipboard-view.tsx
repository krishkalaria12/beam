import { useCallback, useMemo, useReducer, useRef } from "react";

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

interface ClipboardViewState {
  query: string;
  debouncedQuery: string;
  typeFilter: ClipboardTypeFilter;
  selectionState: { key: string; index: number };
  copiedEntryIndex: number | null;
  copyError: string | null;
}

type ClipboardViewAction =
  | { type: "set-query"; value: string }
  | { type: "set-debounced-query"; value: string }
  | { type: "set-type-filter"; value: ClipboardTypeFilter }
  | { type: "set-selection"; value: { key: string; index: number } }
  | { type: "set-copied-state"; copiedEntryIndex: number | null; copyError: string | null };

const INITIAL_CLIPBOARD_VIEW_STATE: ClipboardViewState = {
  query: "",
  debouncedQuery: "",
  typeFilter: "all",
  selectionState: { key: "", index: 0 },
  copiedEntryIndex: null,
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
        copiedEntryIndex: action.copiedEntryIndex,
        copyError: action.copyError,
      };
  }
}

export function ClipboardView({ onBack, onToggleActions }: ClipboardViewProps) {
  const [state, dispatch] = useReducer(clipboardViewReducer, INITIAL_CLIPBOARD_VIEW_STATE);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: history = [], isLoading } = useClipboardHistory(true);

  const updateDebouncedQuery = useMemo(
    () =>
      debounce((value: string) => {
        dispatch({ type: "set-debounced-query", value });
      }, 150),
    [],
  );

  const filteredHistory = useMemo(() => {
    const lowerQuery = state.debouncedQuery.toLowerCase();
    const filteredByType =
      state.typeFilter === "all"
        ? history
        : history.filter((entry) => entry.content_type === state.typeFilter);

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
  }, [history, state.debouncedQuery, state.typeFilter]);

  const selectionKey = `${state.query}\u0000${state.typeFilter}\u0000${filteredHistory.length}`;
  if (state.selectionState.key !== selectionKey) {
    dispatch({ type: "set-selection", value: { key: selectionKey, index: 0 } });
  }

  const selectedIndex = Math.min(
    state.selectionState.index,
    Math.max(filteredHistory.length - 1, 0),
  );
  const setSelectedIndex = (value: number | ((previous: number) => number)) => {
    const previous = state.selectionState;
    dispatch({
      type: "set-selection",
      value: {
        key: selectionKey,
        index:
          typeof value === "function"
            ? value(previous.key === selectionKey ? previous.index : 0)
            : value,
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

  const handleCopy = async (entry: ClipboardHistoryEntry, index: number) => {
    try {
      const isImage = entry.content_type === ClipboardContentType.Image;
      await copyToClipboard(entry.value, isImage);
      dispatch({ type: "set-copied-state", copiedEntryIndex: index, copyError: null });
    } catch (error) {
      console.error("Failed to copy:", error);
      dispatch({
        type: "set-copied-state",
        copiedEntryIndex: null,
        copyError: "Could not copy entry",
      });
    }

    if (copyFeedbackTimerRef.current !== null) {
      window.clearTimeout(copyFeedbackTimerRef.current);
    }

    copyFeedbackTimerRef.current = window.setTimeout(() => {
      copyFeedbackTimerRef.current = null;
      dispatch({ type: "set-copied-state", copiedEntryIndex: null, copyError: null });
    }, 1400);
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
          isCopied={state.copiedEntryIndex === selectedIndex && !state.copyError}
          copyError={state.copyError}
          isLoading={isInitialLoading}
          onCopy={() => {
            if (selectedEntry) {
              void handleCopy(selectedEntry, selectedIndex);
            }
          }}
        />
      </div>

      <ClipboardFooter
        copiedEntryIndex={state.copiedEntryIndex}
        selectedIndex={selectedIndex}
        copyError={state.copyError}
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
