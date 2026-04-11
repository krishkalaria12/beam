import { invoke, isTauri } from "@tauri-apps/api/core";
import { useLayoutEffect, useRef } from "react";

import { COMMAND_PANELS } from "@/command-registry/panels";
import type { CommandPanel } from "@/command-registry/types";
import { setLauncherCompactMode } from "@/modules/settings/api/set-launcher-compact-mode";

const LAUNCHER_DEFAULT_WIDTH = 960;
const LAUNCHER_DEFAULT_HEIGHT = 520;
const SETTINGS_WINDOW_WIDTH = 1240;
const SETTINGS_WINDOW_HEIGHT = 760;
const AI_WINDOW_WIDTH = 1100;
const AI_WINDOW_HEIGHT = 750;

type LauncherWindowRequest =
  | {
      key: string;
      kind: "commands";
      compact: boolean;
      compactHeight?: number;
    }
  | {
      key: string;
      kind: "fixed";
      width: number;
      height: number;
    };

type LauncherWindowSyncMode = "default" | "transition";

let queuedRequest: {
  request: LauncherWindowRequest;
  mode: LauncherWindowSyncMode;
} | null = null;
let activeWindowSync: Promise<void> | null = null;
let lastAppliedRequestKey = "";

function getFixedPanelSize(activePanel: CommandPanel): { width: number; height: number } {
  switch (activePanel) {
    case COMMAND_PANELS.SETTINGS:
      return {
        width: SETTINGS_WINDOW_WIDTH,
        height: SETTINGS_WINDOW_HEIGHT,
      };
    case COMMAND_PANELS.AI:
      return {
        width: AI_WINDOW_WIDTH,
        height: AI_WINDOW_HEIGHT,
      };
    default:
      return {
        width: LAUNCHER_DEFAULT_WIDTH,
        height: LAUNCHER_DEFAULT_HEIGHT,
      };
  }
}

export function getLauncherWindowSizeForPanel(
  activePanel: CommandPanel,
  shouldCollapseToInputOnly: boolean,
) {
  if (activePanel === COMMAND_PANELS.COMMANDS) {
    return {
      width: LAUNCHER_DEFAULT_WIDTH,
      height: shouldCollapseToInputOnly ? 60 : LAUNCHER_DEFAULT_HEIGHT,
    };
  }

  return getFixedPanelSize(activePanel);
}

async function applyLauncherWindowRequest(
  request: LauncherWindowRequest,
  mode: LauncherWindowSyncMode,
): Promise<void> {
  if (request.key === lastAppliedRequestKey) {
    return;
  }

  if (request.kind === "commands") {
    if (mode === "transition") {
      await invoke("set_launcher_compact_mode_for_resize_transition", {
        compact: request.compact,
        compactHeight: request.compactHeight,
        compact_height: request.compactHeight,
      });
    } else {
      await setLauncherCompactMode(request.compact, request.compactHeight);
    }
  } else {
    await invoke(
      mode === "transition"
        ? "set_launcher_window_size_for_resize_transition"
        : "set_launcher_window_size",
      {
        width: request.width,
        height: request.height,
      },
    );
  }

  lastAppliedRequestKey = request.key;
}

function queueLauncherWindowRequest(
  request: LauncherWindowRequest,
  mode: LauncherWindowSyncMode = "default",
): Promise<void> {
  queuedRequest = { request, mode };

  if (activeWindowSync) {
    return activeWindowSync;
  }

  activeWindowSync = (async () => {
    while (queuedRequest) {
      const nextRequest = queuedRequest;
      queuedRequest = null;
      await applyLauncherWindowRequest(nextRequest.request, nextRequest.mode);
    }
  })()
    .catch((error) => {
      console.error("Failed to update launcher window size:", error);
    })
    .finally(() => {
      activeWindowSync = null;
      if (queuedRequest) {
        void queueLauncherWindowRequest(queuedRequest.request, queuedRequest.mode);
      }
    });

  return activeWindowSync;
}

function buildLauncherWindowRequest(
  activePanel: CommandPanel,
  shouldCollapseToInputOnly: boolean,
): LauncherWindowRequest {
  if (activePanel === COMMAND_PANELS.COMMANDS) {
    const inputWrapper = document.querySelector<HTMLElement>("[data-slot='command-input-wrapper']");
    const compactHeight = shouldCollapseToInputOnly
      ? inputWrapper
        ? Math.ceil(inputWrapper.getBoundingClientRect().height)
        : undefined
      : undefined;

    return {
      key: `commands:${shouldCollapseToInputOnly}:${compactHeight ?? LAUNCHER_DEFAULT_HEIGHT}`,
      kind: "commands",
      compact: shouldCollapseToInputOnly,
      compactHeight,
    };
  }

  const fixedSize = getFixedPanelSize(activePanel);
  return {
    key: `fixed:${fixedSize.width}x${fixedSize.height}`,
    kind: "fixed",
    width: fixedSize.width,
    height: fixedSize.height,
  };
}

export async function syncLauncherWindowToPanel(
  activePanel: CommandPanel,
  shouldCollapseToInputOnly: boolean,
  mode: LauncherWindowSyncMode = "default",
) {
  if (!isTauri()) {
    return;
  }

  await queueLauncherWindowRequest(
    buildLauncherWindowRequest(activePanel, shouldCollapseToInputOnly),
    mode,
  );
}

export async function hideLauncherWindowForResizeTransition() {
  if (!isTauri()) {
    return;
  }

  await invoke("hide_launcher_window_for_resize_transition");
}

async function revealLauncherWindowAfterResizeTransition() {
  if (!isTauri()) {
    return;
  }

  await invoke("reveal_launcher_window_after_resize_transition");
}

export function useLauncherWindowSizeSync(
  activePanel: CommandPanel,
  shouldCollapseToInputOnly: boolean,
  enabled = true,
) {
  const requestedKeyRef = useRef("");

  useLayoutEffect(() => {
    if (!enabled || !isTauri() || activePanel !== COMMAND_PANELS.COMMANDS) {
      return;
    }

    const request = buildLauncherWindowRequest(activePanel, shouldCollapseToInputOnly);
    if (request.key === requestedKeyRef.current) {
      return;
    }

    requestedKeyRef.current = request.key;
    void queueLauncherWindowRequest(request);
  }, [activePanel, shouldCollapseToInputOnly, enabled]);
}
