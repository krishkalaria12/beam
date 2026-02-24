import { isTauri } from "@tauri-apps/api/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  createDefaultCommandPreferencesState,
  replacePinnedCommandIds,
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
import {
  getPinnedCommandIds,
  setPinnedCommand,
} from "@/command-registry/pinned-commands-api";

type CommandPreferencesUpdater = (
  previous: CommandPreferencesState,
) => CommandPreferencesState;

async function persistPinnedOrder(nextPinnedIds: readonly string[]): Promise<string[]> {
  const currentPinnedIds = await getPinnedCommandIds();

  for (const commandId of currentPinnedIds) {
    await setPinnedCommand(commandId, false);
  }

  let latestPinnedIds: string[] = [];
  for (const commandId of nextPinnedIds) {
    latestPinnedIds = await setPinnedCommand(commandId, true);
  }

  return latestPinnedIds;
}

export function useCommandPreferences() {
  const [state, setState] = useState<CommandPreferencesState>(() =>
    readCommandPreferences(),
  );
  const pinMutationRef = useRef(0);

  const updateState = useCallback((updater: CommandPreferencesUpdater) => {
    setState((previous) => {
      const next = updater(previous);
      writeCommandPreferences(next);
      return next;
    });
  }, []);

  const applyPinnedIds = useCallback((pinnedCommandIds: readonly string[]) => {
    setState((previous) => {
      const next = replacePinnedCommandIds(previous, pinnedCommandIds);
      writeCommandPreferences(next);
      return next;
    });
  }, []);

  const syncPinnedFromBackend = useCallback(async () => {
    if (!isTauri()) {
      return;
    }
    const pinnedCommandIds = await getPinnedCommandIds();
    applyPinnedIds(pinnedCommandIds);
  }, [applyPinnedIds]);

  useEffect(() => {
    void syncPinnedFromBackend().catch(() => {
      // Keep local preferences if backend sync fails.
    });
  }, [syncPinnedFromBackend]);

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
    let nextPinnedIds: string[] | null = null;
    updateState((previous) => {
      const nextState = setCommandPinned(previous, commandId, isPinned);
      nextPinnedIds = nextState.pinnedCommandIds;
      return nextState;
    });

    if (!isTauri()) {
      return;
    }

    if (isPinned && !nextPinnedIds) {
      return;
    }

    const mutationId = pinMutationRef.current + 1;
    pinMutationRef.current = mutationId;

    const persistencePromise = isPinned
      ? persistPinnedOrder(nextPinnedIds ?? [])
      : setPinnedCommand(commandId, false);

    void persistencePromise.then((pinnedCommandIds) => {
      if (mutationId !== pinMutationRef.current) {
        return;
      }
      applyPinnedIds(pinnedCommandIds);
    }).catch(() => {
      if (mutationId !== pinMutationRef.current) {
        return;
      }
      void syncPinnedFromBackend().catch(() => {
        // Keep optimistic local state if reconciliation fails.
      });
    });
  }, [applyPinnedIds, syncPinnedFromBackend, updateState]);

  const movePinned = useCallback((commandId: string, direction: "up" | "down") => {
    let nextPinnedIds: string[] | null = null;

    updateState((previous) => {
      const index = previous.pinnedCommandIds.indexOf(commandId);
      if (index < 0) {
        return previous;
      }

      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= previous.pinnedCommandIds.length) {
        return previous;
      }

      nextPinnedIds = [...previous.pinnedCommandIds];
      const [item] = nextPinnedIds.splice(index, 1);
      nextPinnedIds.splice(target, 0, item);

      return replacePinnedCommandIds(previous, nextPinnedIds);
    });

    if (!nextPinnedIds || !isTauri()) {
      return;
    }

    const mutationId = pinMutationRef.current + 1;
    pinMutationRef.current = mutationId;

    void persistPinnedOrder(nextPinnedIds).then((pinnedCommandIds) => {
      if (mutationId !== pinMutationRef.current) {
        return;
      }
      applyPinnedIds(pinnedCommandIds);
    }).catch(() => {
      if (mutationId !== pinMutationRef.current) {
        return;
      }
      void syncPinnedFromBackend().catch(() => {
        // Keep optimistic local state if reconciliation fails.
      });
    });
  }, [applyPinnedIds, syncPinnedFromBackend, updateState]);

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
    movePinned,
    setHidden,
    setAliases,
    setHotkey,
    reset,
  };
}
