import { useMutation } from "@tanstack/react-query";

import { translateText } from "../api/translate-text";
import type { TranslateTextRequest } from "../types";

export function useTranslateText() {
  return useMutation({
    mutationFn: (request: TranslateTextRequest) => translateText(request),
  });
}
