import { useCallback, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { invoke } from "@tauri-apps/api/core";

import { copyToClipboard } from "@/modules/clipboard/api/copy-to-clipboard";
import { emitClipboardHistoryUpdated } from "@/modules/clipboard/lib/updates";
import { isLauncherActionsHotkey } from "@/lib/launcher-actions";
import { extensionManagerService } from "@/modules/extensions/extension-manager-service";
import {
  type ExtensionToast,
  type ExtensionUiNode,
  type RunningExtensionSession,
  useExtensionRuntimeStore,
} from "@/modules/extensions/runtime/store";
import { requestExtensionRunnerActionsToggle } from "@/modules/extensions/components/runner/runner-actions-toggle";
import type {
  FlattenedAction,
  FormField,
  FormValue,
  KeyboardShortcutDefinition,
  ListEntry,
} from "@/modules/extensions/components/runner/types";
import { asBoolean, asString } from "@/modules/extensions/components/runner/utils";
import { filterEntriesByQuery } from "@/modules/extensions/components/runner/search";
import { collectActions } from "@/modules/extensions/components/runner/nodes/actions/action-model";
import { collectFormFields } from "@/modules/extensions/components/runner/nodes/form/form-model";
import { collectGridEntries } from "@/modules/extensions/components/runner/nodes/grid/grid-model";
import {
  collectListEntries,
  type ListModel,
} from "@/modules/extensions/components/runner/nodes/list/list-model";
import { useMountEffect } from "@/hooks/use-mount-effect";

interface UseExtensionRunnerStateInput {
  onBack: () => void;
}

export interface UseExtensionRunnerStateResult {
  uiTree: Map<number, ExtensionUiNode>;
  rootNode: ExtensionUiNode | undefined;
  rootType: string;
  runningSession: RunningExtensionSession | null;
  listModel: ListModel | null;
  gridEntries: ListEntry[];
  formFields: FormField[];
  formFieldByNodeId: Map<number, FormField>;
  formValues: Record<string, FormValue>;
  searchText: string;
  selectedIndex: number;
  currentEntries: ListEntry[];
  selectedEntry: ListEntry | undefined;
  selectedEntryActions: FlattenedAction[];
  rootActions: FlattenedAction[];
  activeToast: ExtensionToast | undefined;
  selectionSync: {
    key: string;
    selectedNodeId?: number;
    rootNodeId?: number;
    selectedItemId: string | null;
    shouldDispatchSelectionChange: boolean;
  };
  handleBack: () => void;
  handleRootKeyDownCapture: (event: KeyboardEvent<HTMLDivElement>) => void;
  handleRootKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  handleSearchInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  handleSearchInputChange: (value: string) => void;
  handleSetFormValue: (field: FormField, value: FormValue) => void;
  handleBlurFormField: (field: FormField) => void;
  handleToastAction: (toastId: number, actionType: "primary" | "secondary") => void;
  handleToastHide: (toastId: number) => void;
  runPrimarySelectionAction: () => void;
  executeAction: (action: FlattenedAction) => Promise<void>;
  setSelectedIndex: (index: number | ((previous: number) => number)) => void;
  registerFieldRef: (nodeId: number, element: HTMLElement | null) => void;
  dispatchNodeEvent: (nodeId: number, handlerName: string, args?: unknown[]) => void;
}

function isEditableTarget(target: EventTarget | null): target is HTMLElement {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  ) {
    return true;
  }

  return target.isContentEditable;
}

function isExtensionSearchInputTarget(target: EventTarget | null): target is HTMLElement {
  return target instanceof HTMLElement && target.dataset.moduleSearchInput === "true";
}

function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  return /mac/i.test(navigator.platform);
}

function keyMatchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcutDefinition): boolean {
  if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) {
    return false;
  }

  const required = new Set(shortcut.modifiers);
  const isMac = isMacPlatform();
  const expectMeta = isMac ? required.has("cmd") : false;
  const expectCtrl = isMac ? required.has("ctrl") : required.has("cmd") || required.has("ctrl");
  const expectAlt = required.has("opt");
  const expectShift = required.has("shift");

  return (
    event.metaKey === expectMeta &&
    event.ctrlKey === expectCtrl &&
    event.altKey === expectAlt &&
    event.shiftKey === expectShift
  );
}

