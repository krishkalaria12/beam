import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createSnippet,
  deleteSnippet,
  getSnippetRuntimeSettings,
  getSnippets,
  incrementSnippetCopiedCount,
  pasteSnippet,
  setSnippetEnabled,
  updateSnippet,
  updateSnippetRuntimeSettings,
} from "@/modules/snippets/api/snippets";
import type {
  CreateSnippetInput,
  UpdateSnippetInput,
  UpdateSnippetRuntimeSettingsInput,
} from "@/modules/snippets/types";

const SNIPPETS_QUERY_KEY = ["snippets", "items"] as const;
const SNIPPETS_RUNTIME_QUERY_KEY = ["snippets", "runtime"] as const;

export function useSnippetsQuery() {
  return useQuery({
    queryKey: SNIPPETS_QUERY_KEY,
    queryFn: getSnippets,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

function useSnippetRuntimeSettingsQuery() {
  return useQuery({
    queryKey: SNIPPETS_RUNTIME_QUERY_KEY,
    queryFn: getSnippetRuntimeSettings,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

export function useCreateSnippetMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateSnippetInput) => createSnippet(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SNIPPETS_QUERY_KEY });
    },
  });
}

export function useUpdateSnippetMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateSnippetInput) => updateSnippet(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SNIPPETS_QUERY_KEY });
    },
  });
}

export function useDeleteSnippetMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteSnippet(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SNIPPETS_QUERY_KEY });
    },
  });
}

export function useSetSnippetEnabledMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      setSnippetEnabled(id, enabled),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SNIPPETS_QUERY_KEY });
    },
  });
}

function useIncrementSnippetCopiedCountMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => incrementSnippetCopiedCount(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SNIPPETS_QUERY_KEY });
    },
  });
}

export function usePasteSnippetMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => pasteSnippet(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SNIPPETS_QUERY_KEY });
    },
  });
}

function useUpdateSnippetRuntimeSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateSnippetRuntimeSettingsInput) => updateSnippetRuntimeSettings(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: SNIPPETS_RUNTIME_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: SNIPPETS_QUERY_KEY }),
      ]);
    },
  });
}
