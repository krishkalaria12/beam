import { create } from "zustand";

import type { InstalledExtensionSummary } from "@/modules/extensions/types";

interface ExtensionsUiState {
  search: string;
  debouncedSearch: string;
  isSearchDebouncing: boolean;
  pendingInstallSlug: string | null;
  pendingUninstallSlug: string | null;
  actionError: string | null;
  optimisticInstalledSlugs: string[];
  setupExtension: InstalledExtensionSummary | null;
  setupInitialValues: Record<string, unknown>;
  setupError: string | null;
  isSetupLoading: boolean;
  isSetupSaving: boolean;
  setSearch: (value: string) => void;
  setDebouncedSearch: (value: string) => void;
  setSearchDebouncing: (value: boolean) => void;
  setPendingInstallSlug: (value: string | null) => void;
  setPendingUninstallSlug: (value: string | null) => void;
  setActionError: (value: string | null) => void;
  addOptimisticInstalledSlug: (slug: string) => void;
  removeOptimisticInstalledSlug: (slug: string) => void;
  pruneOptimisticInstalledSlugs: (installedSlugs: string[]) => void;
  setSetupExtension: (value: InstalledExtensionSummary | null) => void;
  setSetupInitialValues: (value: Record<string, unknown>) => void;
  setSetupError: (value: string | null) => void;
  setIsSetupLoading: (value: boolean) => void;
  setIsSetupSaving: (value: boolean) => void;
  resetSetupState: () => void;
  resetAll: () => void;
}

const initialState = {
  search: "",
  debouncedSearch: "",
  isSearchDebouncing: false,
  pendingInstallSlug: null,
  pendingUninstallSlug: null,
  actionError: null,
  optimisticInstalledSlugs: [] as string[],
  setupExtension: null,
  setupInitialValues: {} as Record<string, unknown>,
  setupError: null,
  isSetupLoading: false,
  isSetupSaving: false,
};

export const useExtensionsUiStore = create<ExtensionsUiState>((set) => ({
  ...initialState,
  setSearch: (value) => set({ search: value }),
  setDebouncedSearch: (value) => set({ debouncedSearch: value }),
  setSearchDebouncing: (value) => set({ isSearchDebouncing: value }),
  setPendingInstallSlug: (value) => set({ pendingInstallSlug: value }),
  setPendingUninstallSlug: (value) => set({ pendingUninstallSlug: value }),
  setActionError: (value) => set({ actionError: value }),
  addOptimisticInstalledSlug: (slug) =>
    set((state) => {
      const normalizedSlug = slug.trim();
      if (!normalizedSlug) {
        return state;
      }

      const alreadyExists = state.optimisticInstalledSlugs.some(
        (entry) => entry.toLowerCase() === normalizedSlug.toLowerCase(),
      );
      if (alreadyExists) {
        return state;
      }

      return {
        optimisticInstalledSlugs: [...state.optimisticInstalledSlugs, normalizedSlug],
      };
    }),
  removeOptimisticInstalledSlug: (slug) =>
    set((state) => ({
      optimisticInstalledSlugs: state.optimisticInstalledSlugs.filter(
        (entry) => entry.toLowerCase() !== slug.toLowerCase(),
      ),
    })),
  pruneOptimisticInstalledSlugs: (installedSlugs) =>
    set((state) => {
      if (state.optimisticInstalledSlugs.length === 0) {
        return state;
      }

      const installedSlugSet = new Set(installedSlugs.map((slug) => slug.toLowerCase()));
      const remaining = state.optimisticInstalledSlugs.filter(
        (slug) => !installedSlugSet.has(slug.toLowerCase()),
      );

      if (remaining.length === state.optimisticInstalledSlugs.length) {
        return state;
      }

      return { optimisticInstalledSlugs: remaining };
    }),
  setSetupExtension: (value) => set({ setupExtension: value }),
  setSetupInitialValues: (value) => set({ setupInitialValues: value }),
  setSetupError: (value) => set({ setupError: value }),
  setIsSetupLoading: (value) => set({ isSetupLoading: value }),
  setIsSetupSaving: (value) => set({ isSetupSaving: value }),
  resetSetupState: () =>
    set({
      setupExtension: null,
      setupInitialValues: {},
      setupError: null,
      isSetupLoading: false,
      isSetupSaving: false,
    }),
  resetAll: () => set(initialState),
}));
