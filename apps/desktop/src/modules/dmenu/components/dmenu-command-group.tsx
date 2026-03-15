import { getCurrentWindow } from "@tauri-apps/api/window";
import { useDeferredValue, useEffect, useMemo, useRef, useState, startTransition } from "react";

import { completeCliDmenuRequest, searchCliDmenuRequest } from "@/modules/dmenu/api/bridge";
import type { DmenuResolvePayload, DmenuSessionRow } from "@/modules/dmenu/types";
import { useLauncherPanelBackHandler } from "@/modules/launcher/lib/back-navigation";
import { cn } from "@/lib/utils";
import { useLauncherUiStore } from "@/store/use-launcher-ui-store";

function pickDefaultRowId(
  rows: DmenuSessionRow[],
  rankedRowIds: readonly string[],
  selectText?: string,
) {
  if (selectText) {
    const normalizedSelectText = selectText.trim();
    const matchingSelected = rankedRowIds.find((rowId) => {
      const row = rows.find((entry) => entry.id === rowId);
      return row && !row.nonselectable && row.rawText === normalizedSelectText;
    });
    if (matchingSelected) {
      return matchingSelected;
    }
  }

  return rankedRowIds.find((rowId) => {
    const row = rows.find((entry) => entry.id === rowId);
    return row && !row.nonselectable;
  });
}

