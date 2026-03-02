import { create } from "zustand";
import type { Command as ProtocolCommand } from "@flare/protocol";

export interface ExtensionUiNode {
  id: number;
  type: string;
  props: Record<string, unknown>;
  children: number[];
  namedChildren?: Record<string, number>;
  text?: string;
}

export interface ExtensionToast {
  id: number;
  title: string;
  message?: string;
  style?: "SUCCESS" | "FAILURE" | "ANIMATED";
  primaryAction?: {
    title: string;
    onAction: boolean;
    shortcut?: {
      modifiers: Array<"cmd" | "ctrl" | "opt" | "shift">;
      key: string;
    };
  };
  secondaryAction?: {
    title: string;
    onAction: boolean;
    shortcut?: {
      modifiers: Array<"cmd" | "ctrl" | "opt" | "shift">;
      key: string;
    };
  };
}

export interface RunningExtensionSession {
  pluginPath: string;
  pluginMode: "view" | "no-view";
  title: string;
  subtitle?: string;
}

interface ExtensionRuntimeState {
  uiTree: Map<number, ExtensionUiNode>;
  rootNodeId: number | null;
  selectedNodeId?: number;
  toasts: ExtensionToast[];
  runningSession: RunningExtensionSession | null;
  resetForNewPlugin: (session: RunningExtensionSession) => void;
  resetRuntime: () => void;
  applyCommands: (commands: ProtocolCommand[]) => void;
  setSelectedNodeId: (nodeId?: number) => void;
  upsertToast: (toast: ExtensionToast) => void;
  updateToast: (toastId: number, partial: Partial<ExtensionToast>) => void;
  hideToast: (toastId: number) => void;
}

interface PropTemplate {
  props: Record<string, unknown>;
  namedChildren?: Record<string, number>;
}

const propTemplates = new Map<number, PropTemplate>();

function cloneNode(node: ExtensionUiNode): ExtensionUiNode {
  return {
    ...node,
    props: { ...node.props },
    children: [...node.children],
    namedChildren: node.namedChildren ? { ...node.namedChildren } : undefined,
    text: node.text,
  };
}

type MutableNodeAccessor = (id: number) => ExtensionUiNode | undefined;

function processCommand(
  command: ProtocolCommand,
  tempTree: Map<number, ExtensionUiNode>,
  tempState: {
    rootNodeId: number | null;
    toasts: ExtensionToast[];
  },
  getMutableNode: MutableNodeAccessor,
) {
  switch (command.type) {
    case "DEFINE_PROPS_TEMPLATE": {
      const { templateId, props, namedChildren } = command.payload;
      propTemplates.set(templateId, { props, namedChildren });
      break;
    }
    case "APPLY_PROPS_TEMPLATE": {
      const { templateId, targetIds } = command.payload;
      const template = propTemplates.get(templateId);
      if (!template) {
        break;
      }
      for (const targetId of targetIds) {
        const node = getMutableNode(targetId);
        if (!node) {
          continue;
        }
        Object.assign(node.props, template.props);
        if (template.namedChildren) {
          node.namedChildren = { ...template.namedChildren };
        }
      }
      break;
    }
    case "REPLACE_CHILDREN": {
      const parentId = command.payload.parentId;
      if (parentId === "root") {
        tempState.rootNodeId = command.payload.childrenIds[0] ?? null;
        break;
      }
      if (typeof parentId !== "number") {
        break;
      }

      const parentNode = getMutableNode(parentId);
      if (parentNode) {
        parentNode.children = [...command.payload.childrenIds];
      }
      break;
    }
    case "CREATE_INSTANCE": {
      const { id, type, props, children, namedChildren } = command.payload;
      tempTree.set(id, {
        id,
        type,
        props: { ...props },
        children: children ? [...children] : [],
        namedChildren: namedChildren ? { ...namedChildren } : undefined,
      });
      break;
    }
    case "CREATE_TEXT_INSTANCE": {
      const { id, text } = command.payload;
      tempTree.set(id, {
        id,
        type: "TEXT",
        props: {},
        children: [],
        text,
      });
      break;
    }
    case "UPDATE_PROPS": {
      const { id, props, namedChildren } = command.payload;
      const node = getMutableNode(id);
      if (!node) {
        break;
      }

      Object.assign(node.props, props);
      if (namedChildren) {
        node.namedChildren = { ...namedChildren };
      }
      break;
    }
    case "APPEND_CHILD": {
      const { parentId, childId } = command.payload;
      if (parentId === "root") {
        tempState.rootNodeId = childId;
        break;
      }

      const parentNode = getMutableNode(parentId);
      if (!parentNode) {
        break;
      }
      const existingIndex = parentNode.children.indexOf(childId);
      if (existingIndex >= 0) {
        parentNode.children.splice(existingIndex, 1);
      }
      parentNode.children.push(childId);
      break;
    }
    case "REMOVE_CHILD": {
      const { parentId, childId } = command.payload;
      if (parentId === "root") {
        if (tempState.rootNodeId === childId) {
          tempState.rootNodeId = null;
        }
        break;
      }

      const parentNode = getMutableNode(parentId);
      if (!parentNode) {
        break;
      }
      const removeIndex = parentNode.children.indexOf(childId);
      if (removeIndex >= 0) {
        parentNode.children.splice(removeIndex, 1);
      }
      break;
    }
    case "INSERT_BEFORE": {
      const { parentId, childId, beforeId } = command.payload;
      if (parentId === "root") {
        tempState.rootNodeId = childId;
        break;
      }

      const parentNode = getMutableNode(parentId);
      if (!parentNode) {
        break;
      }

      const oldIndex = parentNode.children.indexOf(childId);
      if (oldIndex >= 0) {
        parentNode.children.splice(oldIndex, 1);
      }
      const beforeIndex = parentNode.children.indexOf(beforeId);
      if (beforeIndex >= 0) {
        parentNode.children.splice(beforeIndex, 0, childId);
      } else {
        parentNode.children.push(childId);
      }
      break;
    }
    case "SHOW_TOAST": {
      const toast = command.payload as ExtensionToast;
      const existingIndex = tempState.toasts.findIndex((entry) => entry.id === toast.id);
      if (existingIndex >= 0) {
        tempState.toasts[existingIndex] = toast;
      } else {
        tempState.toasts.push(toast);
      }
      break;
    }
    case "UPDATE_TOAST": {
      const { id, ...rest } = command.payload;
      const existingIndex = tempState.toasts.findIndex((entry) => entry.id === id);
      if (existingIndex >= 0) {
        tempState.toasts[existingIndex] = {
          ...tempState.toasts[existingIndex],
          ...rest,
        };
      }
      break;
    }
    case "HIDE_TOAST": {
      tempState.toasts = tempState.toasts.filter((entry) => entry.id !== command.payload.id);
      break;
    }
    case "CLEAR_CONTAINER": {
      // Flare sidecar emits CLEAR_CONTAINER in the same batch as fresh CREATE_INSTANCE
      // commands for initial render; applying a hard clear here can erase the new tree.
      // Runtime reset is already handled when launching a new plugin session.
      break;
    }
    case "UPDATE_TEXT": {
      const { id, text } = command.payload;
      const node = getMutableNode(id);
      if (!node) {
        break;
      }
      node.text = text;
      break;
    }
    default:
      break;
  }
}

