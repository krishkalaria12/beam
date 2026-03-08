import { create } from "zustand";
import type { Command as ProtocolCommand } from "@flare/protocol";
import {
  applyProtocolCommandsToRuntimeTree,
  createEmptyRuntimeTreeSnapshot,
  type ExtensionToast,
  type ExtensionUiNode,
} from "@/modules/extensions/runtime/runtime-tree";

export type {
  ExtensionToast,
  ExtensionUiNode,
} from "@/modules/extensions/runtime/runtime-tree";

export interface RunningExtensionSession {
  pluginPath: string;
  pluginMode: "view" | "no-view" | "menu-bar";
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
  updateRunningSessionMetadata: (metadata: { subtitle?: string | null }) => void;
}

export const useExtensionRuntimeStore = create<ExtensionRuntimeState>((set, get) => ({
  ...createEmptyRuntimeTreeSnapshot(),
  selectedNodeId: undefined,
  runningSession: null,
  resetForNewPlugin: (session) => {
    set({
      ...createEmptyRuntimeTreeSnapshot(),
      selectedNodeId: undefined,
      runningSession: session,
    });
  },
  resetRuntime: () => {
    set({
      ...createEmptyRuntimeTreeSnapshot(),
      selectedNodeId: undefined,
      runningSession: null,
    });
  },
  applyCommands: (commands) => {
    if (!commands.length) {
      return;
    }

    const currentState = get();
    const nextTree = applyProtocolCommandsToRuntimeTree({
      uiTree: currentState.uiTree,
      rootNodeId: currentState.rootNodeId,
      toasts: currentState.toasts,
    }, commands);

    set((previous) => ({
      ...previous,
      uiTree: nextTree.uiTree,
      rootNodeId: nextTree.rootNodeId,
      toasts: nextTree.toasts,
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
  updateRunningSessionMetadata: ({ subtitle }) => {
    set((state) => {
      if (!state.runningSession) {
        return state;
      }

      return {
        runningSession: {
          ...state.runningSession,
          subtitle: subtitle ?? undefined,
        },
      };
    });
  },
}));
