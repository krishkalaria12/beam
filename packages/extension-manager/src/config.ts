import * as path from "path";
import { isMainThread, workerData } from "node:worker_threads";

interface ExtensionManagerConfig {
  dataDir: string;
  cacheDir: string;
  supportDir: string;
  pluginsDir: string;
  preferencesFile: string;
  assetsDir: string;
}

function getArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith(prefix)) {
      return arg.slice(prefix.length);
    }
  }
  const key = `--${name}`;
  const idx = process.argv.indexOf(key);
  if (idx !== -1 && idx + 1 < process.argv.length) {
    return process.argv[idx + 1];
  }
  return undefined;
}

function isConfigShape(value: unknown): value is ExtensionManagerConfig {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.dataDir === "string" &&
    typeof candidate.cacheDir === "string" &&
    typeof candidate.supportDir === "string" &&
    typeof candidate.pluginsDir === "string" &&
    typeof candidate.preferencesFile === "string" &&
    typeof candidate.assetsDir === "string"
  );
}

function getWorkerConfig(): ExtensionManagerConfig | null {
  if (isMainThread || !workerData || typeof workerData !== "object") {
    return null;
  }

  const config = (workerData as { extensionManagerConfig?: unknown }).extensionManagerConfig;
  return isConfigShape(config) ? config : null;
}

function createConfig(): ExtensionManagerConfig {
  const inheritedConfig = getWorkerConfig();
  if (inheritedConfig) {
    return inheritedConfig;
  }

  const dataDir = getArg("data-dir");
  const cacheBase = getArg("cache-dir");

  if (!dataDir || !cacheBase) {
    throw new Error("data-dir and cache-dir are required");
  }

  const pluginsDir = path.join(dataDir, "plugins");
  return {
    dataDir,
    cacheDir: path.join(cacheBase, "extension-manager"),
    supportDir: path.join(dataDir, "support"),
    pluginsDir,
    preferencesFile: path.join(dataDir, "preferences.json"),
    assetsDir: pluginsDir,
  };
}

export const config = createConfig();
