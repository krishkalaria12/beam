import { Search, RefreshCcw } from "lucide-react";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { CommandFooterBar } from "@/components/command/command-footer-bar";
import { CommandKeyHint } from "@/components/command/command-key-hint";
import {
  CommandPanelBackButton,
  CommandPanelHeader,
  CommandPanelTitleBlock,
} from "@/components/command/command-panel-header";
import { CommandStatusChip } from "@/components/command/command-status-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLauncherPanelBackHandler } from "@/modules/launcher/lib/back-navigation";
import { WindowSwitcherList } from "@/modules/window-switcher/components/window-switcher-list";
import { useCloseWindowMutation } from "@/modules/window-switcher/hooks/use-close-window-mutation";
import { useFocusWindowMutation } from "@/modules/window-switcher/hooks/use-focus-window-mutation";
import { useWindowEntriesQuery } from "@/modules/window-switcher/hooks/use-window-entries-query";

interface WindowSwitcherViewProps {
  onBack: () => void;
}

function normalizeQuery(value: string): string {
  return value.trim().toLowerCase();
}

export function WindowSwitcherView({ onBack }: WindowSwitcherViewProps) {
  const windowsQuery = useWindowEntriesQuery(true);
  const focusMutation = useFocusWindowMutation();
  const closeMutation = useCloseWindowMutation();

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const normalizedQuery = normalizeQuery(deferredSearch);

  const filteredWindows = useMemo(() => {
    const entries = windowsQuery.data ?? [];
    if (!normalizedQuery) {
      return entries;
    }

    return entries.filter((entry) => {
      const haystack = `${entry.title} ${entry.appName} ${entry.workspace}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [normalizedQuery, windowsQuery.data]);

  const [selectedWindowId, setSelectedWindowId] = useState<string | null>(null);

  useEffect(() => {
    if (filteredWindows.length === 0) {
      setSelectedWindowId(null);
      return;
    }

    if (!selectedWindowId || !filteredWindows.some((entry) => entry.id === selectedWindowId)) {
      setSelectedWindowId(filteredWindows[0]?.id ?? null);
    }
  }, [filteredWindows, selectedWindowId]);

  const busy = focusMutation.isPending || closeMutation.isPending;

  const handleFocusWindow = useCallback(async (windowId: string) => {
    try {
      await focusMutation.mutateAsync(windowId);
      onBack();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to focus window.";
      toast.error(message);
    }
  }, [focusMutation, onBack]);

  const handleCloseWindow = useCallback(async (windowId: string) => {
    try {
      await closeMutation.mutateAsync(windowId);
      toast.success("Window closed.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to close window.";
      toast.error(message);
    }
  }, [closeMutation]);

  const handleKeyboardFocus = useCallback(() => {
    if (!selectedWindowId || busy) {
      return;
    }

    void handleFocusWindow(selectedWindowId);
  }, [busy, handleFocusWindow, selectedWindowId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      if (!filteredWindows.length) {
        return;
      }

      const target = event.target;
      const isEditableTarget = target instanceof HTMLElement &&
        (target.tagName.toLowerCase() === "textarea" || target.isContentEditable);
      if (isEditableTarget) {
        return;
      }

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const currentIndex = filteredWindows.findIndex((entry) => entry.id === selectedWindowId);
        const hasSelection = currentIndex >= 0;
        const fallbackIndex = 0;
        const nextIndex = event.key === "ArrowDown"
          ? (hasSelection ? Math.min(filteredWindows.length - 1, currentIndex + 1) : fallbackIndex)
          : (hasSelection ? Math.max(0, currentIndex - 1) : fallbackIndex);
        const next = filteredWindows[nextIndex];
        if (next) {
          setSelectedWindowId(next.id);
        }
      }

      if (event.key === "Enter" && !event.shiftKey) {
        const isInput = target instanceof HTMLInputElement;
        if (isInput && target.value.length > 0 && selectedWindowId) {
          event.preventDefault();
          handleKeyboardFocus();
          return;
        }

        if (!isInput && selectedWindowId) {
          event.preventDefault();
          handleKeyboardFocus();
        }
      }

      if (event.key === "Enter" && event.shiftKey && selectedWindowId && !busy) {
        event.preventDefault();
        void handleCloseWindow(selectedWindowId);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [busy, filteredWindows, handleCloseWindow, handleKeyboardFocus, selectedWindowId]);

  useLauncherPanelBackHandler("window-switcher", onBack);

  const statusLabel = windowsQuery.isLoading
    ? "Loading"
    : windowsQuery.isRefetching
      ? "Refreshing"
      : `${filteredWindows.length} windows`;

  return (
    <div className="glass-effect flex h-full w-full flex-col overflow-hidden text-foreground">
      <CommandPanelHeader>
        <CommandPanelBackButton onClick={onBack} aria-label="Back" />
        <CommandPanelTitleBlock
          title="Window Switcher"
          subtitle="Focus or close open windows"
        />
        <CommandStatusChip
          label={statusLabel}
          tone={windowsQuery.isError ? "error" : windowsQuery.isRefetching ? "info" : "neutral"}
          pulse={windowsQuery.isLoading || windowsQuery.isRefetching}
        />
      </CommandPanelHeader>

      <div className="border-b border-border/50 px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
              }}
              placeholder="Search open windows"
              className="h-8 pl-8"
              autoFocus
            />
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 px-0"
            onClick={() => {
              void windowsQuery.refetch();
            }}
            disabled={windowsQuery.isFetching}
            aria-label="Refresh window list"
          >
            <RefreshCcw className="size-3.5" />
          </Button>
        </div>
      </div>

      {windowsQuery.isError ? (
        <div className="p-4 text-xs text-destructive">
          {windowsQuery.error instanceof Error
            ? windowsQuery.error.message
            : "Failed to load open windows."}
        </div>
      ) : (
        <WindowSwitcherList
          windows={filteredWindows}
          selectedWindowId={selectedWindowId}
          isBusy={busy}
          onSelect={setSelectedWindowId}
          onFocus={handleFocusWindow}
          onClose={handleCloseWindow}
        />
      )}

      <CommandFooterBar
        leftSlot={windowsQuery.isError ? "Window switcher backend error" : null}
        rightSlot={(
          <>
            <CommandKeyHint keyLabel="Enter" label="Focus" />
            <CommandKeyHint keyLabel={["Shift", "Enter"]} label="Close" />
            <CommandKeyHint keyLabel="Esc" label="Back" />
          </>
        )}
      />
    </div>
  );
}
