import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createNote, deleteNote, updateNote } from "@/modules/notes/api/notes";
import { getNotesQueryOptions, NOTES_QUERY_KEY } from "@/modules/notes/api/query";
import type { CreateNoteInput, UpdateNoteInput } from "@/modules/notes/types";

export function useNotesQuery() {
  return useQuery({
    ...getNotesQueryOptions(),
  });
}

export function useCreateNoteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateNoteInput) => createNote(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: NOTES_QUERY_KEY });
    },
  });
}

export function useUpdateNoteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateNoteInput) => updateNote(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: NOTES_QUERY_KEY });
    },
  });
}

export function useDeleteNoteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (noteId: string) => deleteNote(noteId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: NOTES_QUERY_KEY });
    },
  });
}
