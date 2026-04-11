type StorageChangeListener = () => void;

const storageChangeListeners = new Set<StorageChangeListener>();

export function emitStorageChanged(): void {
  for (const listener of storageChangeListeners) {
    try {
      listener();
    } catch (error) {
      console.error("storage change listener failed", error);
    }
  }
}

function subscribeToStorageChanges(listener: StorageChangeListener): () => void {
  storageChangeListeners.add(listener);
  return () => {
    storageChangeListeners.delete(listener);
  };
}
