import { create } from "zustand";
import type { RuntimeCommand } from "@beam/extension-protocol";
import {
  applyRuntimeCommandsToRuntimeTree,
  createEmptyRuntimeTreeSnapshot,
  type ExtensionToast,
  type ExtensionUiNode,
} from "@/modules/extensions/runtime/runtime-tree";

export type { ExtensionToast, ExtensionUiNode } from "@/modules/extensions/runtime/runtime-tree";

export interface RunningExtensionSessionError {
  message: string;
  stack?: string;
}

export interface RunningExtensionSession {
  runtimeId: string;
  pluginPath: string;
  pluginMode: "view" | "no-view" | "menu-bar";
  title: string;
  subtitle?: string;
  status: "launching" | "ready" | "crashed";
  error?: RunningExtensionSessionError;
}

interface ExtensionRuntimeState {
  uiTree: Map<number, ExtensionUiNode>;
  rootNodeId: number | null;
  selectedNodeId?: number;
  toasts: ExtensionToast[];
  runningSession: RunningExtensionSession | null;
  startForegroundSession: (
    session: Omit<RunningExtensionSession, "status" | "error">,
  ) => void;
  clearForegroundSession: (runtimeId?: string) => void;
  markForegroundSessionReady: (runtimeId: string) => void;
  markForegroundSessionCrashed: (
    runtimeId: string,
    error: RunningExtensionSessionError,
  ) => void;
  resetRuntime: () => void;
  applyCommands: (commands: RuntimeCommand[]) => void;
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
  startForegroundSession: (session) => {
    set({
      ...createEmptyRuntimeTreeSnapshot(),
      selectedNodeId: undefined,
      runningSession: {
        ...session,
        status: "launching",
        error: undefined,
      },
    });
  },
  clearForegroundSession: (runtimeId) => {
    set((state) => {
      if (runtimeId && state.runningSession?.runtimeId !== runtimeId) {
        return state;
      }

      return {
        ...createEmptyRuntimeTreeSnapshot(),
        selectedNodeId: undefined,
        runningSession: null,
      };
    });
  },
  markForegroundSessionReady: (runtimeId) => {
    set((state) => {
      if (!state.runningSession || state.runningSession.runtimeId !== runtimeId) {
        return state;
      }

      if (state.runningSession.status === "crashed") {
        return state;
      }

      return {
        runningSession: {
          ...state.runningSession,
          status: "ready",
          error: undefined,
        },
      };
    });
  },
  markForegroundSessionCrashed: (runtimeId, error) => {
    set((state) => {
      if (!state.runningSession || state.runningSession.runtimeId !== runtimeId) {
        return state;
      }

      return {
        runningSession: {
          ...state.runningSession,
          status: "crashed",
          error,
        },
      };
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
    const nextTree = applyRuntimeCommandsToRuntimeTree(
      {
        uiTree: currentState.uiTree,
        rootNodeId: currentState.rootNodeId,
        toasts: currentState.toasts,
      },
      commands,
    );

    set((previous) => ({
      ...previous,
      uiTree: nextTree.uiTree,
      rootNodeId: nextTree.rootNodeId,
      toasts: nextTree.toasts,
      runningSession:
        previous.runningSession && previous.runningSession.status !== "crashed"
          ? {
              ...previous.runningSession,
              status: "ready",
              error: undefined,
            }
          : previous.runningSession,
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
