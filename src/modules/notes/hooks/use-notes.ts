import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createNote, deleteNote, getNotes, updateNote } from "@/modules/notes/api/notes";
import type { CreateNoteInput, UpdateNoteInput } from "@/modules/notes/types";

const NOTES_QUERY_KEY = ["notes", "items"] as const;

export function useNotesQuery() {
  return useQuery({
    queryKey: NOTES_QUERY_KEY,
    queryFn: getNotes,
    staleTime: 0,
    refetchOnWindowFocus: true,
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
