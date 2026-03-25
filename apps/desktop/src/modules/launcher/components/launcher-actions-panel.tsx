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
  filterActionItems,
  findAliasConflictCommandId,
  findHotkeyConflictCommandId,
  formatCommandName,
} from "@/modules/launcher/helper";
import { LauncherActionsRootPage } from "./launcher-actions-root-page";
import {
  findManagedItemAliasConflictId,
  getManagedItemAliases,
  getManagedItemPreferenceId,
  isManagedItemAliasReserved,
  useManagedItemPreferencesStore,
} from "@/modules/launcher/managed-items";
import type {
  ActionPageId,
  LauncherActionItem,
  LauncherActionsPanelProps,
  LauncherActionTarget,
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

function buildAutoRootItems(
  defaultTarget: LauncherActionTarget | null | undefined,
): LauncherActionItem[] {
  if (!defaultTarget || defaultTarget.kind !== "command") {
    return [];
  }

  return [
    {
      id: `${defaultTarget.commandId}-set-hotkey`,
      label: "Set Hotkey...",
      icon: <Keyboard />,
      keywords: ["shortcut", "keys", "binding"],
      nextPageId: "hotkey",
      nextPageTarget: defaultTarget,
      closeOnSelect: false,
    },
  ];
}

function insertItemsBeforeBack(
  items: readonly LauncherActionItem[],
  extraItems: readonly LauncherActionItem[],
): LauncherActionItem[] {
  if (extraItems.length === 0) {
    return [...items];
  }

  const backIndex = items.findIndex((item) => item.label === "Back");
  if (backIndex < 0) {
    return [...items, ...extraItems];
  }

  return [...items.slice(0, backIndex), ...extraItems, ...items.slice(backIndex)];
}

function createEmptySelectionByPage(): Record<ActionPageId, string> {
  return {
    root: "",
    hotkey: "",
    alias: "",
  };
}

function getAliasSaveSuccessMessage(normalizedAlias: string) {
  if (normalizedAlias) {
    return "Alias saved.";
  }

  return "Alias removed.";
}

function getActionTargetKey(target: LauncherActionTarget | null | undefined): string {
  if (!target) {
    return "";
  }

  if (target.kind === "command") {
    return `command:${target.commandId}`;
  }

  return getManagedItemPreferenceId(target.item);
}

function getActionTargetTitle(target: LauncherActionTarget | null | undefined): string | undefined {
  if (!target) {
    return undefined;
  }

  if (target.kind === "command") {
    return target.title ?? formatCommandName(target.commandId);
  }

  return target.item.title;
}

function buildHotkeyAvailability(options: {
  target: LauncherActionTarget | null;
  hotkeyValue: string;
  hotkeyConflictCommandId: string | null;
}): SaveFeedback {
  const { target, hotkeyValue, hotkeyConflictCommandId } = options;
  if (!target || target.kind !== "command") {
    return {
      tone: "error",
      text: "No command context. Open this from a command panel action.",
    };
  }

  if (!hotkeyValue.trim()) {
    return {
      tone: "neutral",
      text: "Empty value removes the current shortcut.",
    };
  }

  if (hotkeyConflictCommandId) {
    return {
      tone: "error",
      text: `"${hotkeyValue}" is already used by ${formatCommandName(
        hotkeyConflictCommandId,
        target.title,
        target.commandId,
      )}.`,
    };
  }

  return {
    tone: "success",
    text: `"${hotkeyValue}" is available.`,
  };
}

function buildAliasAvailability(options: {
  target: LauncherActionTarget | null;
  aliasValue: string;
  commandAliasesById: Record<string, string[]>;
  managedAliasesById: Record<string, string[]>;
}): SaveFeedback {
  const { target, aliasValue, commandAliasesById, managedAliasesById } = options;
  if (!target) {
    return {
      tone: "error",
      text: "No item context. Open this from an item action.",
    };
  }

  if (!aliasValue.trim()) {
    return {
      tone: "neutral",
      text: "Empty value removes the current alias.",
    };
  }

  if (target.kind === "command") {
    const aliasConflictCommandId = findAliasConflictCommandId(
      commandAliasesById,
      target.commandId,
      aliasValue,
    );
    if (aliasConflictCommandId) {
      return {
        tone: "error",
        text: `"${aliasValue.trim()}" is already used by ${formatCommandName(
          aliasConflictCommandId,
          target.title,
          target.commandId,
        )}.`,
      };
    }
  }

  if (target.kind === "managed-item") {
    if (isManagedItemAliasReserved(target.item, aliasValue)) {
      return {
        tone: "error",
        text: `"${aliasValue.trim()}" is reserved by another item.`,
      };
    }

    const aliasConflictManagedItemId = findManagedItemAliasConflictId(
      managedAliasesById,
      target.item,
      aliasValue,
    );
    if (aliasConflictManagedItemId) {
      return {
        tone: "error",
        text: `"${aliasValue.trim()}" is already used by another item.`,
      };
    }
  }

  return {
    tone: "success",
    text: `"${aliasValue.trim()}" is available.`,
  };
}

interface PageStackEntry {
  id: ActionPageId;
  target: LauncherActionTarget | null;
}

export function LauncherActionsPanel({ open, ...props }: LauncherActionsPanelProps) {
  if (!open) {
    return null;
  }

  return (
    <LauncherActionsPanelContent
      key={getActionTargetKey(props.defaultTarget) || "__all__"}
      {...props}
    />
  );
}

function LauncherActionsPanelContent({
  onOpenChange,
  containerClassName,
  anchorMode = "self",
  rootTitle,
  rootSearchPlaceholder,
  showItemDescriptions = false,
  rootItems,
  defaultRootItemsMode = "replace",
  defaultTarget,
}: Omit<LauncherActionsPanelProps, "open">) {
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const aliasInputRef = React.useRef<HTMLInputElement | null>(null);
  const handleClosePanel = React.useEffectEvent(() => {
    onOpenChange(false);
  });
  const inputId = React.useId();
  const aliasInputId = React.useId();
  const managedAliasesById = useManagedItemPreferencesStore((state) => state.aliasesById);
  const setManagedAliases = useManagedItemPreferencesStore((state) => state.setAliases);

  const [pageStack, setPageStack] = React.useState<PageStackEntry[]>([
    { id: "root", target: defaultTarget ?? null },
  ]);
  const [rootQuery, setRootQuery] = React.useState("");
  const [hotkeyDraftsByTarget, setHotkeyDraftsByTarget] = React.useState<Record<string, string>>(
    {},
  );
  const [aliasDraftsByTarget, setAliasDraftsByTarget] = React.useState<Record<string, string>>({});
  const [hotkeyMap, setHotkeyMap] = React.useState<Record<string, string>>({});
  const [commandAliasesById, setCommandAliasesById] = React.useState<Record<string, string[]>>({});
  const [savingPage, setSavingPage] = React.useState<"hotkey" | "alias" | null>(null);
  const [hotkeyFeedback, setHotkeyFeedback] = React.useState<SaveFeedback | null>(null);
  const [aliasFeedback, setAliasFeedback] = React.useState<SaveFeedback | null>(null);
  const [selectedItemByPage, setSelectedItemByPage] = React.useState<Record<ActionPageId, string>>(
    createEmptySelectionByPage,
  );

  const currentPage = pageStack[pageStack.length - 1] ?? {
    id: "root" as ActionPageId,
    target: defaultTarget ?? null,
  };
  const currentPageId = currentPage.id;
  const currentTarget = currentPage.target;
  const currentTargetKey = getActionTargetKey(currentTarget);
  const currentCommandTarget = currentTarget?.kind === "command" ? currentTarget : null;
  const currentCommandId = currentCommandTarget?.commandId;
  const currentManagedTarget = currentTarget?.kind === "managed-item" ? currentTarget.item : null;
  const currentManagedAliases = currentManagedTarget
    ? getManagedItemAliases(managedAliasesById, currentManagedTarget)
    : [];
  const savedAliasValue = currentManagedTarget
    ? (currentManagedAliases[0] ?? "")
    : currentCommandId
      ? (commandAliasesById[currentCommandId]?.[0] ?? "")
      : "";
  const savedHotkeyValue = currentCommandId ? (hotkeyMap[currentCommandId] ?? "") : "";
  const aliasValue = currentTargetKey
    ? (aliasDraftsByTarget[currentTargetKey] ?? savedAliasValue)
    : savedAliasValue;
  const hotkeyValue = currentTargetKey
    ? (hotkeyDraftsByTarget[currentTargetKey] ?? savedHotkeyValue)
    : savedHotkeyValue;
  const defaultRootItems = buildDefaultRootItems();
  const autoRootItems = buildAutoRootItems(defaultTarget);
  const resolvedRootItems =
    rootItems == null
      ? defaultRootItems
      : defaultRootItemsMode === "append"
        ? [...rootItems, ...defaultRootItems]
        : rootItems;
  const rootItemsWithAutoHotkey = resolvedRootItems.some((item) => item.nextPageId === "hotkey")
    ? resolvedRootItems
    : insertItemsBeforeBack(resolvedRootItems, autoRootItems);
  const filteredRootItems = filterActionItems(rootItemsWithAutoHotkey, rootQuery);
  const hotkeyConflictCommandId = currentCommandId
    ? findHotkeyConflictCommandId(hotkeyMap, currentCommandId, hotkeyValue)
    : null;
  const hotkeyAvailability = buildHotkeyAvailability({
    target: currentTarget,
    hotkeyValue,
    hotkeyConflictCommandId,
  });
  const aliasAvailability = buildAliasAvailability({
    target: currentTarget,
    aliasValue,
    commandAliasesById,
    managedAliasesById,
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
      ? (getActionTargetTitle(currentTarget) ?? "Assign quick keyboard shortcuts.")
      : currentPageId === "alias"
        ? (getActionTargetTitle(currentTarget) ?? "Create quick trigger phrases.")
        : undefined;

  function goBack() {
    setPageStack((previous) => {
      if (previous.length <= 1) {
        return previous;
      }
      return previous.slice(0, -1);
    });
  }

  function openNextPage(nextPageId: ActionPageId, nextTarget: LauncherActionTarget | null) {
    if (nextPageId === "hotkey") {
      setHotkeyFeedback(null);
    }

    if (nextPageId === "alias") {
      setAliasFeedback(null);
    }

    setPageStack((previous) => [...previous, { id: nextPageId, target: nextTarget }]);
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

    if (!currentCommandId) {
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
          currentCommandTarget?.title,
          currentCommandId,
        )}.`,
      });
      return;
    }

    const normalizedHotkey = hotkeyValue.trim();
    setSavingPage("hotkey");

    try {
      if (!normalizedHotkey) {
        const removeResult = await removeCommandHotkey(currentCommandId);
        if (!removeResult.success) {
          setHotkeyFeedback({
            tone: "error",
            text: "Failed to remove shortcut.",
          });
          return;
        }

        setHotkeyMap((previous) => {
          const next = { ...previous };
          delete next[currentCommandId];
          return next;
        });
        setHotkeyDraftsByTarget((previous) => ({
          ...previous,
          [currentTargetKey]: "",
        }));

        const currentPreferences = readCommandPreferences();
        writeCommandPreferences(setCommandHotkey(currentPreferences, currentCommandId, undefined));

        setHotkeyFeedback({
          tone: "success",
          text: "Shortcut removed.",
        });
        return;
      }

      const updateResult = await updateCommandHotkey(currentCommandId, normalizedHotkey);
      if (!updateResult.success) {
        if (updateResult.error === "duplicate") {
          const conflictId = updateResult.conflictCommandId;
          let duplicateMessage = "Shortcut is already in use.";
          if (conflictId) {
            duplicateMessage = `"${normalizedHotkey}" is already used by ${formatCommandName(
              conflictId,
              currentCommandTarget?.title,
              currentCommandId,
            )}.`;
          }

          setHotkeyFeedback({
            tone: "error",
            text: duplicateMessage,
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
        [currentCommandId]: normalizedHotkey,
      }));
      setHotkeyDraftsByTarget((previous) => ({
        ...previous,
        [currentTargetKey]: normalizedHotkey,
      }));

      const currentPreferences = readCommandPreferences();
      writeCommandPreferences(
        setCommandHotkey(currentPreferences, currentCommandId, normalizedHotkey),
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

    if (!currentTarget) {
      setAliasFeedback({
        tone: "error",
        text: "No item selected for alias registration.",
      });
      return;
    }

    if (currentTarget.kind === "command") {
      const aliasConflictCommandId = findAliasConflictCommandId(
        commandAliasesById,
        currentTarget.commandId,
        aliasValue,
      );
      if (aliasConflictCommandId) {
        setAliasFeedback({
          tone: "error",
          text: `"${aliasValue.trim()}" is already used by ${formatCommandName(
            aliasConflictCommandId,
            currentTarget.title,
            currentTarget.commandId,
          )}.`,
        });
        return;
      }
    }

    if (currentTarget.kind === "managed-item") {
      if (isManagedItemAliasReserved(currentTarget.item, aliasValue)) {
        setAliasFeedback({
          tone: "error",
          text: `"${aliasValue.trim()}" is reserved by another item.`,
        });
        return;
      }

      const aliasConflictManagedItemId = findManagedItemAliasConflictId(
        managedAliasesById,
        currentTarget.item,
        aliasValue,
      );
      if (aliasConflictManagedItemId) {
        setAliasFeedback({
          tone: "error",
          text: `"${aliasValue.trim()}" is already used by another item.`,
        });
        return;
      }
    }

    const normalizedAlias = aliasValue.trim();
    const nextAliases = normalizedAlias ? [normalizedAlias] : [];

    setSavingPage("alias");
    try {
      if (currentTarget.kind === "command") {
        const currentPreferences = readCommandPreferences();
        const nextPreferences = setCommandAliases(
          currentPreferences,
          currentTarget.commandId,
          nextAliases,
        );
        writeCommandPreferences(nextPreferences);
        setCommandAliasesById(nextPreferences.aliasesById);
      } else {
        setManagedAliases(currentTarget.item, nextAliases);
      }

      setAliasDraftsByTarget((previous) => ({
        ...previous,
        [currentTargetKey]: normalizedAlias,
      }));

      setAliasFeedback({
        tone: "success",
        text: getAliasSaveSuccessMessage(normalizedAlias),
      });
    } catch {
      setAliasFeedback({
        tone: "error",
        text: "Could not save this alias.",
      });
    }

    setSavingPage((previous) => (previous === "alias" ? null : previous));
  }

  useMountEffect(() => {
    const commandPreferences = readCommandPreferences();
    setCommandAliasesById(commandPreferences.aliasesById);
    setAliasFeedback(null);
    setHotkeyFeedback(null);

    let isCancelled = false;
    void getHotkeySettings()
      .then((settings) => {
        if (isCancelled) {
          return;
        }

        setHotkeyMap(settings.commandHotkeys);
      })
      .catch(() => {
        if (isCancelled) {
          return;
        }

        setHotkeyMap({});
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

      handleClosePanel();
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
        "absolute right-3 z-[60]",
        anchorMode === "self" ? "bottom-full" : "bottom-[42px]",
        "flex flex-col w-[360px] max-h-[min(380px,calc(100vh-88px))] overflow-hidden rounded-2xl",
        containerClassName,
      )}
    >
      <Command
        shouldFilter={false}
        smartPointerSelection
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
        className="flex flex-1 min-h-0 flex-col bg-transparent"
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
                <p className="truncate text-launcher-md font-medium text-foreground">
                  {panelTitle}
                </p>
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
            showItemDescriptions={showItemDescriptions}
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
                openNextPage(item.nextPageId, item.nextPageTarget ?? currentTarget);
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
              Boolean(currentCommandId) &&
              (hotkeyFeedback ?? hotkeyAvailability).tone !== "error"
            }
            feedback={hotkeyFeedback}
            availability={hotkeyAvailability}
            onHotkeyChange={(value) => {
              setHotkeyDraftsByTarget((previous) => ({
                ...previous,
                [currentTargetKey]: value,
              }));
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
              Boolean(currentCommandId || currentManagedTarget) &&
              (aliasFeedback ?? aliasAvailability).tone !== "error"
            }
            feedback={aliasFeedback}
            availability={aliasAvailability}
            onAliasChange={(value) => {
              setAliasDraftsByTarget((previous) => ({
                ...previous,
                [currentTargetKey]: value,
              }));
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
