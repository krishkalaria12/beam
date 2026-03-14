export const EXTENSION_RUNNER_ACTIONS_TOGGLE_EVENT = "beam:extension-runner-actions-toggle";

export function requestExtensionRunnerActionsToggle(): void {
  window.dispatchEvent(new Event(EXTENSION_RUNNER_ACTIONS_TOGGLE_EVENT));
}

export function listenExtensionRunnerActionsToggle(handler: () => void): () => void {
  window.addEventListener(EXTENSION_RUNNER_ACTIONS_TOGGLE_EVENT, handler);
  return () => {
    window.removeEventListener(EXTENSION_RUNNER_ACTIONS_TOGGLE_EVENT, handler);
  };
}
