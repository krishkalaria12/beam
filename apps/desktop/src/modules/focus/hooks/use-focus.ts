import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { toast } from "sonner";

import {
  completeFocusSession,
  createFocusCategory,
  deleteFocusCategory,
  editFocusSession,
  importFocusCategories,
  pauseFocusSession,
  resumeFocusSession,
  snoozeFocusTarget,
  startFocusSession,
  toggleFocusSession,
  updateFocusCategory,
} from "@/modules/focus/api/focus";
import { FOCUS_STATUS_QUERY_KEY, getFocusStatusQueryOptions } from "@/modules/focus/api/query";
import type { FocusCategoryInput, FocusStatus } from "@/modules/focus/types";
import { useMountEffect } from "@/hooks/use-mount-effect";

const FOCUS_STATUS_EVENT = "focus-status-updated";
const FOCUS_APP_BLOCKED_EVENT = "focus-app-blocked";

function mutationErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim().length > 0 ? error.message : fallback;
}

export function useFocusStatus(enabled = true) {
  return useQuery({
    ...getFocusStatusQueryOptions(),
    enabled,
  });
}

export function useFocusEvents() {
  const queryClient = useQueryClient();

  useMountEffect(() => {
    if (!isTauri()) {
      return;
    }

    let disposed = false;
    const cleanups: Array<() => void> = [];

    void listen<FocusStatus>(FOCUS_STATUS_EVENT, (event) => {
      queryClient.setQueryData(FOCUS_STATUS_QUERY_KEY, event.payload);
    }).then((cleanup) => {
      if (disposed) {
        cleanup();
        return;
      }
      cleanups.push(cleanup);
    });

    void listen<{ target?: string; appName?: string }>(FOCUS_APP_BLOCKED_EVENT, (event) => {
      const target = event.payload.appName || event.payload.target || "Blocked app";
      toast.warning(`${target} is blocked by Focus Mode.`);
      void queryClient.invalidateQueries({ queryKey: FOCUS_STATUS_QUERY_KEY });
    }).then((cleanup) => {
      if (disposed) {
        cleanup();
        return;
      }
      cleanups.push(cleanup);
    });

    return () => {
      disposed = true;
      for (const cleanup of cleanups) {
        cleanup();
      }
    };
  });
}

export function useFocusMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: FOCUS_STATUS_QUERY_KEY });

  return {
    createCategory: useMutation({
      mutationFn: createFocusCategory,
      onSuccess: invalidate,
      onError: (error) => toast.error(mutationErrorMessage(error, "Failed to create category.")),
    }),
    updateCategory: useMutation({
      mutationFn: ({ id, input }: { id: string; input: FocusCategoryInput }) =>
        updateFocusCategory(id, input),
      onSuccess: invalidate,
      onError: (error) => toast.error(mutationErrorMessage(error, "Failed to update category.")),
    }),
    deleteCategory: useMutation({
      mutationFn: deleteFocusCategory,
      onSuccess: invalidate,
      onError: (error) => toast.error(mutationErrorMessage(error, "Failed to delete category.")),
    }),
    importCategories: useMutation({
      mutationFn: importFocusCategories,
      onSuccess: (categories) => {
        toast.success(`Imported ${categories.length} focus categories.`);
        void invalidate();
      },
      onError: (error) => toast.error(mutationErrorMessage(error, "Failed to import categories.")),
    }),
    startSession: useMutation({
      mutationFn: startFocusSession,
      onSuccess: invalidate,
      onError: (error) => toast.error(mutationErrorMessage(error, "Failed to start focus.")),
    }),
    editSession: useMutation({
      mutationFn: editFocusSession,
      onSuccess: invalidate,
      onError: (error) => toast.error(mutationErrorMessage(error, "Failed to edit focus.")),
    }),
    pauseSession: useMutation({
      mutationFn: pauseFocusSession,
      onSuccess: invalidate,
      onError: (error) => toast.error(mutationErrorMessage(error, "Failed to pause focus.")),
    }),
    resumeSession: useMutation({
      mutationFn: resumeFocusSession,
      onSuccess: invalidate,
      onError: (error) => toast.error(mutationErrorMessage(error, "Failed to resume focus.")),
    }),
    completeSession: useMutation({
      mutationFn: completeFocusSession,
      onSuccess: invalidate,
      onError: (error) => toast.error(mutationErrorMessage(error, "Failed to complete focus.")),
    }),
    toggleSession: useMutation({
      mutationFn: toggleFocusSession,
      onSuccess: invalidate,
      onError: (error) => toast.error(mutationErrorMessage(error, "Failed to toggle focus.")),
    }),
    snoozeTarget: useMutation({
      mutationFn: snoozeFocusTarget,
      onSuccess: invalidate,
      onError: (error) => toast.error(mutationErrorMessage(error, "Failed to snooze target.")),
    }),
  };
}

export type FocusMutations = ReturnType<typeof useFocusMutations>;
