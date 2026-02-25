import { useEffect, useState } from "react";

import {
  getTriggerSymbols,
  resetTriggerSymbols,
  setTriggerSymbol,
  TRIGGER_SYMBOLS_CHANGE_EVENT,
  type TriggerSymbolTarget,
  type TriggerSymbols,
} from "@/modules/settings/api/trigger-symbols";

export function useTriggerSymbols() {
  const [symbols, setSymbols] = useState<TriggerSymbols>(() => getTriggerSymbols());

  useEffect(() => {
    const syncFromStorage = () => {
      setSymbols(getTriggerSymbols());
    };

    window.addEventListener("storage", syncFromStorage);
    window.addEventListener(TRIGGER_SYMBOLS_CHANGE_EVENT, syncFromStorage);

    return () => {
      window.removeEventListener("storage", syncFromStorage);
      window.removeEventListener(TRIGGER_SYMBOLS_CHANGE_EVENT, syncFromStorage);
    };
  }, []);

  const updateSymbol = (target: TriggerSymbolTarget, symbol: string) => {
    setTriggerSymbol(target, symbol);
    setSymbols(getTriggerSymbols());
  };

  const resetSymbols = () => {
    resetTriggerSymbols();
    setSymbols(getTriggerSymbols());
  };

  return {
    symbols,
    updateSymbol,
    resetSymbols,
  };
}
