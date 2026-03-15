import { create } from "zustand";

import { getAwakeStatus } from "../api/toggle-awake";

interface AwakeStore {
  isAwake: boolean;
  isLoading: boolean;
  setAwake: (isAwake: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  fetchStatus: () => Promise<void>;
}

export const useAwakeStore = create<AwakeStore>((set) => ({
  isAwake: false,
  isLoading: true,
  setAwake: (isAwake) => set({ isAwake, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  fetchStatus: async () => {
    set({ isLoading: true });
    try {
      const status = await getAwakeStatus();
      set({ isAwake: status, isLoading: false });
    } catch (e) {
      console.error("[AwakeStore] getAwakeStatus error:", e);
      set({ isAwake: false, isLoading: false });
    }
  },
}));

if (typeof window !== "undefined") {
  useAwakeStore.getState().fetchStatus();
}