export default function DmenuCommandGroup() {
  const dmenuSession = useLauncherUiStore((state) => state.dmenuSession);
  const dmenuQuery = useLauncherUiStore((state) => state.dmenuQuery);
  const setDmenuQuery = useLauncherUiStore((state) => state.setDmenuQuery);
  const closeDmenuSession = useLauncherUiStore((state) => state.closeDmenuSession);
  const deferredQuery = useDeferredValue(dmenuQuery);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [rankedRowIds, setRankedRowIds] = useState<string[]>([]);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  const rowsById = useMemo(
    () => new Map(dmenuSession?.rows.map((row) => [row.id, row]) ?? []),
    [dmenuSession?.rows],
  );

  useEffect(() => {
    setRankedRowIds(dmenuSession?.rows.map((row) => row.id) ?? []);
    setSelectedRowId(null);
  }, [dmenuSession?.requestId, dmenuSession?.rows]);

  useEffect(() => {
    if (!dmenuSession) {
      return;
    }

    let cancelled = false;
    void searchCliDmenuRequest(dmenuSession.requestId, deferredQuery)
      .then((nextRankedRowIds) => {
        if (cancelled) {
          return;
        }

        startTransition(() => {
          setRankedRowIds(nextRankedRowIds);
          setSelectedRowId((current) => {
            if (current && nextRankedRowIds.includes(current)) {
              const row = rowsById.get(current);
              if (row && !row.nonselectable) {
                return current;
              }
            }

            return (
              pickDefaultRowId(dmenuSession.rows, nextRankedRowIds, dmenuSession.selectText) ?? null
            );
          });
        });
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("Failed to search dmenu request:", error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [deferredQuery, dmenuSession, rowsById]);

  useEffect(() => {
    if (!dmenuSession) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
      inputRef.current?.select();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [dmenuSession?.requestId]);

  const completeSession = async (payload: DmenuResolvePayload) => {
    await completeCliDmenuRequest(payload);
    const shouldHideWindow = dmenuSession?.restoreWindowHidden === true;
    closeDmenuSession();
    if (shouldHideWindow) {
      try {
        await getCurrentWindow().hide();
      } catch {
        // Ignore desktop runtime failures during teardown.
      }
    }
  };

  const cancelSession = async () => {
    if (!dmenuSession) {
      return;
    }

    await completeSession({
      requestId: dmenuSession.requestId,
      accepted: false,
      filterText: dmenuQuery,
    });
  };

  useLauncherPanelBackHandler(
    "dmenu",
    () => {
      void cancelSession();
      return true;
    },
    Boolean(dmenuSession),
  );

  if (!dmenuSession) {
    return null;
  }

  const selectableIds = rankedRowIds.filter((rowId) => {
    const row = rowsById.get(rowId);
    return row && !row.nonselectable;
  });

  const moveSelection = (direction: 1 | -1) => {
    if (selectableIds.length === 0) {
      return;
    }

    const currentIndex = selectedRowId ? selectableIds.indexOf(selectedRowId) : -1;
    const nextIndex =
      currentIndex < 0
        ? 0
        : (currentIndex + direction + selectableIds.length) % selectableIds.length;
    setSelectedRowId(selectableIds[nextIndex] ?? null);
  };

  const submitSelection = async () => {
    const selectedRow = selectedRowId ? rowsById.get(selectedRowId) : undefined;
    if (selectedRow && !selectedRow.nonselectable) {
      await completeSession({
        requestId: dmenuSession.requestId,
        accepted: true,
        selectedIndex: selectedRow.index,
        selectedText: selectedRow.rawText,
        filterText: dmenuQuery,
      });
      return;
    }

    if (dmenuSession.onlyMatch || dmenuSession.noCustom) {
      return;
    }

    await completeSession({
      requestId: dmenuSession.requestId,
      accepted: true,
      selectedText: dmenuQuery,
      filterText: dmenuQuery,
    });
  };

  const visibleRows = rankedRowIds
    .map((rowId) => rowsById.get(rowId))
    .filter((row): row is DmenuSessionRow => Boolean(row));

  return (
    <div className="flex h-full w-full flex-col bg-transparent">
      <div className="border-b border-[var(--launcher-card-border)] px-5 py-4">
        <div className="flex items-center gap-3">
          {dmenuSession.prompt ? (
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
              {dmenuSession.prompt}
            </span>
          ) : null}
          <input
            ref={inputRef}
            type={dmenuSession.password ? "password" : "text"}
            value={dmenuQuery}
            onChange={(event) => {
              setDmenuQuery(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                moveSelection(1);
                return;
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                moveSelection(-1);
                return;
              }
              if (event.key === "Home") {
                event.preventDefault();
                setSelectedRowId(selectableIds[0] ?? null);
                return;
              }
              if (event.key === "End") {
                event.preventDefault();
                setSelectedRowId(selectableIds[selectableIds.length - 1] ?? null);
                return;
              }
              if (event.key === "Enter") {
                event.preventDefault();
                void submitSelection();
              }
            }}
            placeholder="Type to search..."
            className="min-w-0 flex-1 bg-transparent text-lg font-medium text-foreground outline-hidden placeholder:text-muted-foreground/45"
          />
        </div>
        {dmenuSession.message ? (
          <p className="mt-3 text-xs text-muted-foreground/80">{dmenuSession.message}</p>
        ) : null}
      </div>

      <div
        className="custom-scrollbar flex-1 overflow-y-auto px-2 py-2"
        style={{
          maxHeight: `${Math.max(dmenuSession.lines, 1) * 52}px`,
        }}
      >
        {visibleRows.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            No matching results
          </div>
        ) : (
          visibleRows.map((row) => {
            const selected = row.id === selectedRowId;
            return (
              <button
                key={row.id}
                type="button"
                onClick={() => {
                  if (!row.nonselectable) {
                    setSelectedRowId(row.id);
                  }
                }}
                onDoubleClick={() => {
                  if (!row.nonselectable) {
                    void completeSession({
                      requestId: dmenuSession.requestId,
                      accepted: true,
                      selectedIndex: row.index,
                      selectedText: row.rawText,
                      filterText: dmenuQuery,
                    });
                  }
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                  selected
                    ? "bg-[var(--command-item-selected-bg)] text-foreground"
                    : "hover:bg-[var(--command-item-hover-bg)]",
                  row.nonselectable && "cursor-not-allowed opacity-50",
                  row.urgent && "ring-1 ring-[var(--destructive)]/40",
                  row.active && "border border-[var(--command-item-selected-border)]",
                )}
              >
                {row.icon ? (
                  <span className="flex size-8 items-center justify-center rounded-lg border border-[var(--launcher-card-border)] bg-[var(--command-item-hover-bg)] text-[10px] font-semibold uppercase text-muted-foreground">
                    {row.icon.slice(0, 2)}
                  </span>
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{row.displayText}</p>
                  {row.meta ? (
                    <p className="truncate text-[11px] text-muted-foreground/75">{row.meta}</p>
                  ) : null}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
