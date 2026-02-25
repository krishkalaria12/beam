import { useEffect, useState } from "react";

import {
  getTriggerSymbols,
  resetTriggerSymbols,
  setCustomTriggerBindings,
  setTriggerSymbol,
  TRIGGER_SYMBOLS_CHANGE_EVENT,
  type CustomTriggerBinding,
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

  const updateCustomBindings = (bindings: CustomTriggerBinding[]) => {
    setCustomTriggerBindings(bindings);
    setSymbols(getTriggerSymbols());
  };

  return {
    symbols,
    updateSymbol,
    updateCustomBindings,
    resetSymbols,
  };
}
