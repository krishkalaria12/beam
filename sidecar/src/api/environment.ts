import { LaunchType } from "./types";
import * as fs from "fs";
import { writeOutput } from "../io";
import type { Application } from "./types";
import { config } from "../config";
import { browserExtensionState, aiContext } from "../state";
import { invokeCommand } from "./rpc";

const supportPath = config.supportDir;
try {
  if (!fs.existsSync(supportPath)) {
    fs.mkdirSync(supportPath, { recursive: true });
  }
} catch (e) {
  console.error("Could not create support path", e);
}

export interface FileSystemItem {
  path: string;
}

export const BrowserExtension = { name: "BrowserExtension" };
export const AI = { name: "AI" };

export const environment = {
  appearance: "dark" as const,
  assetsPath: config.assetsDir,
  commandMode: "view" as "view" | "no-view",
  commandName: "index",
  extensionName: "my-extension",
  isDevelopment: true,
  launchType: LaunchType.UserInitiated,
  ownerOrAuthorName: "Flare",
  raycastVersion: "1.0.0",
  supportPath: supportPath,
  textSize: "medium" as const,
  canAccess: (feature: { name: string }): boolean => {
    if (feature && feature.name === "BrowserExtension") {
      return browserExtensionState.isConnected;
    }
    if (feature && feature.name === "AI") {
      return aiContext.hasAccess;
    }
    return true;
  },
};

export async function getSelectedFinderItems(): Promise<FileSystemItem[]> {
  return invokeCommand<FileSystemItem[]>("get_selected_finder_items");
}

export async function getSelectedText(): Promise<string> {
  return invokeCommand<string>("get_selected_text");
}

export async function open(target: string, application?: Application | string): Promise<void> {
  let openWith: string | undefined;

  if (typeof application === "string") {
    openWith = application;
  } else if (application) {
    openWith = application.path;
  }

  writeOutput({
    type: "open",
    payload: {
      target,
      application: openWith,
    },
  });
}

type RawApplication = {
  name?: unknown;
  path?: unknown;
  execPath?: unknown;
  exec_path?: unknown;
  bundleId?: unknown;
  bundle_id?: unknown;
  localizedName?: unknown;
  localized_name?: unknown;
  windowsAppId?: unknown;
  windows_app_id?: unknown;
};

const DEFAULT_APPLICATION_PATH = "xdg-open";

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") {
    return {};
  }
  return value as Record<string, unknown>;
}

function normalizeApplication(raw: unknown): Application {
  const candidate = raw as RawApplication;
  const name =
    typeof candidate?.name === "string" && candidate.name.trim().length > 0
      ? candidate.name
      : "Application";

  const path =
    typeof candidate?.path === "string" && candidate.path.trim().length > 0
      ? candidate.path
      : typeof candidate?.execPath === "string" && candidate.execPath.trim().length > 0
        ? candidate.execPath
        : typeof candidate?.exec_path === "string" && candidate.exec_path.trim().length > 0
          ? candidate.exec_path
          : DEFAULT_APPLICATION_PATH;

  const bundleId =
    typeof candidate?.bundleId === "string" && candidate.bundleId.trim().length > 0
      ? candidate.bundleId
      : typeof candidate?.bundle_id === "string" && candidate.bundle_id.trim().length > 0
        ? candidate.bundle_id
        : typeof candidate?.windowsAppId === "string" && candidate.windowsAppId.trim().length > 0
          ? candidate.windowsAppId
          : typeof candidate?.windows_app_id === "string" &&
              candidate.windows_app_id.trim().length > 0
            ? candidate.windows_app_id
            : undefined;

  const localizedName =
    typeof candidate?.localizedName === "string" && candidate.localizedName.trim().length > 0
      ? candidate.localizedName
      : typeof candidate?.localized_name === "string" && candidate.localized_name.trim().length > 0
        ? candidate.localized_name
        : undefined;

  return {
    name,
    path,
    bundleId,
    localizedName,
  };
}

async function invokeWithFallback<T>(
  command: string,
  params: Record<string, unknown>,
  fallback: () => Promise<T>,
): Promise<T> {
  try {
    return await invokeCommand<T>(command, params);
  } catch {
    return fallback();
  }
}

export async function getApplications(path?: fs.PathLike): Promise<Application[]> {
  const rawApps = await invokeCommand<unknown[]>("get_applications", {});
  if (!Array.isArray(rawApps)) {
    return [];
  }
  const normalized = rawApps.map((entry) => normalizeApplication(entry));
  if (path) {
    return normalized;
  }
  return normalized;
}

export async function getDefaultApplication(path: fs.PathLike): Promise<Application> {
  return invokeWithFallback(
    "get_default_application",
    { path: path.toString() },
    async () => normalizeApplication({ name: "Default Application", path: DEFAULT_APPLICATION_PATH }),
  ).then((application) => normalizeApplication(application));
}

export async function getFrontmostApplication(): Promise<Application> {
  return invokeWithFallback(
    "get_frontmost_application",
    {},
    async () =>
      normalizeApplication({
        name: "Beam",
        path: process.execPath || DEFAULT_APPLICATION_PATH,
      }),
  ).then((application) => normalizeApplication(application));
}

export async function showInFinder(path: fs.PathLike): Promise<void> {
  const target = path.toString();
  try {
    await invokeCommand<void>("show_in_finder", { path: target });
  } catch {
    await open(target);
  }
}

export async function trash(path: fs.PathLike | fs.PathLike[]): Promise<void> {
  const paths = (Array.isArray(path) ? path : [path]).map((p) => p.toString());
  await invokeWithFallback(
    "trash",
    { paths },
    async () => {
      writeOutput({
        type: "log",
        payload: {
          tag: "sidecar-rpc-request-failure",
          operation: "trash",
          message: "Trash command unavailable; fallback no-op applied",
          params: toRecord({ paths }),
        },
      });
    },
  );
}