export const useExtensionRuntimeStore = create<ExtensionRuntimeState>((set, get) => ({
  uiTree: new Map(),
  rootNodeId: null,
  selectedNodeId: undefined,
  toasts: [],
  runningSession: null,
  resetForNewPlugin: (session) => {
    propTemplates.clear();
    set({
      uiTree: new Map(),
      rootNodeId: null,
      selectedNodeId: undefined,
      runningSession: session,
    });
  },
  resetRuntime: () => {
    propTemplates.clear();
    set({
      uiTree: new Map(),
      rootNodeId: null,
      selectedNodeId: undefined,
      runningSession: null,
    });
  },
  applyCommands: (commands) => {
    if (!commands.length) {
      return;
    }

    const currentState = get();
    const tempTree = new Map(currentState.uiTree);
    const tempState = {
      rootNodeId: currentState.rootNodeId,
      toasts: [...currentState.toasts],
    };
    const mutatedNodeIds = new Set<number>();
    const getMutableNode: MutableNodeAccessor = (id) => {
      if (mutatedNodeIds.has(id)) {
        return tempTree.get(id);
      }

      const existingNode = tempTree.get(id);
      if (!existingNode) {
        return undefined;
      }
      const cloned = cloneNode(existingNode);
      tempTree.set(id, cloned);
      mutatedNodeIds.add(id);
      return cloned;
    };

    for (const command of commands) {
      processCommand(command, tempTree, tempState, getMutableNode);
    }

    set((previous) => ({
      ...previous,
      uiTree: tempTree,
      rootNodeId: tempState.rootNodeId,
      toasts: tempState.toasts,
    }));
  },
  setSelectedNodeId: (nodeId) => {
    set({ selectedNodeId: nodeId });
  },
  upsertToast: (toast) => {
    set((state) => {
      const existingIndex = state.toasts.findIndex((entry) => entry.id === toast.id);
      if (existingIndex < 0) {
        return { toasts: [...state.toasts, toast] };
      }

      const updatedToasts = [...state.toasts];
      updatedToasts[existingIndex] = toast;
      return { toasts: updatedToasts };
    });
  },
  updateToast: (toastId, partial) => {
    set((state) => ({
      toasts: state.toasts.map((toast) =>
        toast.id === toastId ? { ...toast, ...partial } : toast,
      ),
    }));
  },
  hideToast: (toastId) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== toastId),
    }));
  },
}));
