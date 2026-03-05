import { invokeCommand } from "./rpc";
import type { Application } from "./types";

type RawWindowEntry = {
  id?: unknown;
  title?: unknown;
  app_name?: unknown;
  workspace?: unknown;
  is_focused?: unknown;
};

type RaycastWindow = {
  active: boolean;
  bounds: { position: { x: number; y: number }; size: { height: number; width: number } };
  desktopId: string;
  fullScreenSettable: boolean;
  id: string;
  positionable: boolean;
  resizable: boolean;
  application?: Application;
};

enum DesktopType {
  User = 0,
  FullScreen = 1,
}

type RaycastDesktop = {
  id: string;
  screenId: string;
  size: { height: number; width: number };
  active: boolean;
  type: DesktopType;
};

function asString(value: unknown, fallback = ""): string {
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

async function listWindows(): Promise<RawWindowEntry[]> {
  const result = await invokeCommand<unknown[]>("list_windows", {});
  if (!Array.isArray(result)) {
    return [];
  }

  return result as RawWindowEntry[];
}

function toRaycastWindow(raw: RawWindowEntry): RaycastWindow {
  const workspace = asString(raw.workspace, "0");
  const appName = asString(raw.app_name);
  const app: Application | undefined = appName
    ? {
        name: appName,
        path: "",
        localizedName: appName,
        bundleId: appName.toLowerCase().replace(/\s+/g, "."),
      }
    : undefined;

  return {
    id: asString(raw.id, crypto.randomUUID()),
    active: Boolean(raw.is_focused),
    desktopId: workspace,
    fullScreenSettable: true,
    positionable: false,
    resizable: false,
    bounds: {
      position: { x: 0, y: 0 },
      size: { width: 0, height: 0 },
    },
    application: app,
  };
}

class WindowManagementAdapter {
  async getActiveWindow(): Promise<RaycastWindow> {
    const windows = await listWindows();
    const active = windows.find((entry) => Boolean(entry.is_focused)) ?? windows[0];
    if (!active) {
      throw new Error("No active window is available.");
    }

    return toRaycastWindow(active);
  }

  async getDesktops(): Promise<RaycastDesktop[]> {
    const windows = await listWindows();
    const activeWorkspace = asString(
      windows.find((entry) => Boolean(entry.is_focused))?.workspace,
      "0",
    );
    const workspaces = Array.from(
      new Set(
        windows
          .map((entry) => asString(entry.workspace, "0"))
          .filter((workspace) => workspace.length > 0),
      ),
    );

    if (workspaces.length === 0) {
      workspaces.push("0");
    }

    return workspaces.map((workspaceId) => ({
      id: workspaceId,
      screenId: "screen-0",
      size: { width: 0, height: 0 },
      active: workspaceId === activeWorkspace,
      type: DesktopType.User,
    }));
  }

  async getWindowsOnActiveDesktop(): Promise<RaycastWindow[]> {
    const windows = await listWindows();
    const activeWorkspace = asString(
      windows.find((entry) => Boolean(entry.is_focused))?.workspace,
      "",
    );

    const filtered =
      activeWorkspace.length > 0
        ? windows.filter((entry) => asString(entry.workspace, "") === activeWorkspace)
        : windows;

    return filtered.map((entry) => toRaycastWindow(entry));
  }
}

export const WindowManagement = new WindowManagementAdapter();
