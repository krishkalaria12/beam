import { useCallback, useMemo, useState } from "react";

import {
  createDefaultCommandPreferencesState,
  readCommandPreferences,
  recordCommandUsage,
  setCommandAliases,
  setCommandFavorite,
  setCommandHidden,
  setCommandHotkey,
  setCommandPinned,
  toHiddenCommandIdSet,
  toRankingSignals,
  writeCommandPreferences,
  type CommandPreferencesState,
} from "@/command-registry/command-preferences";

type CommandPreferencesUpdater = (
  previous: CommandPreferencesState,
) => CommandPreferencesState;

export function useCommandPreferences() {
  const [state, setState] = useState<CommandPreferencesState>(() =>
    readCommandPreferences(),
  );

  const updateState = useCallback((updater: CommandPreferencesUpdater) => {
    setState((previous) => {
      const next = updater(previous);
      writeCommandPreferences(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    const defaults = createDefaultCommandPreferencesState();
    setState(defaults);
    writeCommandPreferences(defaults);
  }, []);

  const markUsed = useCallback((commandId: string) => {
    updateState((previous) => recordCommandUsage(previous, commandId));
  }, [updateState]);

  const setFavorite = useCallback((commandId: string, isFavorite: boolean) => {
    updateState((previous) => setCommandFavorite(previous, commandId, isFavorite));
  }, [updateState]);

  const setPinned = useCallback((commandId: string, isPinned: boolean) => {
    updateState((previous) => setCommandPinned(previous, commandId, isPinned));
  }, [updateState]);

  const setHidden = useCallback((commandId: string, isHidden: boolean) => {
    updateState((previous) => setCommandHidden(previous, commandId, isHidden));
  }, [updateState]);

  const setAliases = useCallback((commandId: string, aliases: readonly string[]) => {
    updateState((previous) => setCommandAliases(previous, commandId, aliases));
  }, [updateState]);

  const setHotkey = useCallback((commandId: string, hotkey?: string) => {
    updateState((previous) => setCommandHotkey(previous, commandId, hotkey));
  }, [updateState]);

  const rankingSignals = useMemo(() => toRankingSignals(state), [state]);
  const hiddenCommandIds = useMemo(() => toHiddenCommandIdSet(state), [state]);

  return {
    state,
    rankingSignals,
    hiddenCommandIds,
    markUsed,
    setFavorite,
    setPinned,
    setHidden,
    setAliases,
    setHotkey,
    reset,
  };
}

