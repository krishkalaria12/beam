import {
  type ClearLocalStorageRequest,
  type ClearLocalStorageResponse,
  type GetLocalStorageItemRequest,
  type GetLocalStorageItemResponse,
  type ListLocalStorageItemsRequest,
  type ListLocalStorageItemsResponse,
  type RemoveLocalStorageItemRequest,
  type RemoveLocalStorageItemResponse,
  type SetLocalStorageItemRequest,
  type SetLocalStorageItemResponse,
} from "@beam/extension-protocol";
import * as fs from "fs";
import * as path from "path";
import { config } from "../config";
import { writeLog } from "../io";
import { currentPluginName } from "../state";
import { environment } from "../api/environment";
import { emitStorageChanged } from "../api/storageEvents";

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
        tag: "extension-manager-local-storage",
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
        tag: "extension-manager-local-storage",
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
    emitStorageChanged();
  }

  removeItem(key: string): void {
    const namespace = this.getPluginNamespace();
    const pluginStore = this.snapshot[namespace];
    if (!pluginStore) {
      return;
    }

    delete pluginStore[key];
    this.save();
    emitStorageChanged();
  }

  clear(): void {
    const namespace = this.getPluginNamespace();
    if (!this.snapshot[namespace]) {
      return;
    }

    delete this.snapshot[namespace];
    this.save();
    emitStorageChanged();
  }

  allItems(): LocalStorageValues {
    const namespace = this.getPluginNamespace();
    return { ...(this.snapshot[namespace] ?? {}) };
  }
}

const persistentStore = new PersistentLocalStorageStore();

export function getLocalStorageItem(
  request: GetLocalStorageItemRequest,
): GetLocalStorageItemResponse {
  const value = persistentStore.getItem(request.key);
  return {
    value,
    found: value !== undefined,
  };
}

export function setLocalStorageItem(
  request: SetLocalStorageItemRequest,
): SetLocalStorageItemResponse {
  if (request.value !== undefined) {
    persistentStore.setItem(request.key, toStorageValue(request.value));
  }

  return { ok: true };
}

export function removeLocalStorageItem(
  request: RemoveLocalStorageItemRequest,
): RemoveLocalStorageItemResponse {
  persistentStore.removeItem(request.key);
  return { ok: true };
}

export function clearLocalStorage(
  _request: ClearLocalStorageRequest = {},
): ClearLocalStorageResponse {
  persistentStore.clear();
  return { ok: true };
}

export function listLocalStorageItems(
  _request: ListLocalStorageItemsRequest = {},
): ListLocalStorageItemsResponse {
  return {
    items: persistentStore.allItems(),
  };
}
