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
  FormDescriptionEntry,
  FormField,
  FormValue,
  ListEntry,
} from "@/modules/extensions/components/runner/types";
import {
  asBoolean,
  asString,
  collectActions,
  collectFormDescriptions,
  collectFormFields,
  collectGridEntries,
  collectListEntries,
  renderDetailNode,
  type ListModel,
} from "@/modules/extensions/components/runner/utils";

interface UseExtensionRunnerStateInput {
  onBack: () => void;
}

interface UseExtensionRunnerStateResult {
  uiTree: Map<number, ExtensionUiNode>;
  rootNode: ExtensionUiNode | undefined;
  rootType: string;
  runningSession: RunningExtensionSession | null;
  listModel: ListModel | null;
  gridEntries: ListEntry[];
  formFields: FormField[];
  formDescriptions: FormDescriptionEntry[];
  formValues: Record<string, FormValue>;
  searchText: string;
  selectedIndex: number;
  currentEntries: ListEntry[];
  selectedEntry: ListEntry | undefined;
  selectedEntryActions: FlattenedAction[];
  rootActions: FlattenedAction[];
  detailContent: ReturnType<typeof renderDetailNode>;
  activeToast: ExtensionToast | undefined;
  handleBack: () => void;
  handleRootKeyDownCapture: (event: KeyboardEvent<HTMLDivElement>) => void;
  handleRootKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  handleSearchInputChange: (value: string) => void;
  handleSetFormValue: (field: FormField, value: FormValue) => void;
  handleToastAction: (toastId: number, actionType: "primary" | "secondary") => void;
  handleToastHide: (toastId: number) => void;
  runPrimarySelectionAction: () => void;
  executeAction: (action: FlattenedAction) => Promise<void>;
  setSelectedIndex: (index: number) => void;
  registerFieldRef: (nodeId: number, element: HTMLElement | null) => void;
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
  const formDescriptions = useMemo(
    () => (rootNode?.type === "Form" ? collectFormDescriptions(uiTree, rootNode) : []),
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
      const filtering = asBoolean(rootNode?.props.filtering, true);
      const query = searchText.trim().toLowerCase();
      if (!filtering || query.length === 0) {
        return entries;
      }
      return entries.filter((entry) => entry.keywords.includes(query));
    }
    if (rootType === "Grid") {
      const query = searchText.trim().toLowerCase();
      if (query.length === 0) {
        return gridEntries;
      }
      return gridEntries.filter((entry) => entry.keywords.includes(query));
    }
    return [];
  }, [rootType, listModel?.entries, gridEntries, rootNode?.props.filtering, searchText]);

  const selectedEntry = currentEntries[selectedIndex];
  const selectedEntryActions = useMemo(
    () => collectActions(uiTree, selectedEntry?.actionsNodeId),
    [uiTree, selectedEntry?.actionsNodeId],
  );
  const rootActions = useMemo(
    () =>
      collectActions(
        uiTree,
        rootNode?.namedChildren?.actions ?? listModel?.rootActionsNodeId,
      ),
    [uiTree, rootNode?.namedChildren?.actions, listModel?.rootActionsNodeId],
  );

  const detailNodeId = selectedEntry?.detailNodeId ?? rootNode?.namedChildren?.metadata;
  const detailContent = useMemo(() => renderDetailNode(uiTree, detailNodeId), [uiTree, detailNodeId]);
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
    if (!selectedEntry) {
      setSelectedNodeId(undefined);
      return;
    }

    setSelectedNodeId(selectedEntry.nodeId);
    if (rootNode?.type === "List" && asBoolean(rootNode.props.onSelectionChange)) {
      extensionSidecarService.dispatchEvent(rootNode.id, "onSelectionChange", [selectedEntry.itemId]);
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
  }, [executeAction, rootActions, selectedEntry?.hasOnAction, selectedEntry?.nodeId, selectedEntryActions]);

  const handleSearchInputChange = useCallback((value: string) => {
    setSearchText(value);
    if ((rootType === "List" || rootType === "Grid") && rootNode && asBoolean(rootNode.props.onSearchTextChange)) {
      extensionSidecarService.dispatchEvent(rootNode.id, "onSearchTextChange", [value]);
    }
  }, [rootNode, rootType]);

  const handleSetFormValue = useCallback((field: FormField, value: FormValue) => {
    setFormValues((previous) => ({ ...previous, [field.key]: value }));
    if (field.hasOnChange) {
      extensionSidecarService.dispatchEvent(field.nodeId, "onChange", [value]);
    }
  }, []);

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

  const handleRootKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (isEditableTarget(event.target)) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      handleBack();
      return;
    }

    if (rootType === "List" || rootType === "Grid") {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        event.stopPropagation();
        setSelectedIndex((previous) => Math.min(previous + 1, Math.max(0, currentEntries.length - 1)));
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        event.stopPropagation();
        setSelectedIndex((previous) => Math.max(previous - 1, 0));
      }
      if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        runPrimarySelectionAction();
      }
    }
  }, [currentEntries.length, handleBack, rootType, runPrimarySelectionAction]);

  const registerFieldRef = useCallback((nodeId: number, element: HTMLElement | null) => {
    if (!element) {
      fieldRefs.current.delete(nodeId);
      return;
    }
    fieldRefs.current.set(nodeId, element);
  }, []);

  return {
    uiTree,
    rootNode,
    rootType,
    runningSession,
    listModel,
    gridEntries,
    formFields,
    formDescriptions,
    formValues,
    searchText,
    selectedIndex,
    currentEntries,
    selectedEntry,
    selectedEntryActions,
    rootActions,
    detailContent,
    activeToast,
    handleBack,
    handleRootKeyDownCapture,
    handleRootKeyDown,
    handleSearchInputChange,
    handleSetFormValue,
    handleToastAction,
    handleToastHide,
    runPrimarySelectionAction,
    executeAction,
    setSelectedIndex,
    registerFieldRef,
  };
}
