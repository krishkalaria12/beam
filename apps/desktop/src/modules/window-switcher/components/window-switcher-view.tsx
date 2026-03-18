import { AppWindow, ChevronLeft, RefreshCcw, Search } from "lucide-react";
import { useCallback, useDeferredValue, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { ModuleFooter } from "@/components/module";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLauncherPanelBackHandler } from "@/modules/launcher/lib/back-navigation";
import { WindowSwitcherList } from "@/modules/window-switcher/components/window-switcher-list";
import { useCloseWindowMutation } from "@/modules/window-switcher/hooks/use-close-window-mutation";
import { useFocusWindowMutation } from "@/modules/window-switcher/hooks/use-focus-window-mutation";
import { useWindowEntriesQuery } from "@/modules/window-switcher/hooks/use-window-entries-query";
import { useMountEffect } from "@/hooks/use-mount-effect";

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
  const filteredWindowsRef = useRef(filteredWindows);
  const selectedWindowIdRef = useRef<string | null>(selectedWindowId);
  const busyRef = useRef(false);

  const resolvedSelectedWindowId = filteredWindows.some((entry) => entry.id === selectedWindowId)
    ? selectedWindowId
    : (filteredWindows[0]?.id ?? null);

  if (selectedWindowId !== resolvedSelectedWindowId) {
    setSelectedWindowId(resolvedSelectedWindowId);
  }

  const busy = focusMutation.isPending || closeMutation.isPending;
  filteredWindowsRef.current = filteredWindows;
  selectedWindowIdRef.current = resolvedSelectedWindowId;
  busyRef.current = busy;

  const handleFocusWindow = useCallback(
    async (windowId: string) => {
      try {
        await focusMutation.mutateAsync(windowId);
        onBack();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to focus window.";
        toast.error(message);
      }
    },
    [focusMutation, onBack],
  );

  const handleCloseWindow = useCallback(
    async (windowId: string) => {
      try {
        await closeMutation.mutateAsync(windowId);
        toast.success("Window closed.");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to close window.";
        toast.error(message);
      }
    },
    [closeMutation],
  );

  const handleKeyboardFocus = useCallback(() => {
    if (!selectedWindowId || busy) {
      return;
    }

    void handleFocusWindow(selectedWindowId);
  }, [busy, handleFocusWindow, selectedWindowId]);

  const handleKeyboardFocusRef = useRef(handleKeyboardFocus);
  const handleCloseWindowRef = useRef(handleCloseWindow);
  handleKeyboardFocusRef.current = handleKeyboardFocus;
  handleCloseWindowRef.current = handleCloseWindow;

  useMountEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      const currentFilteredWindows = filteredWindowsRef.current;
      if (!currentFilteredWindows.length) {
        return;
      }

      const target = event.target;
      const isEditableTarget =
        target instanceof HTMLElement &&
        (target.tagName.toLowerCase() === "textarea" || target.isContentEditable);
      if (isEditableTarget) {
        return;
      }

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const currentIndex = currentFilteredWindows.findIndex(
          (entry) => entry.id === selectedWindowIdRef.current,
        );
        const hasSelection = currentIndex >= 0;
        const fallbackIndex = 0;
        const nextIndex =
          event.key === "ArrowDown"
            ? hasSelection
              ? Math.min(currentFilteredWindows.length - 1, currentIndex + 1)
              : fallbackIndex
            : hasSelection
              ? Math.max(0, currentIndex - 1)
              : fallbackIndex;
        const next = currentFilteredWindows[nextIndex];
        if (next) {
          setSelectedWindowId(next.id);
        }
      }

      if (event.key === "Enter" && !event.shiftKey) {
        const isInput = target instanceof HTMLInputElement;
        if (isInput && target.value.length > 0 && selectedWindowIdRef.current) {
          event.preventDefault();
          handleKeyboardFocusRef.current();
          return;
        }

        if (!isInput && selectedWindowIdRef.current) {
          event.preventDefault();
          handleKeyboardFocusRef.current();
        }
      }

      if (event.key === "Enter" && event.shiftKey && selectedWindowIdRef.current && !busyRef.current) {
        event.preventDefault();
        void handleCloseWindowRef.current(selectedWindowIdRef.current);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  });

  useLauncherPanelBackHandler("window-switcher", onBack);

  return (
    <div className="windows-view-enter flex h-full w-full flex-col overflow-hidden">
      {/* Header */}
      <div className="windows-header-enter flex h-14 shrink-0 items-center gap-3 px-4">
        {/* Back Button */}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onBack}
          className="flex size-9 items-center justify-center rounded-lg bg-[var(--launcher-card-hover-bg)] text-muted-foreground transition-colors hover:bg-[var(--launcher-card-hover-bg)] hover:text-muted-foreground"
          aria-label="Back"
        >
          <ChevronLeft className="size-[18px]" />
        </Button>

        {/* Icon + Title */}
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-[var(--launcher-card-bg)]">
            <AppWindow className="size-[18px] text-[var(--icon-primary-fg)]" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-[14px] font-semibold tracking-[-0.02em] text-foreground">
              Window Switcher
            </h1>
            <p className="text-[12px] tracking-[-0.01em] text-muted-foreground">
              Focus or close open windows
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="ml-auto flex items-center gap-2">
          {(windowsQuery.isLoading || windowsQuery.isRefetching) && (
            <div className="flex items-center gap-1.5 rounded-full bg-[var(--launcher-card-hover-bg)] px-2.5 py-1">
              <div className="size-1.5 animate-pulse rounded-full bg-[var(--ring)]" />
              <span className="text-[11px] font-medium tracking-[-0.01em] text-muted-foreground">
                {windowsQuery.isLoading ? "Loading" : "Refreshing"}
              </span>
            </div>
          )}
          {!windowsQuery.isLoading && !windowsQuery.isRefetching && (
            <span className="text-[11px] font-medium tracking-[-0.01em] text-muted-foreground">
              {filteredWindows.length} {filteredWindows.length === 1 ? "window" : "windows"}
            </span>
          )}
        </div>
      </div>

      {/* Toolbar / Search */}
      <div className="windows-toolbar-enter flex items-center gap-2 border-b border-[var(--launcher-card-border)] px-4 pb-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search open windows..."
            className="h-10 w-full rounded-xl bg-[var(--launcher-card-hover-bg)] pl-10 pr-4 text-[13px] tracking-[-0.01em] text-foreground ring-1 ring-[var(--launcher-card-border)] transition-all placeholder:text-muted-foreground focus:outline-none focus:ring-[var(--ring)]"
            autoFocus
          />
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => {
            void windowsQuery.refetch();
          }}
          disabled={windowsQuery.isFetching}
          className="flex size-10 items-center justify-center rounded-xl bg-[var(--launcher-card-hover-bg)] text-muted-foreground ring-1 ring-[var(--launcher-card-border)] transition-all hover:bg-[var(--launcher-card-hover-bg)] hover:text-muted-foreground disabled:opacity-50"
          aria-label="Refresh window list"
        >
          <RefreshCcw className={`size-4 ${windowsQuery.isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Content */}
      {windowsQuery.isError ? (
        <div className="windows-content-enter flex flex-1 items-center justify-center p-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-[var(--icon-red-bg)]">
              <AppWindow className="size-6 text-[var(--icon-red-fg)]" />
            </div>
            <p className="text-[13px] font-medium tracking-[-0.01em] text-muted-foreground">
              Failed to load windows
            </p>
            <p className="max-w-xs text-[12px] tracking-[-0.01em] text-muted-foreground">
              {windowsQuery.error instanceof Error
                ? windowsQuery.error.message
                : "An error occurred while fetching open windows."}
            </p>
          </div>
        </div>
      ) : (
        <WindowSwitcherList
          windows={filteredWindows}
          selectedWindowId={resolvedSelectedWindowId}
          isBusy={busy}
          onSelect={setSelectedWindowId}
          onFocus={handleFocusWindow}
          onClose={handleCloseWindow}
        />
      )}

      <ModuleFooter
        className="windows-footer-enter border-[var(--launcher-card-border)]"
        leftSlot={
          <div className="flex items-center gap-1 text-[11px] tracking-[-0.01em] text-muted-foreground">
            {windowsQuery.isError && (
              <span className="text-[var(--icon-red-fg)]">Window switcher backend error</span>
            )}
          </div>
        }
        shortcuts={[
          { keys: ["Enter"], label: "Focus" },
          { keys: ["Shift", "Enter"], label: "Close" },
        ]}
      />
    </div>
  );
}
