import { invoke, isTauri } from "@tauri-apps/api/core";

import type {
  FocusCategory,
  FocusCategoryInput,
  FocusSession,
  FocusSessionDraft,
  FocusSnoozeInput,
  FocusStatus,
} from "@/modules/focus/types";

function requireDesktopRuntime() {
  if (!isTauri()) {
    throw new Error("desktop runtime is required");
  }
}

export async function getFocusStatus(): Promise<FocusStatus> {
  requireDesktopRuntime();
  return invoke<FocusStatus>("get_focus_status");
}

export async function createFocusCategory(input: FocusCategoryInput): Promise<FocusCategory> {
  requireDesktopRuntime();
  return invoke<FocusCategory>("create_focus_category", { input });
}

export async function updateFocusCategory(
  id: string,
  input: FocusCategoryInput,
): Promise<FocusCategory> {
  requireDesktopRuntime();
  return invoke<FocusCategory>("update_focus_category", { id, input });
}

export async function deleteFocusCategory(id: string): Promise<void> {
  requireDesktopRuntime();
  await invoke("delete_focus_category", { id });
}

export async function importFocusCategories(payload: string): Promise<FocusCategory[]> {
  requireDesktopRuntime();
  return invoke<FocusCategory[]>("import_focus_categories", { payload });
}

export async function startFocusSession(draft: FocusSessionDraft): Promise<FocusSession> {
  requireDesktopRuntime();
  return invoke<FocusSession>("start_focus_session", { draft });
}

export async function editFocusSession(draft: FocusSessionDraft): Promise<FocusSession> {
  requireDesktopRuntime();
  return invoke<FocusSession>("edit_focus_session", { draft });
}

export async function pauseFocusSession(): Promise<FocusSession> {
  requireDesktopRuntime();
  return invoke<FocusSession>("pause_focus_session");
}

export async function resumeFocusSession(): Promise<FocusSession> {
  requireDesktopRuntime();
  return invoke<FocusSession>("resume_focus_session");
}

export async function completeFocusSession(): Promise<FocusSession> {
  requireDesktopRuntime();
  return invoke<FocusSession>("complete_focus_session");
}

export async function toggleFocusSession(): Promise<FocusSession | null> {
  requireDesktopRuntime();
  return invoke<FocusSession | null>("toggle_focus_session");
}

export async function snoozeFocusTarget(input: FocusSnoozeInput): Promise<FocusSession> {
  requireDesktopRuntime();
  return invoke<FocusSession>("snooze_focus_target", { input });
}
