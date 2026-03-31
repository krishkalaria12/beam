import { useRef } from "react";
import { toast, type ExternalToast } from "sonner";

import { useMountEffect } from "@/hooks/use-mount-effect";
import { extensionManagerService } from "@/modules/extensions/extension-manager-service";
import { type ExtensionToast, useExtensionRuntimeStore } from "@/modules/extensions/runtime/store";

const MAX_BRIDGE_TOAST_TITLE_LENGTH = 120;
const MAX_BRIDGE_TOAST_MESSAGE_LENGTH = 320;
const MAX_BRIDGE_TOAST_ACTION_LENGTH = 48;

function clampToastText(value: string | undefined, maxLength: number): string | undefined {
  if (!value) {
    return undefined;
  }

  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length === 0) {
    return undefined;
  }

  if (compact.length <= maxLength) {
    return compact;
  }

  return `${compact.slice(0, maxLength - 1).trimEnd()}…`;
}

function safeDispatchToastAction(toastId: number, actionType: "primary" | "secondary") {
  try {
    extensionManagerService.dispatchToastAction(toastId, actionType);
  } catch {
    // Ignore action dispatch failures when the extension manager is no longer running.
  }
}

function safeTriggerToastHide(toastId: number) {
  try {
    extensionManagerService.triggerToastHide(toastId);
  } catch {
    // Ignore hide dispatch failures when the extension manager is no longer running.
  }
}

function showOrUpdateToast(entry: ExtensionToast) {
  const title = clampToastText(entry.title, MAX_BRIDGE_TOAST_TITLE_LENGTH) || "Extension";
  const description = clampToastText(entry.message, MAX_BRIDGE_TOAST_MESSAGE_LENGTH);

  const options: ExternalToast = {
    id: entry.id,
    description,
    dismissible: true,
    duration: entry.style === "ANIMATED" ? Number.POSITIVE_INFINITY : undefined,
    onDismiss: () => {
      safeTriggerToastHide(entry.id);
    },
    onAutoClose: () => {
      safeTriggerToastHide(entry.id);
    },
  };

  if (entry.primaryAction?.onAction) {
    options.action = {
      label: clampToastText(entry.primaryAction.title, MAX_BRIDGE_TOAST_ACTION_LENGTH) || "Action",
      onClick: () => {
        safeDispatchToastAction(entry.id, "primary");
      },
    };
  }

  if (entry.secondaryAction?.onAction) {
    options.cancel = {
      label: clampToastText(entry.secondaryAction.title, MAX_BRIDGE_TOAST_ACTION_LENGTH) || "Cancel",
      onClick: () => {
        safeDispatchToastAction(entry.id, "secondary");
      },
    };
  }

  if (entry.style === "SUCCESS") {
    toast.success(title, options);
    return;
  }
  if (entry.style === "FAILURE") {
    toast.error(title, options);
    return;
  }
  if (entry.style === "ANIMATED") {
    toast.loading(title, options);
    return;
  }

  toast.message(title, options);
}

function reconcileDisplayedToasts(
  nextToasts: ExtensionToast[],
  displayedToastIdsRef: React.MutableRefObject<Set<number>>,
) {
  const nextIds = new Set<number>();

  for (const entry of nextToasts) {
    nextIds.add(entry.id);
    showOrUpdateToast(entry);
  }

  for (const toastId of displayedToastIdsRef.current) {
    if (!nextIds.has(toastId)) {
      toast.dismiss(toastId);
    }
  }

  displayedToastIdsRef.current = nextIds;
}

export function ExtensionToastBridge() {
  const displayedToastIdsRef = useRef<Set<number>>(new Set());

  useMountEffect(() => {
    reconcileDisplayedToasts(useExtensionRuntimeStore.getState().toasts, displayedToastIdsRef);

    const unsubscribe = useExtensionRuntimeStore.subscribe((state) => {
      reconcileDisplayedToasts(state.toasts, displayedToastIdsRef);
    });

    return () => {
      unsubscribe();
      for (const toastId of displayedToastIdsRef.current) {
        toast.dismiss(toastId);
      }
      displayedToastIdsRef.current.clear();
    };
  });

  return null;
}
