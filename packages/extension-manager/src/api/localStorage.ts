import {
  clearLocalStorage,
  getLocalStorageItem,
  listLocalStorageItems,
  removeLocalStorageItem,
  setLocalStorageItem,
  type LocalStorageValue,
  type LocalStorageValues,
} from "../protocol/storage";

export const LocalStorage = {
  getItem: async <T extends LocalStorageValue>(key: string): Promise<T | undefined> => {
    const response = getLocalStorageItem({ key });
    return (response.found ? response.value : undefined) as T | undefined;
  },
  setItem: async (key: string, value: LocalStorageValue): Promise<void> => {
    setLocalStorageItem({ key, value });
  },
  removeItem: async (key: string): Promise<void> => {
    removeLocalStorageItem({ key });
  },
  clear: async (): Promise<void> => {
    clearLocalStorage({});
  },
  allItems: async (): Promise<LocalStorageValues> => {
    return listLocalStorageItems({}).items as LocalStorageValues;
  },
};
