import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createQuicklink,
  deleteQuicklink,
  getFaviconForUrl,
  getQuicklinks,
  updateQuicklink,
} from "../api/quicklinks";
import type { QuicklinkFormData } from "../types";

export function useQuicklinks() {
  return useQuery({
    queryKey: ["quicklinks"],
    queryFn: getQuicklinks,
    staleTime: Infinity,
  });
}

export function useCreateQuicklink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: QuicklinkFormData) => createQuicklink(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quicklinks"] });
    },
  });
}

export function useUpdateQuicklink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ keyword, data }: { keyword: string; data: QuicklinkFormData }) =>
      updateQuicklink(keyword, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quicklinks"] });
    },
  });
}

export function useDeleteQuicklink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (keyword: string) => deleteQuicklink(keyword),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quicklinks"] });
    },
  });
}

export function useGetFavicon() {
  return useMutation({
    mutationFn: (url: string) => getFaviconForUrl(url),
  });
}
