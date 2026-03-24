import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getPinnedEmojiHexcodes,
  pinnedEmojiHexcodesQueryKey,
  setEmojiPinned,
} from "@/modules/emoji/api/pinned-emojis";

export function usePinnedEmojis() {
  return useQuery({
    queryKey: pinnedEmojiHexcodesQueryKey,
    queryFn: getPinnedEmojiHexcodes,
    staleTime: Infinity,
  });
}

export function useSetPinnedEmoji() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ hexcode, pinned }: { hexcode: string; pinned: boolean }) =>
      setEmojiPinned(hexcode, pinned),
    onSuccess: (hexcodes) => {
      queryClient.setQueryData(pinnedEmojiHexcodesQueryKey, hexcodes);
    },
  });
}
