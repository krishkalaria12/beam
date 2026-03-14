import { create } from "zustand";

interface ExtensionsUiState {
  search: string;
  debouncedSearch: string;
  isSearchDebouncing: boolean;
  setSearch: (value: string) => void;
  setDebouncedSearch: (value: string) => void;
  setSearchDebouncing: (value: boolean) => void;
  primeSearch: (value: string) => void;
  resetAll: () => void;
}

const initialState = {
  search: "",
  debouncedSearch: "",
  isSearchDebouncing: false,
};

export const useExtensionsUiStore = create<ExtensionsUiState>((set) => ({
  ...initialState,
  setSearch: (value) => set({ search: value }),
  setDebouncedSearch: (value) => set({ debouncedSearch: value }),
  setSearchDebouncing: (value) => set({ isSearchDebouncing: value }),
  primeSearch: (value) =>
    set({
      search: value,
      debouncedSearch: value,
      isSearchDebouncing: false,
    }),
  resetAll: () => set(initialState),
}));
