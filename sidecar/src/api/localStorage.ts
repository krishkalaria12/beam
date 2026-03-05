import * as fs from "fs";
import * as path from "path";
import { config } from "../config";
import { writeLog } from "../io";
import { currentPluginName } from "../state";
import { environment } from "./environment";

export type LocalStorageValue = string | number | boolean;
export type LocalStorageValues = Record<string, LocalStorageValue>;
type LocalStorageSnapshot = Record<string, LocalStorageValues>;

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function toStorageValue(value: unknown): LocalStorageValue {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (value == null) {
    return "";
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

class PersistentLocalStorageStore {
  private storagePath: string;
  private snapshot: LocalStorageSnapshot = {};

  constructor() {
    this.storagePath = path.join(config.dataDir, "local-storage.json");
    this.load();
  }

  private getPluginNamespace(): string {
    const fromState = typeof currentPluginName === "string" ? currentPluginName.trim() : "";
    if (fromState.length > 0) {
      return fromState;
    }

    const fromEnvironment =
      typeof environment.extensionName === "string" ? environment.extensionName.trim() : "";
    if (fromEnvironment.length > 0) {
      return fromEnvironment;
    }

    return "global";
  }

  private load(): void {
    try {
      if (!fs.existsSync(this.storagePath)) {
        this.snapshot = {};
        return;
      }

      const fileContents = fs.readFileSync(this.storagePath, "utf-8");
      if (!fileContents.trim()) {
        this.snapshot = {};
        return;
      }

      const parsed = JSON.parse(fileContents) as unknown;
      if (!isObject(parsed)) {
        this.snapshot = {};
        return;
      }

      const normalized: LocalStorageSnapshot = {};
      for (const [pluginName, values] of Object.entries(parsed)) {
        if (!isObject(values)) {
          continue;
        }

        const pluginValues: LocalStorageValues = {};
        for (const [key, value] of Object.entries(values)) {
          pluginValues[key] = toStorageValue(value);
        }
        normalized[pluginName] = pluginValues;
      }

      this.snapshot = normalized;
    } catch (error) {
      writeLog({
        tag: "sidecar-local-storage",
        message: "Failed to load LocalStorage snapshot",
        error: error instanceof Error ? error.message : String(error),
      });
      this.snapshot = {};
    }
  }

  private save(): void {
    try {
      fs.mkdirSync(path.dirname(this.storagePath), { recursive: true });
      fs.writeFileSync(this.storagePath, JSON.stringify(this.snapshot, null, 2));
    } catch (error) {
      writeLog({
        tag: "sidecar-local-storage",
        message: "Failed to persist LocalStorage snapshot",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  getItem(key: string): LocalStorageValue | undefined {
    const namespace = this.getPluginNamespace();
    return this.snapshot[namespace]?.[key];
  }

  setItem(key: string, value: LocalStorageValue): void {
    const namespace = this.getPluginNamespace();
    if (!this.snapshot[namespace]) {
      this.snapshot[namespace] = {};
    }

    this.snapshot[namespace][key] = toStorageValue(value);
    this.save();
  }

  removeItem(key: string): void {
    const namespace = this.getPluginNamespace();
    const pluginStore = this.snapshot[namespace];
    if (!pluginStore) {
      return;
    }

    delete pluginStore[key];
    this.save();
  }

  clear(): void {
    const namespace = this.getPluginNamespace();
    if (!this.snapshot[namespace]) {
      return;
    }

    delete this.snapshot[namespace];
    this.save();
  }

  allItems(): LocalStorageValues {
    const namespace = this.getPluginNamespace();
    return { ...(this.snapshot[namespace] ?? {}) };
  }
}

const persistentStore = new PersistentLocalStorageStore();

export const LocalStorage = {
  getItem: async <T extends LocalStorageValue>(key: string): Promise<T | undefined> => {
    return persistentStore.getItem(key) as T | undefined;
  },
  setItem: async (key: string, value: LocalStorageValue): Promise<void> => {
    persistentStore.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    persistentStore.removeItem(key);
  },
  clear: async (): Promise<void> => {
    persistentStore.clear();
  },
  allItems: async (): Promise<LocalStorageValues> => {
    return persistentStore.allItems();
  },
};
