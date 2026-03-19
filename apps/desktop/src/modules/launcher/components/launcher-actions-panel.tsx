import { AtSign, ChevronLeft, Keyboard, Settings2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import {
  readCommandPreferences,
  setCommandAliases,
  setCommandHotkey,
  writeCommandPreferences,
} from "@/command-registry/command-preferences";
import { Button } from "@/components/ui/button";
import { Command } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import {
  getHotkeySettings,
  removeCommandHotkey,
  updateCommandHotkey,
} from "@/modules/settings/api/hotkeys";
import { useMountEffect } from "@/hooks/use-mount-effect";

import { LauncherActionsAliasPage } from "./launcher-actions-alias-page";
import { LauncherActionsHotkeyPage } from "./launcher-actions-hotkey-page";
import {
  buildAliasAvailability,
  buildHotkeyAvailability,
  filterActionItems,
  findAliasConflictCommandId,
  findHotkeyConflictCommandId,
  formatCommandName,
} from "@/modules/launcher/helper";
import { LauncherActionsRootPage } from "./launcher-actions-root-page";
import type {
  ActionPageId,
  LauncherActionItem,
  LauncherActionsPanelProps,
  SaveFeedback,
} from "@/modules/launcher/types";

export type { LauncherActionItem } from "@/modules/launcher/types";

function buildDefaultRootItems(): LauncherActionItem[] {
  return [
    {
      id: "open-command-settings",
      label: "Open Command Settings",
      icon: <Settings2 />,
      keywords: ["settings", "preferences", "config"],
      onSelect: () => {
        toast.info("Command settings integration can be wired next.");
      },
    },
    {
      id: "set-hotkey",
      label: "Set Hotkey...",
      icon: <Keyboard />,
      keywords: ["shortcut", "keys", "binding"],
      nextPageId: "hotkey",
      closeOnSelect: false,
    },
    {
      id: "set-alias",
      label: "Set Alias...",
      icon: <AtSign />,
      keywords: ["alias", "keyword", "trigger"],
      nextPageId: "alias",
      closeOnSelect: false,
    },
  ];
}

function createEmptySelectionByPage(): Record<ActionPageId, string> {
  return {
    root: "",
    hotkey: "",
    alias: "",
  };
}

export function LauncherActionsPanel({
  open,
  ...props
}: LauncherActionsPanelProps) {
  if (!open) {
    return null;
  }

  return <LauncherActionsPanelContent key={props.targetCommandId ?? "__all__"} {...props} />;
}

function LauncherActionsPanelContent({
  onOpenChange,
  containerClassName,
  rootTitle,
  rootSearchPlaceholder,
  rootItems,
  targetCommandId,
  targetCommandTitle,
}: Omit<LauncherActionsPanelProps, "open">) {
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const aliasInputRef = React.useRef<HTMLInputElement | null>(null);
  const onOpenChangeRef = React.useRef(onOpenChange);
  const inputId = React.useId();
  const aliasInputId = React.useId();

  const [pageStack, setPageStack] = React.useState<ActionPageId[]>(["root"]);
  const [rootQuery, setRootQuery] = React.useState("");
  const [hotkeyValue, setHotkeyValue] = React.useState("");
  const [aliasValue, setAliasValue] = React.useState("");
  const [hotkeyMap, setHotkeyMap] = React.useState<Record<string, string>>({});
  const [aliasesById, setAliasesById] = React.useState<Record<string, string[]>>({});
  const [savingPage, setSavingPage] = React.useState<"hotkey" | "alias" | null>(null);
  const [hotkeyFeedback, setHotkeyFeedback] = React.useState<SaveFeedback | null>(null);
  const [aliasFeedback, setAliasFeedback] = React.useState<SaveFeedback | null>(null);
  const [selectedItemByPage, setSelectedItemByPage] = React.useState<Record<ActionPageId, string>>(
    createEmptySelectionByPage,
  );

  const currentPageId = pageStack[pageStack.length - 1] ?? "root";
  const resolvedRootItems = rootItems ?? buildDefaultRootItems();
  const filteredRootItems = filterActionItems(resolvedRootItems, rootQuery);

  const hotkeyConflictCommandId = targetCommandId
    ? findHotkeyConflictCommandId(hotkeyMap, targetCommandId, hotkeyValue)
    : null;
  const aliasConflictCommandId = targetCommandId
    ? findAliasConflictCommandId(aliasesById, targetCommandId, aliasValue)
    : null;

  const hotkeyAvailability = buildHotkeyAvailability({
    targetCommandId,
    targetCommandTitle,
    hotkeyValue,
    hotkeyConflictCommandId,
  });

  const aliasAvailability = buildAliasAvailability({
    targetCommandId,
    targetCommandTitle,
    aliasValue,
    aliasConflictCommandId,
  });
  const preferredRootItemId = selectedItemByPage.root;
  const hasPreferredRootItem = filteredRootItems.some(
    (item) => item.id === preferredRootItemId && !item.disabled,
  );
  const selectedRootItemId = hasPreferredRootItem
    ? preferredRootItemId
    : (filteredRootItems.find((item) => !item.disabled)?.id ?? "");

  const panelTitle =
    currentPageId === "hotkey"
      ? "Set Hotkey"
      : currentPageId === "alias"
        ? "Set Alias"
        : (rootTitle ?? "Configure Application...");

  const panelSubtitle =
    currentPageId === "hotkey"
      ? (targetCommandTitle ?? "Assign quick keyboard shortcuts.")
      : currentPageId === "alias"
        ? (targetCommandTitle ?? "Create quick trigger phrases.")
        : undefined;
  onOpenChangeRef.current = onOpenChange;

  function goBack() {
    setPageStack((previous) => {
      if (previous.length <= 1) {
        return previous;
      }
      return previous.slice(0, -1);
    });
  }

  function openNextPage(nextPageId: ActionPageId) {
    setPageStack((previous) => [...previous, nextPageId]);
  }

  const rootInputMountRef = React.useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (!node || currentPageId !== "root") {
        return;
      }

      window.requestAnimationFrame(() => {
        if (node.isConnected) {
          node.focus({ preventScroll: true });
        }
      });
    },
    [currentPageId],
  );

  const aliasInputMountRef = React.useCallback(
    (node: HTMLInputElement | null) => {
      aliasInputRef.current = node;
      if (!node || currentPageId !== "alias") {
        return;
      }

      window.requestAnimationFrame(() => {
        if (node.isConnected) {
          node.focus({ preventScroll: true });
        }
      });
    },
    [currentPageId],
  );

  async function saveHotkey() {
    if (savingPage) {
      return;
    }

    if (!targetCommandId) {
      setHotkeyFeedback({
        tone: "error",
        text: "No command selected for hotkey registration.",
      });
      return;
    }

    if (hotkeyConflictCommandId) {
      setHotkeyFeedback({
        tone: "error",
        text: `"${hotkeyValue}" is already used by ${formatCommandName(
          hotkeyConflictCommandId,
          targetCommandTitle,
          targetCommandId,
        )}.`,
      });
      return;
    }

    const normalizedHotkey = hotkeyValue.trim();
    setSavingPage("hotkey");

    try {
      if (!normalizedHotkey) {
        const removeResult = await removeCommandHotkey(targetCommandId);
        if (!removeResult.success) {
          setHotkeyFeedback({
            tone: "error",
            text: "Failed to remove shortcut.",
          });
          return;
        }

        setHotkeyMap((previous) => {
          const next = { ...previous };
          delete next[targetCommandId];
          return next;
        });

        const currentPreferences = readCommandPreferences();
        writeCommandPreferences(setCommandHotkey(currentPreferences, targetCommandId, undefined));

        setHotkeyFeedback({
          tone: "success",
          text: "Shortcut removed.",
        });
        return;
      }

      const updateResult = await updateCommandHotkey(targetCommandId, normalizedHotkey);
      if (!updateResult.success) {
        if (updateResult.error === "duplicate") {
          const conflictId = updateResult.conflictCommandId;
          setHotkeyFeedback({
            tone: "error",
            text: conflictId
              ? `"${normalizedHotkey}" is already used by ${formatCommandName(
                  conflictId,
                  targetCommandTitle,
                  targetCommandId,
                )}.`
              : "Shortcut is already in use.",
          });
          return;
        }

        setHotkeyFeedback({
          tone: "error",
          text: "Could not save this shortcut.",
        });
        return;
      }

      setHotkeyMap((previous) => ({
        ...previous,
        [targetCommandId]: normalizedHotkey,
      }));

      const currentPreferences = readCommandPreferences();
      writeCommandPreferences(
        setCommandHotkey(currentPreferences, targetCommandId, normalizedHotkey),
      );

      setHotkeyFeedback({
        tone: "success",
        text: "Shortcut saved.",
      });
    } catch {
      setHotkeyFeedback({
        tone: "error",
        text: "Could not save this shortcut.",
      });
    } finally {
      setSavingPage((previous) => (previous === "hotkey" ? null : previous));
    }
  }

  async function saveAlias() {
    if (savingPage) {
      return;
    }

    if (!targetCommandId) {
      setAliasFeedback({
        tone: "error",
        text: "No command selected for alias registration.",
      });
      return;
    }

    if (aliasConflictCommandId) {
      setAliasFeedback({
        tone: "error",
        text: `"${aliasValue.trim()}" is already used by ${formatCommandName(
          aliasConflictCommandId,
          targetCommandTitle,
          targetCommandId,
        )}.`,
      });
      return;
    }

    setSavingPage("alias");
    try {
      const normalizedAlias = aliasValue.trim();
      const nextAliases = normalizedAlias ? [normalizedAlias] : [];
      const currentPreferences = readCommandPreferences();
      const nextPreferences = setCommandAliases(currentPreferences, targetCommandId, nextAliases);
      writeCommandPreferences(nextPreferences);
      setAliasesById(nextPreferences.aliasesById);

      setAliasFeedback({
        tone: "success",
        text: normalizedAlias ? "Alias saved." : "Alias removed.",
      });
    } catch {
      setAliasFeedback({
        tone: "error",
        text: "Could not save this alias.",
      });
    } finally {
      setSavingPage((previous) => (previous === "alias" ? null : previous));
    }
  }

  useMountEffect(() => {
    const commandPreferences = readCommandPreferences();
    setAliasesById(commandPreferences.aliasesById);
    setAliasValue(
      targetCommandId ? (commandPreferences.aliasesById[targetCommandId]?.[0] ?? "") : "",
    );
    setAliasFeedback(null);
    setHotkeyFeedback(null);

    let isCancelled = false;
    void getHotkeySettings()
      .then((settings) => {
        if (isCancelled) {
          return;
        }

        setHotkeyMap(settings.commandHotkeys);
        setHotkeyValue(targetCommandId ? (settings.commandHotkeys[targetCommandId] ?? "") : "");
      })
      .catch(() => {
        if (isCancelled) {
          return;
        }

        setHotkeyMap({});
        setHotkeyValue("");
        setHotkeyFeedback({
          tone: "error",
          text: "Unable to load existing shortcuts.",
        });
      });

    return () => {
      isCancelled = true;
    };
  });

  useMountEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      if (panelRef.current?.contains(target)) {
        return;
      }

      if (target.closest('[data-slot="command-footer-actions-button"]')) {
        return;
      }

      onOpenChangeRef.current(false);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  });

  return (
    <div
      ref={panelRef}
      data-slot="launcher-actions-panel"
      className={cn(
        "sc-actions-panel",
        "absolute bottom-[calc(100%+10px)] right-3 z-[60]",
        "w-[335px] overflow-hidden rounded-2xl",
        containerClassName,
      )}
    >
      <Command
        shouldFilter={false}
        value={currentPageId === "root" ? selectedRootItemId : ""}
        onValueChange={(value) => {
          if (currentPageId !== "root") {
            return;
          }

          setSelectedItemByPage((previous) =>
            previous.root === value
              ? previous
              : {
                  ...previous,
                  root: value,
                },
          );
        }}
        className="h-full bg-transparent"
        onKeyDown={(event) => {
          if (event.defaultPrevented) {
            return;
          }

          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            if (pageStack.length > 1) {
              goBack();
            } else {
              onOpenChange(false);
            }
            return;
          }

          if (
            event.key === "Backspace" &&
            rootQuery.length === 0 &&
            pageStack.length > 1 &&
            currentPageId === "root" &&
            event.target instanceof HTMLElement &&
            (event.target instanceof HTMLInputElement ||
              event.target instanceof HTMLTextAreaElement)
          ) {
            event.preventDefault();
            event.stopPropagation();
            goBack();
            return;
          }

          if (
            event.key === "Enter" &&
            !event.metaKey &&
            !event.ctrlKey &&
            !event.altKey &&
            !event.shiftKey
          ) {
            if (currentPageId === "hotkey") {
              event.preventDefault();
              event.stopPropagation();
              void saveHotkey();
              return;
            }

            if (currentPageId === "alias") {
              event.preventDefault();
              event.stopPropagation();
              void saveAlias();
            }
          }
        }}
      >
        {currentPageId !== "root" ? (
          <div className="border-b border-[var(--ui-divider)] px-3.5 py-3">
            <div className="flex items-center gap-2">
              {pageStack.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="size-7 rounded-md text-muted-foreground/75 hover:bg-[var(--launcher-card-hover-bg)] hover:text-foreground"
                  onClick={goBack}
                >
                  <ChevronLeft className="size-4" />
                  <span className="sr-only">Back</span>
                </Button>
              ) : null}
              <div className="min-w-0">
                <p className="truncate text-launcher-md font-medium text-foreground">{panelTitle}</p>
                {panelSubtitle ? (
                  <p className="truncate text-launcher-xs text-muted-foreground">{panelSubtitle}</p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {currentPageId === "root" ? (
          <LauncherActionsRootPage
            inputId={inputId}
            inputRef={rootInputMountRef}
            query={rootQuery}
            searchPlaceholder={rootSearchPlaceholder ?? "Search actions..."}
            items={filteredRootItems}
            onQueryChange={setRootQuery}
            onNavigate={(item) => {
              if (item.nextPageId) {
                setSelectedItemByPage((previous) =>
                  previous.root === item.id
                    ? previous
                    : {
                        ...previous,
                        root: item.id,
                      },
                );
                openNextPage(item.nextPageId);
                return;
              }

              item.onSelect?.();
              if (item.closeOnSelect ?? true) {
                onOpenChange(false);
              }
            }}
          />
        ) : currentPageId === "hotkey" ? (
          <LauncherActionsHotkeyPage
            hotkeyValue={hotkeyValue}
            saving={savingPage === "hotkey"}
            canSave={
              savingPage !== "hotkey" &&
              Boolean(targetCommandId) &&
              (hotkeyFeedback ?? hotkeyAvailability).tone !== "error"
            }
            feedback={hotkeyFeedback}
            availability={hotkeyAvailability}
            onHotkeyChange={(value) => {
              setHotkeyValue(value);
              setHotkeyFeedback(null);
            }}
            onSave={() => {
              void saveHotkey();
            }}
            onBack={goBack}
          />
        ) : (
          <LauncherActionsAliasPage
            aliasInputId={aliasInputId}
            aliasInputRef={aliasInputMountRef}
            aliasValue={aliasValue}
            saving={savingPage === "alias"}
            canSave={
              savingPage !== "alias" &&
              Boolean(targetCommandId) &&
              (aliasFeedback ?? aliasAvailability).tone !== "error"
            }
            feedback={aliasFeedback}
            availability={aliasAvailability}
            onAliasChange={(value) => {
              setAliasValue(value);
              setAliasFeedback(null);
            }}
            onSave={() => {
              void saveAlias();
            }}
            onBack={goBack}
          />
        )}
      </Command>
    </div>
  );
}
