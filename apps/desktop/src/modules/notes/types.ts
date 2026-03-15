import { z } from "zod";

export const noteSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  pinned: z.boolean(),
  created_at: z.number(),
  updated_at: z.number(),
});

export const noteListSchema = z.array(noteSchema);

export type Note = z.infer<typeof noteSchema>;

export interface CreateNoteInput {
  title: string;
  content?: string;
  pinned?: boolean;
}

export interface UpdateNoteInput {
  id: string;
  title?: string;
  content?: string;
  pinned?: boolean;
}

export interface NoteEditorDraft {
  title: string;
  content: string;
  pinned: boolean;
}
