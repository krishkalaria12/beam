import { useState } from "react";

import {
  initializeTriggerSymbols,
  getTriggerSymbols,
  resetTriggerSymbols,
  setCustomTriggerBindings,
  setTriggerSymbol,
  TRIGGER_SYMBOLS_CHANGE_EVENT,
  type CustomTriggerBinding,
  type TriggerSymbolTarget,
  type TriggerSymbols,
} from "@/modules/settings/api/trigger-symbols";
import { useMountEffect } from "@/hooks/use-mount-effect";

export function useTriggerSymbols() {
  const [symbols, setSymbols] = useState<TriggerSymbols>(() => getTriggerSymbols());

  useMountEffect(() => {
    const syncFromStorage = () => {
      setSymbols(getTriggerSymbols());
    };

    void initializeTriggerSymbols().then(setSymbols);

    window.addEventListener(TRIGGER_SYMBOLS_CHANGE_EVENT, syncFromStorage);

    return () => {
      window.removeEventListener(TRIGGER_SYMBOLS_CHANGE_EVENT, syncFromStorage);
    };
  });

  const updateSymbol = async (target: TriggerSymbolTarget, symbol: string) => {
    const nextSymbols = await setTriggerSymbol(target, symbol);
    setSymbols(nextSymbols);
    return nextSymbols;
  };

  const resetSymbols = async () => {
    const nextSymbols = await resetTriggerSymbols();
    setSymbols(nextSymbols);
    return nextSymbols;
  };

  const updateCustomBindings = async (bindings: CustomTriggerBinding[]) => {
    const nextSymbols = await setCustomTriggerBindings(bindings);
    setSymbols(nextSymbols);
    return nextSymbols;
  };

  return {
    symbols,
    updateSymbol,
    updateCustomBindings,
    resetSymbols,
  };
}