function readApplicationTarget(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (!value || typeof value !== "object") {
    return undefined;
  }

  const candidate = value as { path?: unknown; name?: unknown };
  if (typeof candidate.path === "string" && candidate.path.trim().length > 0) {
    return candidate.path.trim();
  }
  if (typeof candidate.name === "string" && candidate.name.trim().length > 0) {
    return candidate.name.trim();
  }
  return undefined;
}

function readClipboardText(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : "";
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (!value || typeof value !== "object") {
    return undefined;
  }

  const candidate = value as { text?: unknown; html?: unknown; file?: unknown };
  if (typeof candidate.text === "string") {
    return candidate.text;
  }
  if (typeof candidate.html === "string") {
    return candidate.html;
  }
  if (typeof candidate.file === "string") {
    return candidate.file;
  }
  return undefined;
}

export function useExtensionRunnerState({
  onBack,
}: UseExtensionRunnerStateInput): UseExtensionRunnerStateResult {
  const uiTree = useExtensionRuntimeStore((state) => state.uiTree);
  const rootNodeId = useExtensionRuntimeStore((state) => state.rootNodeId);
  const toasts = useExtensionRuntimeStore((state) => state.toasts);
  const runningSession = useExtensionRuntimeStore((state) => state.runningSession);

  const [searchState, setSearchState] = useState<{ key: string; value: string }>({
    key: "",
    value: "",
  });
  const [selectionState, setSelectionState] = useState<{ key: string; index: number }>({
    key: "",
    index: 0,
  });
  const [formState, setFormState] = useState<{
    key: string;
    values: Record<string, FormValue>;
  }>({
    key: "",
    values: {},
  });
  const [focusElementId, setFocusElementId] = useState<number | null>(null);
  const fieldRefs = useRef<Map<number, HTMLElement>>(new Map());
  const pendingControlledSearchTextRef = useRef<{ key: string; value: string } | null>(null);

  const rootNode = rootNodeId ? uiTree.get(rootNodeId) : undefined;
  const rootType = rootNode?.type ?? "";
  const isSearchableRoot = rootType === "List" || rootType === "Grid";
  const controlledSearchText = isSearchableRoot && rootNode ? asString(rootNode.props.searchText) : "";
  const isControlledSearch =
    isSearchableRoot && rootNode ? asBoolean(rootNode.props.onSearchTextChange) : false;
  const searchStateKey = `${rootNode?.id ?? 0}:${rootType}`;
  const localSearchText = searchState.key === searchStateKey ? searchState.value : controlledSearchText;
  const pendingSearchText =
    pendingControlledSearchTextRef.current?.key === searchStateKey
      ? pendingControlledSearchTextRef.current.value
      : null;
  if (pendingSearchText !== null && controlledSearchText === pendingSearchText) {
    pendingControlledSearchTextRef.current = null;
  }
  const shouldUsePendingSearchText =
    pendingSearchText !== null &&
    localSearchText === pendingSearchText &&
    controlledSearchText !== pendingSearchText;
  const searchText =
    !isSearchableRoot
      ? ""
      : isControlledSearch && !shouldUsePendingSearchText
        ? controlledSearchText
        : localSearchText;

  const listModel = useMemo(
    () => (rootNode?.type === "List" ? collectListEntries(uiTree, rootNode) : null),
    [uiTree, rootNode],
  );
  const gridEntries = useMemo(
    () => (rootNode?.type === "Grid" ? collectGridEntries(uiTree, rootNode) : []),
    [uiTree, rootNode],
  );
  const formFields = useMemo(
    () => (rootNode?.type === "Form" ? collectFormFields(uiTree, rootNode) : []),
    [uiTree, rootNode],
  );

  const formFieldByNodeId = useMemo(() => {
    const map = new Map<number, FormField>();
    for (const field of formFields) {
      map.set(field.nodeId, field);
    }
    return map;
  }, [formFields]);

  const formInitialValues = useMemo(() => {
    const next: Record<string, FormValue> = {};
    for (const field of formFields) {
      next[field.key] = field.defaultValue;
    }
    return next;
  }, [formFields]);
  const seededFormValues = useMemo(() => {
    if (rootNode?.type !== "Form") {
      return {};
    }

    const next = { ...formInitialValues };
    for (const field of formFields) {
      if (field.controlledValue !== undefined) {
        next[field.key] = field.controlledValue;
      }
    }
    return next;
  }, [formFields, formInitialValues, rootNode?.type]);
  const formStateKey = useMemo(
    () =>
      rootNode?.type === "Form"
        ? `${rootNode.id}:${formFields
            .map((field) => `${field.nodeId}:${JSON.stringify(field.controlledValue ?? null)}`)
            .join("|")}`
        : "",
    [formFields, rootNode?.id, rootNode?.type],
  );
  const formEdits = formState.key === formStateKey ? formState.values : {};
  const formValues = useMemo(() => {
    if (rootNode?.type !== "Form") {
      return {};
    }

    const next = { ...seededFormValues };
    for (const field of formFields) {
      if (field.key in formEdits) {
        next[field.key] = formEdits[field.key];
      }
      if (field.controlledValue !== undefined) {
        next[field.key] = field.controlledValue;
      }
    }
    return next;
  }, [formEdits, formFields, rootNode?.type, seededFormValues]);

  const currentEntries = useMemo(() => {
    if (rootType === "List") {
      const entries = listModel?.entries ?? [];
      const filtering =
        asBoolean(rootNode?.props.filtering) ||
        (rootNode?.props.filtering !== false && !asBoolean(rootNode?.props.onSearchTextChange));
      const query = searchText.trim().toLowerCase();
      if (!filtering || query.length === 0) {
        return entries;
      }
      return filterEntriesByQuery(entries, query);
    }
    if (rootType === "Grid") {
      const filtering =
        asBoolean(rootNode?.props.filtering) ||
        (rootNode?.props.filtering !== false && !asBoolean(rootNode?.props.onSearchTextChange));
      const query = searchText.trim().toLowerCase();
      if (!filtering || query.length === 0) {
        return gridEntries;
      }
      return filterEntriesByQuery(gridEntries, query);
    }
    return [];
  }, [
    rootType,
    listModel?.entries,
    gridEntries,
    rootNode?.props.filtering,
    rootNode?.props.onSearchTextChange,
    searchText,
  ]);
  const controlledSelectedIndex = useMemo(() => {
    if (!rootNode || (rootType !== "List" && rootType !== "Grid")) {
      return -1;
    }

    const selectedItemId = asString(rootNode.props.selectedItemId).trim();
    if (!selectedItemId) {
      return -1;
    }

    return currentEntries.findIndex((entry) => entry.itemId === selectedItemId);
  }, [currentEntries, rootNode, rootType]);
  const selectionStateKey = `${rootNode?.id ?? 0}:${currentEntries.length}`;
  const uncontrolledSelectedIndex =
    selectionState.key === selectionStateKey ? selectionState.index : 0;
  const selectedIndex = Math.min(
    controlledSelectedIndex >= 0 ? controlledSelectedIndex : uncontrolledSelectedIndex,
    Math.max(0, currentEntries.length - 1),
  );
  const setSelectedIndex = useCallback(
    (value: number | ((previous: number) => number)) => {
      setSelectionState((previous) => ({
        key: selectionStateKey,
        index:
          typeof value === "function"
            ? value(previous.key === selectionStateKey ? previous.index : 0)
            : value,
      }));
    },
    [selectionStateKey],
  );

  const selectedEntry = currentEntries[selectedIndex];
  const selectedEntryActions = useMemo(
    () => collectActions(uiTree, selectedEntry?.actionsNodeId),
    [uiTree, selectedEntry?.actionsNodeId],
  );
  const rootActions = useMemo(
    () => collectActions(uiTree, rootNode?.namedChildren?.actions ?? listModel?.rootActionsNodeId),
    [uiTree, rootNode?.namedChildren?.actions, listModel?.rootActionsNodeId],
  );

  const activeToast = useMemo(
    () =>
      toasts.reduce<ExtensionToast | undefined>(
        (latest, entry) => (latest && latest.id > entry.id ? latest : entry),
        undefined,
      ),
    [toasts],
  );
  const selectionSync = useMemo(
    () => ({
      key: `${rootNode?.id ?? 0}:${selectedEntry?.nodeId ?? ""}:${selectedEntry?.itemId ?? ""}:${rootType === "List" || rootType === "Grid" ? Number(asBoolean(rootNode?.props.onSelectionChange)) : 0}`,
      selectedNodeId: selectedEntry?.nodeId,
      rootNodeId:
        rootNode && (rootType === "List" || rootType === "Grid") ? rootNode.id : undefined,
      selectedItemId: selectedEntry?.itemId ?? null,
      shouldDispatchSelectionChange:
        !!rootNode &&
        (rootType === "List" || rootType === "Grid") &&
        asBoolean(rootNode.props.onSelectionChange),
    }),
    [rootNode, rootType, selectedEntry?.itemId, selectedEntry?.nodeId],
  );

  const formFieldByNodeIdRef = useRef(formFieldByNodeId);
  const formStateKeyRef = useRef(formStateKey);
  const rootNodeRef = useRef(rootNode);
  const searchStateKeyRef = useRef(searchStateKey);
  formFieldByNodeIdRef.current = formFieldByNodeId;
  formStateKeyRef.current = formStateKey;
  rootNodeRef.current = rootNode;
  searchStateKeyRef.current = searchStateKey;

  useMountEffect(() => {
    return extensionManagerService.subscribe((event) => {
      if (event.type === "focus-element") {
        setFocusElementId(event.elementId);
        fieldRefs.current.get(event.elementId)?.focus();
      }
      if (event.type === "reset-element") {
        const field = formFieldByNodeIdRef.current.get(event.elementId);
        if (!field) {
          return;
        }
        setFormState((previous) => ({
          key: formStateKeyRef.current,
          values: {
            ...(previous.key === formStateKeyRef.current ? previous.values : {}),
            [field.key]: field.defaultValue,
          },
        }));
        if (field.hasOnChange) {
          extensionManagerService.dispatchEvent(field.nodeId, "onChange", [field.defaultValue]);
        }
      }
      if (event.type === "clear-search-bar") {
        pendingControlledSearchTextRef.current = null;
        setSearchState({ key: searchStateKeyRef.current, value: "" });
        if (
          (rootNodeRef.current?.type === "List" || rootNodeRef.current?.type === "Grid") &&
          asBoolean(rootNodeRef.current.props.onSearchTextChange)
        ) {
          extensionManagerService.dispatchEvent(rootNodeRef.current.id, "onSearchTextChange", [""]);
        }
      }
    });
  });

  const handleBack = useCallback(() => {
    try {
      extensionManagerService.popView();
    } catch {
      onBack();
    }
  }, [onBack]);

  const executeAction = useCallback(
    async (action: FlattenedAction) => {
      if (action.type === "Action.OpenInBrowser") {
        const target = asString(action.props.url, asString(action.props.target));
        if (target) {
          if (action.hasOnAction) {
            extensionManagerService.dispatchEvent(action.nodeId, "onAction", [target]);
          } else {
            extensionManagerService.open(target);
          }
          return;
        }
      }

      if (action.type === "Action.Open") {
        const target = asString(action.props.target, asString(action.props.url));
        if (target) {
          if (action.hasOnAction) {
            extensionManagerService.dispatchEvent(action.nodeId, "onAction", [target]);
          } else {
            extensionManagerService.open(target, readApplicationTarget(action.props.application));
          }
          return;
        }
      }

      if (action.type === "Action.ShowInFinder") {
        const target = asString(action.props.path, asString(action.props.target));
        if (target) {
          if (action.hasOnAction) {
            extensionManagerService.dispatchEvent(action.nodeId, "onAction", [target]);
          } else {
            await invoke("show_in_finder", { path: target });
          }
          return;
        }
      }

      if (action.type === "Action.RunInTerminal") {
        if (action.hasOnAction) {
          extensionManagerService.dispatchEvent(action.nodeId, "onAction");
        } else {
          console.warn("[extensions-runner] Action.RunInTerminal is unsupported without onAction");
        }
        return;
      }

      if (action.type === "Action.CreateQuicklink") {
        if (action.hasOnAction) {
          extensionManagerService.dispatchEvent(action.nodeId, "onAction");
        } else {
          console.warn(
            "[extensions-runner] Action.CreateQuicklink is unsupported without onAction",
          );
        }
        return;
      }

      if (action.type === "Action.CopyToClipboard") {
        if (action.hasOnAction) {
          extensionManagerService.dispatchEvent(action.nodeId, "onAction");
          return;
        }
        const content = readClipboardText(action.props.content);
        if (content !== undefined) {
          await copyToClipboard(content, false);
        }
        return;
      }

      if (action.type === "Action.Paste") {
        if (action.hasOnAction) {
          extensionManagerService.dispatchEvent(action.nodeId, "onAction");
          return;
        }
        const content = readClipboardText(action.props.content);
        if (content !== undefined) {
          await invoke("clipboard_paste", { content: { text: content } });
          emitClipboardHistoryUpdated();
        }
        return;
      }

      if (action.type === "Action.SubmitForm") {
        if (action.hasOnSubmit) {
          extensionManagerService.dispatchEvent(action.nodeId, "onSubmit", [formValues]);
          return;
        }
        if (action.hasOnAction) {
          extensionManagerService.dispatchEvent(action.nodeId, "onAction", [formValues]);
        }
        return;
      }

      if (action.hasOnAction) {
        extensionManagerService.dispatchEvent(action.nodeId, "onAction");
      }
    },
    [formValues],
  );

  const runPrimarySelectionAction = useCallback(() => {
    const primaryAction = selectedEntryActions[0] ?? rootActions[0];
    if (primaryAction) {
      void executeAction(primaryAction);
      return;
    }
    if (selectedEntry?.hasOnAction) {
      extensionManagerService.dispatchEvent(selectedEntry.nodeId, "onAction");
    }
  }, [
    executeAction,
    rootActions,
    selectedEntry?.hasOnAction,
    selectedEntry?.nodeId,
    selectedEntryActions,
  ]);

  const handleSearchInputChange = useCallback(
    (value: string) => {
      setSearchState({ key: searchStateKey, value });
      if (
        (rootType === "List" || rootType === "Grid") &&
        rootNode &&
        asBoolean(rootNode.props.onSearchTextChange)
      ) {
        pendingControlledSearchTextRef.current = { key: searchStateKey, value };
        extensionManagerService.dispatchEvent(rootNode.id, "onSearchTextChange", [value]);
      }
    },
    [rootNode, rootType, searchStateKey],
  );

  const handleSetFormValue = useCallback(
    (field: FormField, value: FormValue) => {
      setFormState((previous) => ({
        key: formStateKey,
        values: {
          ...(previous.key === formStateKey ? previous.values : {}),
          [field.key]: value,
        },
      }));
      if (field.hasOnChange) {
        extensionManagerService.dispatchEvent(field.nodeId, "onChange", [value]);
      }
    },
    [formStateKey],
  );

  const handleBlurFormField = useCallback(
    (field: FormField) => {
      if (!field.hasOnBlur) {
        return;
      }

      const currentValue = formValues[field.key];
      extensionManagerService.dispatchEvent(field.nodeId, "onBlur", [
        {
          type: "blur",
          target: {
            id: field.key,
            value: currentValue,
          },
        },
      ]);
    },
    [formValues],
  );

  const handleToastAction = useCallback((toastId: number, actionType: "primary" | "secondary") => {
    extensionManagerService.dispatchToastAction(toastId, actionType);
  }, []);

  const handleToastHide = useCallback((toastId: number) => {
    extensionManagerService.triggerToastHide(toastId);
  }, []);

  const handleRootKeyDownCapture = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (isEditableTarget(event.target) && !isExtensionSearchInputTarget(event.target)) {
      event.stopPropagation();
    }
  }, []);

  const handleRootKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        handleBack();
        return;
      }

      const availableActions = selectedEntryActions.length > 0 ? selectedEntryActions : rootActions;

      if (availableActions.length > 0 && isLauncherActionsHotkey(event)) {
        event.preventDefault();
        event.stopPropagation();
        requestExtensionRunnerActionsToggle();
        return;
      }

      if (
        event.key === "Enter" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey &&
        !event.altKey
      ) {
        event.preventDefault();
        event.stopPropagation();
        runPrimarySelectionAction();
        return;
      }

      if (
        event.key === "Enter" &&
        event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey &&
        !event.altKey &&
        availableActions[1]
      ) {
        event.preventDefault();
        event.stopPropagation();
        void executeAction(availableActions[1]);
        return;
      }

      for (const action of availableActions) {
        if (!action.shortcutDefinition) {
          continue;
        }
        if (keyMatchesShortcut(event, action.shortcutDefinition)) {
          event.preventDefault();
          event.stopPropagation();
          void executeAction(action);
          return;
        }
      }

      if (rootType === "List") {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          event.stopPropagation();
          setSelectedIndex((previous) =>
            Math.min(previous + 1, Math.max(0, currentEntries.length - 1)),
          );
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          event.stopPropagation();
          setSelectedIndex((previous) => Math.max(previous - 1, 0));
        }
        return;
      }

      if (rootType === "Grid") {
        if (currentEntries.length === 0) {
          return;
        }

        const sectionOrder: Array<number | "root"> = [];
        const sectionIndexByKey = new Map<number | "root", number>();
        const rowsBySection = new Map<number, number[]>();
        const positionedEntries: Array<{
          index: number;
          sectionIndex: number;
          rowIndex: number;
          colIndex: number;
        }> = [];

        let lastSectionKey: number | "root" | null = null;
        let rowIndex = 0;
        let colIndex = 0;
        let sectionColumns = 6;

        currentEntries.forEach((entry, index) => {
          const sectionKey = entry.sectionNodeId ?? "root";
          if (sectionKey !== lastSectionKey) {
            lastSectionKey = sectionKey;
            rowIndex = 0;
            colIndex = 0;
            sectionColumns =
              typeof entry.gridColumns === "number" &&
              Number.isFinite(entry.gridColumns) &&
              entry.gridColumns > 0
                ? Math.max(1, Math.floor(entry.gridColumns))
                : 6;

            if (!sectionIndexByKey.has(sectionKey)) {
              const nextSectionIndex = sectionOrder.length;
              sectionIndexByKey.set(sectionKey, nextSectionIndex);
              sectionOrder.push(sectionKey);
            }
          } else if (colIndex >= sectionColumns) {
            rowIndex += 1;
            colIndex = 0;
          }

          const sectionIndex = sectionIndexByKey.get(sectionKey)!;
          positionedEntries.push({
            index,
            sectionIndex,
            rowIndex,
            colIndex,
          });

          const sectionRows = rowsBySection.get(sectionIndex) ?? [];
          if (!sectionRows.includes(rowIndex)) {
            sectionRows.push(rowIndex);
            rowsBySection.set(sectionIndex, sectionRows);
          }

          colIndex += 1;
        });

        const selectedPosition = positionedEntries[selectedIndex] ?? positionedEntries[0];
        if (!selectedPosition) {
          return;
        }

        if (event.key === "ArrowRight") {
          event.preventDefault();
          event.stopPropagation();
          setSelectedIndex((previous) =>
            Math.min(previous + 1, Math.max(0, currentEntries.length - 1)),
          );
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          event.stopPropagation();
          setSelectedIndex((previous) => Math.max(previous - 1, 0));
        }
        if (event.key === "ArrowDown") {
          event.preventDefault();
          event.stopPropagation();
          const direction = 1;
          let targetSection = selectedPosition.sectionIndex;
          let targetRow = selectedPosition.rowIndex + direction;
          let nextIndex = -1;

          while (nextIndex < 0) {
            const rowCandidates = positionedEntries.filter(
              (entry) => entry.sectionIndex === targetSection && entry.rowIndex === targetRow,
            );

            if (rowCandidates.length > 0) {
              const matchingColumn =
                rowCandidates.find((entry) => entry.colIndex === selectedPosition.colIndex) ??
                rowCandidates[rowCandidates.length - 1];
              nextIndex = matchingColumn.index;
              break;
            }

            targetSection += direction;
            if (targetSection >= sectionOrder.length) {
              break;
            }

            const rows = rowsBySection.get(targetSection);
            if (!rows || rows.length === 0) {
              break;
            }
            targetRow = Math.min(...rows);
          }

          if (nextIndex >= 0) {
            setSelectedIndex(nextIndex);
          }
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          event.stopPropagation();
          const direction = -1;
          let targetSection = selectedPosition.sectionIndex;
          let targetRow = selectedPosition.rowIndex + direction;
          let nextIndex = -1;

          while (nextIndex < 0) {
            const rowCandidates = positionedEntries.filter(
              (entry) => entry.sectionIndex === targetSection && entry.rowIndex === targetRow,
            );

            if (rowCandidates.length > 0) {
              const matchingColumn =
                rowCandidates.find((entry) => entry.colIndex === selectedPosition.colIndex) ??
                rowCandidates[rowCandidates.length - 1];
              nextIndex = matchingColumn.index;
              break;
            }

            targetSection += direction;
            if (targetSection < 0) {
              break;
            }

            const rows = rowsBySection.get(targetSection);
            if (!rows || rows.length === 0) {
              break;
            }
            targetRow = Math.max(...rows);
          }

          if (nextIndex >= 0) {
            setSelectedIndex(nextIndex);
          }
        }
      }
    },
    [
      currentEntries,
      executeAction,
      handleBack,
      rootActions,
      rootType,
      runPrimarySelectionAction,
      selectedEntryActions,
      selectedIndex,
    ],
  );

  const handleSearchInputKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      const availableActions = selectedEntryActions.length > 0 ? selectedEntryActions : rootActions;

      if (event.key === "Escape" && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        event.stopPropagation();
        if (searchText.trim().length > 0) {
          handleSearchInputChange("");
          return;
        }

        handleBack();
        return;
      }

      if (availableActions.length > 0 && isLauncherActionsHotkey(event)) {
        event.preventDefault();
        event.stopPropagation();
        requestExtensionRunnerActionsToggle();
        return;
      }

      if (
        event.key === "Enter" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey &&
        !event.altKey
      ) {
        event.preventDefault();
        event.stopPropagation();
        runPrimarySelectionAction();
        return;
      }

      if (
        event.key === "Enter" &&
        event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey &&
        !event.altKey &&
        availableActions[1]
      ) {
        event.preventDefault();
        event.stopPropagation();
        void executeAction(availableActions[1]);
        return;
      }

      for (const action of availableActions) {
        if (!action.shortcutDefinition) {
          continue;
        }
        if (keyMatchesShortcut(event, action.shortcutDefinition)) {
          event.preventDefault();
          event.stopPropagation();
          void executeAction(action);
          return;
        }
      }
    },
    [
      executeAction,
      handleBack,
      handleSearchInputChange,
      rootActions,
      runPrimarySelectionAction,
      searchText,
      selectedEntryActions,
    ],
  );

  const registerFieldRef = useCallback((nodeId: number, element: HTMLElement | null) => {
    if (!element) {
      fieldRefs.current.delete(nodeId);
      return;
    }
    fieldRefs.current.set(nodeId, element);
    if (focusElementId === nodeId) {
      element.focus();
    }
  }, [focusElementId]);

  const dispatchNodeEvent = useCallback(
    (nodeId: number, handlerName: string, args: unknown[] = []) => {
      extensionManagerService.dispatchEvent(nodeId, handlerName, args);
    },
    [],
  );

  return {
    uiTree,
    rootNode,
    rootType,
    runningSession,
    listModel,
    gridEntries,
    formFields,
    formFieldByNodeId,
    formValues,
    searchText,
    selectedIndex,
    currentEntries,
    selectedEntry,
    selectedEntryActions,
    rootActions,
    activeToast,
    selectionSync,
    handleBack,
    handleRootKeyDownCapture,
    handleRootKeyDown,
    handleSearchInputKeyDown,
    handleSearchInputChange,
    handleSetFormValue,
    handleBlurFormField,
    handleToastAction,
    handleToastHide,
    runPrimarySelectionAction,
    executeAction,
    setSelectedIndex,
    registerFieldRef,
    dispatchNodeEvent,
  };
}
