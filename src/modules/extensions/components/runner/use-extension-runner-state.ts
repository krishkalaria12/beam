import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";

import { extensionSidecarService } from "@/modules/extensions/sidecar-service";
import {
  type ExtensionToast,
  type ExtensionUiNode,
  type RunningExtensionSession,
  useExtensionRuntimeStore,
} from "@/modules/extensions/runtime/store";
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
  handleBack: () => void;
  handleRootKeyDownCapture: (event: KeyboardEvent<HTMLDivElement>) => void;
  handleRootKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  handleSearchInputChange: (value: string) => void;
  handleSetFormValue: (field: FormField, value: FormValue) => void;
  handleBlurFormField: (field: FormField) => void;
  handleToastAction: (toastId: number, actionType: "primary" | "secondary") => void;
  handleToastHide: (toastId: number) => void;
  runPrimarySelectionAction: () => void;
  executeAction: (action: FlattenedAction) => Promise<void>;
  setSelectedIndex: (index: number) => void;
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

export function useExtensionRunnerState({
  onBack,
}: UseExtensionRunnerStateInput): UseExtensionRunnerStateResult {
  const uiTree = useExtensionRuntimeStore((state) => state.uiTree);
  const rootNodeId = useExtensionRuntimeStore((state) => state.rootNodeId);
  const toasts = useExtensionRuntimeStore((state) => state.toasts);
  const runningSession = useExtensionRuntimeStore((state) => state.runningSession);
  const setSelectedNodeId = useExtensionRuntimeStore((state) => state.setSelectedNodeId);

  const [searchText, setSearchText] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [formValues, setFormValues] = useState<Record<string, FormValue>>({});
  const [focusElementId, setFocusElementId] = useState<number | null>(null);
  const [resetElementId, setResetElementId] = useState<number | null>(null);
  const fieldRefs = useRef<Map<number, HTMLElement>>(new Map());

  const rootNode = rootNodeId ? uiTree.get(rootNodeId) : undefined;
  const rootType = rootNode?.type ?? "";

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

  useEffect(() => {
    if (rootNode?.type === "List" || rootNode?.type === "Grid") {
      setSearchText(asString(rootNode.props.searchText));
    } else {
      setSearchText("");
    }
  }, [rootNode?.id, rootNode?.type, rootNode?.props.searchText]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [rootNode?.id, currentEntries.length]);

  useEffect(() => {
    const cappedIndex = Math.min(selectedIndex, Math.max(0, currentEntries.length - 1));
    if (cappedIndex !== selectedIndex) {
      setSelectedIndex(cappedIndex);
    }
  }, [selectedIndex, currentEntries.length]);

  useEffect(() => {
    if ((rootNode?.type !== "List" && rootNode?.type !== "Grid") || !rootNode) {
      return;
    }

    const selectedItemId = asString(rootNode.props.selectedItemId).trim();
    if (!selectedItemId) {
      return;
    }

    const nextIndex = currentEntries.findIndex((entry) => entry.itemId === selectedItemId);
    if (nextIndex >= 0 && nextIndex !== selectedIndex) {
      setSelectedIndex(nextIndex);
    }
  }, [currentEntries, rootNode, rootNode?.props.selectedItemId, rootNode?.type, selectedIndex]);

  useEffect(() => {
    if (!selectedEntry) {
      setSelectedNodeId(undefined);
      if (
        (rootNode?.type === "List" || rootNode?.type === "Grid") &&
        asBoolean(rootNode.props.onSelectionChange)
      ) {
        extensionSidecarService.dispatchEvent(rootNode.id, "onSelectionChange", [null]);
      }
      return;
    }

    setSelectedNodeId(selectedEntry.nodeId);
    if (
      (rootNode?.type === "List" || rootNode?.type === "Grid") &&
      asBoolean(rootNode.props.onSelectionChange)
    ) {
      extensionSidecarService.dispatchEvent(rootNode.id, "onSelectionChange", [
        selectedEntry.itemId,
      ]);
    }
  }, [
    selectedEntry?.nodeId,
    selectedEntry?.itemId,
    rootNode?.id,
    rootNode?.type,
    rootNode?.props.onSelectionChange,
    setSelectedNodeId,
  ]);

  useEffect(() => {
    if (rootNode?.type !== "Form") {
      setFormValues({});
      return;
    }
    setFormValues(formInitialValues);
  }, [rootNode?.id, rootNode?.type, formInitialValues]);

  useEffect(() => {
    if (rootNode?.type !== "Form") {
      return;
    }

    setFormValues((previous) => {
      let changed = false;
      const next = { ...previous };

      for (const field of formFields) {
        if (field.controlledValue !== undefined) {
          if (next[field.key] !== field.controlledValue) {
            next[field.key] = field.controlledValue;
            changed = true;
          }
          continue;
        }

        if (!(field.key in next)) {
          next[field.key] = field.defaultValue;
          changed = true;
        }
      }

      return changed ? next : previous;
    });
  }, [rootNode?.type, formFields]);

  useEffect(() => {
    return extensionSidecarService.subscribe((event) => {
      if (event.type === "focus-element") {
        setFocusElementId(event.elementId);
      }
      if (event.type === "reset-element") {
        setResetElementId(event.elementId);
      }
    });
  }, []);

  useEffect(() => {
    if (!focusElementId) {
      return;
    }
    fieldRefs.current.get(focusElementId)?.focus();
  }, [focusElementId]);

  useEffect(() => {
    if (!resetElementId) {
      return;
    }
    const field = formFieldByNodeId.get(resetElementId);
    if (!field) {
      return;
    }
    setFormValues((previous) => ({
      ...previous,
      [field.key]: field.defaultValue,
    }));
    if (field.hasOnChange) {
      extensionSidecarService.dispatchEvent(field.nodeId, "onChange", [field.defaultValue]);
    }
  }, [resetElementId, formFieldByNodeId]);

  const handleBack = useCallback(() => {
    try {
      extensionSidecarService.popView();
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
            extensionSidecarService.dispatchEvent(action.nodeId, "onAction", [target]);
          } else {
            window.open(target, "_blank", "noopener,noreferrer");
          }
          return;
        }
      }

      if (action.type === "Action.CopyToClipboard") {
        const content = asString(action.props.content);
        if (content) {
          await navigator.clipboard.writeText(content);
        }
      }

      if (action.type === "Action.SubmitForm") {
        if (action.hasOnSubmit) {
          extensionSidecarService.dispatchEvent(action.nodeId, "onSubmit", [formValues]);
          return;
        }
        if (action.hasOnAction) {
          extensionSidecarService.dispatchEvent(action.nodeId, "onAction", [formValues]);
        }
        return;
      }

      if (action.hasOnAction) {
        extensionSidecarService.dispatchEvent(action.nodeId, "onAction");
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
      extensionSidecarService.dispatchEvent(selectedEntry.nodeId, "onAction");
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
      setSearchText(value);
      if (
        (rootType === "List" || rootType === "Grid") &&
        rootNode &&
        asBoolean(rootNode.props.onSearchTextChange)
      ) {
        extensionSidecarService.dispatchEvent(rootNode.id, "onSearchTextChange", [value]);
      }
    },
    [rootNode, rootType],
  );

  const handleSetFormValue = useCallback((field: FormField, value: FormValue) => {
    setFormValues((previous) => ({ ...previous, [field.key]: value }));
    if (field.hasOnChange) {
      extensionSidecarService.dispatchEvent(field.nodeId, "onChange", [value]);
    }
  }, []);

  const handleBlurFormField = useCallback(
    (field: FormField) => {
      if (!field.hasOnBlur) {
        return;
      }

      const currentValue = formValues[field.key];
      extensionSidecarService.dispatchEvent(field.nodeId, "onBlur", [
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
    extensionSidecarService.dispatchToastAction(toastId, actionType);
  }, []);

  const handleToastHide = useCallback((toastId: number) => {
    extensionSidecarService.triggerToastHide(toastId);
  }, []);

  const handleRootKeyDownCapture = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (isEditableTarget(event.target)) {
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

      if (
        event.key === "Enter" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey &&
        !event.altKey &&
        availableActions[0] &&
        !availableActions[0].shortcutDefinition
      ) {
        event.preventDefault();
        event.stopPropagation();
        void executeAction(availableActions[0]);
        return;
      }

      if (
        event.key === "Enter" &&
        event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey &&
        !event.altKey &&
        availableActions[1] &&
        !availableActions[1].shortcutDefinition
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
        if (event.key === "Enter") {
          if (availableActions.length === 0) {
            event.preventDefault();
            event.stopPropagation();
            runPrimarySelectionAction();
          }
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
        if (event.key === "Enter") {
          if (availableActions.length === 0) {
            event.preventDefault();
            event.stopPropagation();
            runPrimarySelectionAction();
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

  const registerFieldRef = useCallback((nodeId: number, element: HTMLElement | null) => {
    if (!element) {
      fieldRefs.current.delete(nodeId);
      return;
    }
    fieldRefs.current.set(nodeId, element);
  }, []);

  const dispatchNodeEvent = useCallback(
    (nodeId: number, handlerName: string, args: unknown[] = []) => {
      extensionSidecarService.dispatchEvent(nodeId, handlerName, args);
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
    handleBack,
    handleRootKeyDownCapture,
    handleRootKeyDown,
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
