import { LaunchType } from "./types";
import * as fs from "fs";
import { writeRuntimeOutput } from "../protocol/runtime-output";
import type { Application } from "./types";
import { config } from "../config";
import { browserExtensionState, aiContext } from "../state";
import { invokeCommand } from "./rpc";
import { createEnvironmentResponse } from "../protocol/environment";
import type { GetEnvironmentResponse } from "@beam/extension-protocol";

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

export type DesktopContextState = "supported" | "unavailable" | "unsupported";

export interface DesktopContextValue<T> {
  state: DesktopContextState;
  value?: T;
  reason?: string;
}

export interface DesktopContext {
  selectedText: DesktopContextValue<string>;
  selectedFiles: DesktopContextValue<FileSystemItem[]>;
  focusedWindow: DesktopContextValue<{
    id: string;
    title: string;
    appName: string;
    className: string;
    appId?: string;
    pid?: number;
    workspace: string;
    isFocused: boolean;
  }>;
  frontmostApplication: DesktopContextValue<Application>;
  sources: {
    selectedTextBackend: string;
    selectedFilesBackend: string;
    windowBackend: string;
    applicationBackend: string;
  };
  capabilities: {
    selectedText: boolean;
    selectedFiles: boolean;
    focusedWindow: boolean;
    frontmostApplication: boolean;
  };
}

export const BrowserExtension = { name: "BrowserExtension" };
export const AI = { name: "AI" };

