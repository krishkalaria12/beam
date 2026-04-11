const LAUNCHER_ACTIONS_TOGGLE_EVENT = "beam:launcher-actions-toggle";

interface LauncherActionsHotkeyEvent {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

export function isLauncherActionsHotkey(event: LauncherActionsHotkeyEvent): boolean {
  return (
    (event.metaKey || event.ctrlKey) &&
    !event.shiftKey &&
    !event.altKey &&
    event.key.toLowerCase() === "k"
  );
}

export function requestLauncherActionsToggle(): void {
  window.dispatchEvent(new CustomEvent(LAUNCHER_ACTIONS_TOGGLE_EVENT));
}

export function listenLauncherActionsToggle(handler: () => void): () => void {
  const listener = () => {
    handler();
  };

  window.addEventListener(LAUNCHER_ACTIONS_TOGGLE_EVENT, listener);
  return () => {
    window.removeEventListener(LAUNCHER_ACTIONS_TOGGLE_EVENT, listener);
  };
}
