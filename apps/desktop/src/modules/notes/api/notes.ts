import { invoke, isTauri } from "@tauri-apps/api/core";

import {
  noteListSchema,
  noteSchema,
  type CreateNoteInput,
  type Note,
  type UpdateNoteInput,
} from "@/modules/notes/types";

function assertDesktopRuntime() {
  if (!isTauri()) {
    throw new Error("Notes commands require desktop runtime.");
  }
}

function normalizeRequiredText(value: string, fieldName: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
}

function parseNote(input: unknown): Note {
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid note response from backend.");
  }

  return parsed.data;
}

export async function getNotes(): Promise<Note[]> {
  if (!isTauri()) {
    return [];
  }

  const response = await invoke<unknown>("get_notes");
  const parsed = noteListSchema.safeParse(response);
  if (!parsed.success) {
    throw new Error("Invalid notes response from backend.");
  }

  return parsed.data;
}

export async function createNote(input: CreateNoteInput): Promise<Note> {
  assertDesktopRuntime();

  const payload = {
    title: normalizeRequiredText(input.title, "note title"),
    ...(typeof input.content === "string" ? { content: input.content } : {}),
    ...(typeof input.pinned === "boolean" ? { pinned: input.pinned } : {}),
  };

  const response = await invoke<unknown>("create_note", { payload });
  return parseNote(response);
}

export async function updateNote(input: UpdateNoteInput): Promise<Note> {
  assertDesktopRuntime();

  const payload = {
    id: normalizeRequiredText(input.id, "note id"),
    ...(typeof input.title === "string"
      ? { title: normalizeRequiredText(input.title, "note title") }
      : {}),
    ...(typeof input.content === "string" ? { content: input.content } : {}),
    ...(typeof input.pinned === "boolean" ? { pinned: input.pinned } : {}),
  };

  const response = await invoke<unknown>("update_note", { payload });
  return parseNote(response);
}

export async function deleteNote(noteId: string): Promise<void> {
  assertDesktopRuntime();
  const id = normalizeRequiredText(noteId, "note id");
  await invoke("delete_note", { noteId: id });
}