export const environment = {
  appearance: "dark" as const,
  assetsPath: config.assetsDir,
  commandMode: "view" as "view" | "no-view" | "menu-bar",
  commandName: "index",
  extensionName: "my-extension",
  isDevelopment: true,
  launchType: LaunchType.UserInitiated,
  ownerOrAuthorName: "Flare",
  raycastVersion: "1.0.0",
  supportPath: supportPath,
  theme: "dark" as const,
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

function normalizeContextState(value: unknown): DesktopContextState {
  return value === "supported" || value === "unavailable" || value === "unsupported"
    ? value
    : "unsupported";
}

function normalizeDesktopContextValue<T>(
  value: unknown,
  transform: (raw: unknown) => T | undefined,
): DesktopContextValue<T> {
  if (!value || typeof value !== "object") {
    return { state: "unsupported", reason: "desktop context is unavailable" };
  }

  const record = value as Record<string, unknown>;
  return {
    state: normalizeContextState(record.state),
    value: transform(record.value),
    reason: typeof record.reason === "string" ? record.reason : undefined,
  };
}

export async function getDesktopContext(): Promise<DesktopContext> {
  return loadDesktopContext();
}

async function loadDesktopContext(): Promise<DesktopContext> {
  const raw = await invokeCommand<Record<string, unknown>>("get_desktop_context");

  return {
    selectedText: normalizeDesktopContextValue(raw?.selectedText, (value) =>
      typeof value === "string" ? value : undefined,
    ),
    selectedFiles: normalizeDesktopContextValue(raw?.selectedFiles, (value) =>
      Array.isArray(value)
        ? value
            .map((entry) =>
              entry &&
              typeof entry === "object" &&
              typeof (entry as { path?: unknown }).path === "string"
                ? { path: (entry as { path: string }).path }
                : undefined,
            )
            .filter((entry): entry is FileSystemItem => Boolean(entry))
        : undefined,
    ),
    focusedWindow: normalizeDesktopContextValue(raw?.focusedWindow, (value) =>
      value && typeof value === "object"
        ? {
            id:
              typeof (value as { id?: unknown }).id === "string"
                ? (value as { id: string }).id
                : "",
            title:
              typeof (value as { title?: unknown }).title === "string"
                ? (value as { title: string }).title
                : "",
            appName:
              typeof (value as { appName?: unknown }).appName === "string"
                ? (value as { appName: string }).appName
                : "",
            className:
              typeof (value as { className?: unknown }).className === "string"
                ? (value as { className: string }).className
                : "",
            appId:
              typeof (value as { appId?: unknown }).appId === "string"
                ? (value as { appId: string }).appId
                : undefined,
            pid:
              typeof (value as { pid?: unknown }).pid === "number"
                ? (value as { pid: number }).pid
                : undefined,
            workspace:
              typeof (value as { workspace?: unknown }).workspace === "string"
                ? (value as { workspace: string }).workspace
                : "",
            isFocused: Boolean((value as { isFocused?: unknown }).isFocused),
          }
        : undefined,
    ),
    frontmostApplication: normalizeDesktopContextValue(raw?.frontmostApplication, (value) =>
      value ? normalizeApplication(value) : undefined,
    ),
    sources:
      raw?.sources && typeof raw.sources === "object"
        ? {
            selectedTextBackend:
              typeof (raw.sources as { selectedTextBackend?: unknown }).selectedTextBackend ===
              "string"
                ? (raw.sources as { selectedTextBackend: string }).selectedTextBackend
                : "unsupported",
            selectedFilesBackend:
              typeof (raw.sources as { selectedFilesBackend?: unknown }).selectedFilesBackend ===
              "string"
                ? (raw.sources as { selectedFilesBackend: string }).selectedFilesBackend
                : "unsupported",
            windowBackend:
              typeof (raw.sources as { windowBackend?: unknown }).windowBackend === "string"
                ? (raw.sources as { windowBackend: string }).windowBackend
                : "unsupported",
            applicationBackend:
              typeof (raw.sources as { applicationBackend?: unknown }).applicationBackend ===
              "string"
                ? (raw.sources as { applicationBackend: string }).applicationBackend
                : "unsupported",
          }
        : {
            selectedTextBackend: "unsupported",
            selectedFilesBackend: "unsupported",
            windowBackend: "unsupported",
            applicationBackend: "unsupported",
          },
    capabilities:
      raw?.capabilities && typeof raw.capabilities === "object"
        ? {
            selectedText: Boolean((raw.capabilities as Record<string, unknown>).selectedText),
            selectedFiles: Boolean((raw.capabilities as Record<string, unknown>).selectedFiles),
            focusedWindow: Boolean((raw.capabilities as Record<string, unknown>).focusedWindow),
            frontmostApplication: Boolean(
              (raw.capabilities as Record<string, unknown>).frontmostApplication,
            ),
          }
        : {
            selectedText: false,
            selectedFiles: false,
            focusedWindow: false,
            frontmostApplication: false,
          },
  };
}

export async function getEnvironmentProtocolSnapshot(): Promise<GetEnvironmentResponse> {
  const context = await loadDesktopContext();
  return createEnvironmentResponse(environment, context, {
    aiAccess: aiContext.hasAccess,
    browserExtensionAccess: browserExtensionState.isConnected,
  });
}

export async function getSelectedFinderItems(): Promise<FileSystemItem[]> {
  const context = await getDesktopContext();
  return context.selectedFiles.value ?? [];
}

export async function getSelectedText(): Promise<string> {
  const context = await getDesktopContext();
  return context.selectedText.value ?? "";
}

export async function open(target: string, application?: Application | string): Promise<void> {
  let openWith: string | undefined;

  if (typeof application === "string") {
    openWith = application;
  } else if (application) {
    openWith = application.path;
  }

  writeRuntimeOutput({
    open: {
      target,
      application: openWith ?? "",
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
  const application = await invokeCommand<unknown>("get_default_application", {
    path: path.toString(),
  });
  return normalizeApplication(application);
}

export async function getFrontmostApplication(): Promise<Application> {
  try {
    const context = await getDesktopContext();
    if (context.frontmostApplication.value) {
      return normalizeApplication(context.frontmostApplication.value);
    }
  } catch {
    // Fall through to the direct runtime command.
  }

  const application = await invokeCommand<unknown>("get_frontmost_application", {});
  return normalizeApplication(application);
}

export async function showInFinder(path: fs.PathLike): Promise<void> {
  await invokeCommand<void>("show_in_finder", { path: path.toString() });
}

export async function trash(path: fs.PathLike | fs.PathLike[]): Promise<void> {
  const paths = (Array.isArray(path) ? path : [path]).map((p) => p.toString());
  await invokeCommand<void>("trash", { paths });
}
