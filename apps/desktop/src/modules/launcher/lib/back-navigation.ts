import { useRef } from "react";

import { useMountEffect } from "@/hooks/use-mount-effect";

import type { CommandPanel } from "@/command-registry/types";

type LauncherBackHandler = () => boolean | void;

interface BackHotkeyEventLike {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

const panelBackHandlers = new Map<CommandPanel, LauncherBackHandler[]>();

function removePanelBackHandler(panel: CommandPanel, handler: LauncherBackHandler) {
  const handlers = panelBackHandlers.get(panel);
  if (!handlers || handlers.length === 0) {
    return;
  }

  const handlerIndex = handlers.lastIndexOf(handler);
  if (handlerIndex < 0) {
    return;
  }

  handlers.splice(handlerIndex, 1);
  if (handlers.length === 0) {
    panelBackHandlers.delete(panel);
  }
}

export function registerLauncherPanelBackHandler(
  panel: CommandPanel,
  handler: LauncherBackHandler,
): () => void {
  const handlers = panelBackHandlers.get(panel) ?? [];
  handlers.push(handler);
  panelBackHandlers.set(panel, handlers);

  return () => {
    removePanelBackHandler(panel, handler);
  };
}

export function runLauncherPanelBackHandler(panel: CommandPanel): boolean {
  const handlers = panelBackHandlers.get(panel);
  if (!handlers || handlers.length === 0) {
    return false;
  }

  for (let index = handlers.length - 1; index >= 0; index -= 1) {
    const handler = handlers[index];
    if (!handler) {
      continue;
    }

    try {
      const handled = handler();
      if (handled !== false) {
        return true;
      }
    } catch {
      continue;
    }
  }

  return false;
}

export function useLauncherPanelBackHandler(
  panel: CommandPanel,
  handler: LauncherBackHandler,
  enabled = true,
) {
  const registrationRef = useRef<{
    panel: CommandPanel;
    handler: LauncherBackHandler;
    enabled: boolean;
    cleanup?: () => void;
  } | null>(null);

  const currentRegistration = registrationRef.current;
  const needsUpdate =
    !currentRegistration ||
    currentRegistration.panel !== panel ||
    currentRegistration.handler !== handler ||
    currentRegistration.enabled !== enabled;

  if (needsUpdate) {
    currentRegistration?.cleanup?.();
    registrationRef.current = {
      panel,
      handler,
      enabled,
      cleanup: enabled ? registerLauncherPanelBackHandler(panel, handler) : undefined,
    };
  }

  useMountEffect(() => {
    return () => {
      registrationRef.current?.cleanup?.();
    };
  });
}

export function isLauncherBackHotkey(event: BackHotkeyEventLike): boolean {
  const key = event.key.toLowerCase();

  if (!event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey && key === "escape") {
    return true;
  }

  if ((event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && key === "[") {
    return true;
  }

  if (event.altKey && !event.metaKey && !event.ctrlKey && !event.shiftKey && key === "arrowleft") {
    return true;
  }

  return false;
}
