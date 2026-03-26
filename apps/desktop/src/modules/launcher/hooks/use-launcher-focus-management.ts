import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffectEvent, useRef } from "react";

import type { CommandPanel } from "@/command-registry/types";
import { useMountEffect } from "@/hooks/use-mount-effect";

function focusLauncherInputElement() {
  const input = document.querySelector<HTMLInputElement>('[data-slot="command-input"]');
  if (!input || document.activeElement === input) {
    return;
  }

  input.focus({ preventScroll: true });
}

async function focusLauncherWindow() {
  if (!isTauri()) {
    window.focus();
    return;
  }

  try {
    await getCurrentWindow().setFocus();
  } catch {
    window.focus();
  }
}

interface UseLauncherFocusManagementInput {
  activePanel: CommandPanel;
  isInputHidden: boolean;
}

export function useLauncherFocusManagement({
  activePanel,
  isInputHidden,
}: UseLauncherFocusManagementInput) {
  useMountEffect(() => {
    let cancelled = false;

    const scheduleFocus = () => {
      if (document.visibilityState === "hidden") {
        return;
      }

      window.requestAnimationFrame(() => {
        if (cancelled) {
          return;
        }
        void focusLauncherWindow();
        focusLauncherInputElement();
      });
    };

    scheduleFocus();
    window.addEventListener("focus", scheduleFocus);
    document.addEventListener("visibilitychange", scheduleFocus);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", scheduleFocus);
      document.removeEventListener("visibilitychange", scheduleFocus);
    };
  });

  const focusInputFrameRef = useRef<number | null>(null);
  const focusInputKeyRef = useRef("");
  const syncFocusedInput = useEffectEvent(() => {
    const focusInputKey = `${activePanel}:${isInputHidden}`;
    if (focusInputKeyRef.current === focusInputKey) {
      return;
    }

    focusInputKeyRef.current = focusInputKey;
    if (focusInputFrameRef.current !== null) {
      window.cancelAnimationFrame(focusInputFrameRef.current);
    }
    if (activePanel === "commands" && !isInputHidden) {
      focusInputFrameRef.current = window.requestAnimationFrame(() => {
        focusInputFrameRef.current = null;
        focusLauncherInputElement();
      });
    }
  });

  useMountEffect(() => {
    syncFocusedInput();
    const intervalId = window.setInterval(() => {
      syncFocusedInput();
    }, 120);

    return () => {
      window.clearInterval(intervalId);
    };
  });

  useMountEffect(() => {
    return () => {
      if (focusInputFrameRef.current !== null) {
        window.cancelAnimationFrame(focusInputFrameRef.current);
      }
    };
  });
}
