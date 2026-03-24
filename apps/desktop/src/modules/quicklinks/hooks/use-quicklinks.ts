import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  findManagedItemAliasOwnerId,
  getManagedItemPreferenceId,
  useManagedItemPreferencesStore,
} from "@/modules/launcher/managed-items";
import {
  createQuicklink,
  deleteQuicklink,
  getFaviconForUrl,
  getQuicklinks,
  updateQuicklink,
} from "../api/quicklinks";
import type { Quicklink } from "../types";
import type { QuicklinkFormData } from "../types";

function assertQuicklinkKeywordAvailable(
  aliasesById: Record<string, string[]>,
  quicklinks: readonly { keyword: string }[],
  keyword: string,
  currentKeyword?: string,
) {
  const liveQuicklinkIds = new Set(
    quicklinks.map((quicklink) =>
      getManagedItemPreferenceId({ kind: "quicklink", id: quicklink.keyword }),
    ),
  );
  const excludedId = currentKeyword
    ? getManagedItemPreferenceId({ kind: "quicklink", id: currentKeyword })
    : undefined;
  const conflictId = findManagedItemAliasOwnerId(aliasesById, keyword, excludedId);
  if (conflictId && liveQuicklinkIds.has(conflictId)) {
    throw new Error(`Keyword "${keyword}" is already used as an alias.`);
  }
}

export function useQuicklinks() {
  return useQuery({
    queryKey: ["quicklinks"],
    queryFn: getQuicklinks,
    staleTime: Infinity,
  });
}

export function useCreateQuicklink(quicklinks: readonly Quicklink[] | null) {
  const queryClient = useQueryClient();
  const aliasesById = useManagedItemPreferencesStore((state) => state.aliasesById);

  return useMutation({
    mutationFn: (data: QuicklinkFormData) => {
      if (quicklinks == null) {
        throw new Error("Quicklinks are still loading.");
      }

      assertQuicklinkKeywordAvailable(aliasesById, quicklinks, data.keyword);
      return createQuicklink(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quicklinks"] });
    },
  });
}

export function useUpdateQuicklink(quicklinks: readonly Quicklink[] | null) {
  const queryClient = useQueryClient();
  const aliasesById = useManagedItemPreferencesStore((state) => state.aliasesById);
  const renameManagedItem = useManagedItemPreferencesStore((state) => state.renameItem);

  return useMutation({
    mutationFn: ({ keyword, data }: { keyword: string; data: QuicklinkFormData }) => {
      if (quicklinks == null) {
        throw new Error("Quicklinks are still loading.");
      }

      assertQuicklinkKeywordAvailable(aliasesById, quicklinks, data.keyword, keyword);
      return updateQuicklink(keyword, data);
    },
    onSuccess: (_, variables) => {
      if (variables.keyword !== variables.data.keyword) {
        renameManagedItem(
          { kind: "quicklink", id: variables.keyword },
          { kind: "quicklink", id: variables.data.keyword },
        );
      }

      queryClient.invalidateQueries({ queryKey: ["quicklinks"] });
    },
  });
}

export function useDeleteQuicklink() {
  const queryClient = useQueryClient();
  const removeManagedItem = useManagedItemPreferencesStore((state) => state.removeItem);

  return useMutation({
    mutationFn: (keyword: string) => deleteQuicklink(keyword),
    onSuccess: (_, keyword) => {
      removeManagedItem({ kind: "quicklink", id: keyword });
      queryClient.invalidateQueries({ queryKey: ["quicklinks"] });
    },
  });
}

export function useGetFavicon() {
  return useMutation({
    mutationFn: (url: string) => getFaviconForUrl(url),
  });
}
