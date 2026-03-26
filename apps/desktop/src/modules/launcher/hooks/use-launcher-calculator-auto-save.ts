import type { QueryClient } from "@tanstack/react-query";
import { useEffectEvent, useRef } from "react";

import { calculatorHistoryQueryKey } from "@/modules/calculator-history/api/query";
import { saveCalculatorHistory } from "@/modules/calculator-history/api/save-calculator-history";
import { CALCULATOR_AUTO_SAVE_DEBOUNCE_MS } from "@/modules/calculator/constants";
import { useMountEffect } from "@/hooks/use-mount-effect";

interface CalculatorPreview {
  query: string;
  result: string;
}

interface UseLauncherCalculatorAutoSaveInput {
  calculatorPreview: CalculatorPreview | null;
  calculatorSessionId: string;
  queryClient: QueryClient;
}

export function useLauncherCalculatorAutoSave({
  calculatorPreview,
  calculatorSessionId,
  queryClient,
}: UseLauncherCalculatorAutoSaveInput) {
  const calculatorSaveTimerRef = useRef<number | null>(null);
  const calculatorSaveKeyRef = useRef("");
  const calculatorPreviewKey = calculatorPreview
    ? `${calculatorPreview.query}\u0000${calculatorPreview.result}\u0000${calculatorSessionId}`
    : "";

  const syncCalculatorAutoSave = useEffectEvent(() => {
    if (calculatorPreviewKey && calculatorSaveKeyRef.current !== calculatorPreviewKey) {
      calculatorSaveKeyRef.current = calculatorPreviewKey;
      if (calculatorSaveTimerRef.current !== null) {
        window.clearTimeout(calculatorSaveTimerRef.current);
      }
      calculatorSaveTimerRef.current = window.setTimeout(() => {
        calculatorSaveTimerRef.current = null;
        if (!calculatorPreview) {
          return;
        }
        void saveCalculatorHistory(
          calculatorPreview.query,
          calculatorPreview.result,
          calculatorSessionId,
        ).then(() => {
          queryClient.invalidateQueries({ queryKey: calculatorHistoryQueryKey });
        });
      }, CALCULATOR_AUTO_SAVE_DEBOUNCE_MS);
      return;
    }

    if (!calculatorPreviewKey && calculatorSaveTimerRef.current !== null) {
      window.clearTimeout(calculatorSaveTimerRef.current);
      calculatorSaveTimerRef.current = null;
      calculatorSaveKeyRef.current = "";
    }
  });

  useMountEffect(() => {
    syncCalculatorAutoSave();
    const intervalId = window.setInterval(() => {
      syncCalculatorAutoSave();
    }, 120);

    return () => {
      window.clearInterval(intervalId);
    };
  });

  useMountEffect(() => {
    return () => {
      if (calculatorSaveTimerRef.current !== null) {
        window.clearTimeout(calculatorSaveTimerRef.current);
      }
    };
  });
}
