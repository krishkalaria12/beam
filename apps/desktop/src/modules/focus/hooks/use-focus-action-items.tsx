import { Check, Focus, Pause, Play, RotateCcw } from "lucide-react";
import { useMemo } from "react";

import type { LauncherActionItem } from "@/modules/launcher/types";

import { useFocusMutations, useFocusStatus } from "./use-focus";

export function useFocusActionItems(enabled: boolean): LauncherActionItem[] {
  const { data: status } = useFocusStatus(enabled);
  const mutations = useFocusMutations();

  return useMemo(() => {
    if (!enabled) {
      return [];
    }

    const session = status?.session ?? null;
    const activeSession = session && session.status !== "completed" ? session : null;
    const isRunning = activeSession?.status === "running";
    const isPaused = activeSession?.status === "paused";
    const isBusy = Object.values(mutations).some((mutation) => mutation.isPending);

    return [
      {
        id: "focus-start-last-draft",
        label: activeSession ? "Restart Focus Session" : "Start Focus Session",
        description: activeSession
          ? "Start a new session from the saved draft"
          : "Start from the saved Focus draft",
        icon: <Focus className="size-4" />,
        keywords: ["focus", "start", "restart", "session"],
        disabled: isBusy || !status?.lastDraft,
        onSelect: () => {
          if (!status?.lastDraft) {
            return;
          }
          void mutations.startSession.mutateAsync(status.lastDraft);
        },
      },
      {
        id: "focus-toggle-session",
        label: "Toggle Focus Session",
        description: activeSession
          ? "Pause or resume the current session"
          : "Start the saved draft",
        icon: <RotateCcw className="size-4" />,
        keywords: ["focus", "toggle", "pause", "resume"],
        disabled: isBusy,
        onSelect: () => {
          void mutations.toggleSession.mutateAsync();
        },
      },
      {
        id: "focus-pause-session",
        label: "Pause Focus Session",
        description: isRunning ? activeSession.goal : "No running Focus session",
        icon: <Pause className="size-4" />,
        keywords: ["focus", "pause", "session"],
        disabled: isBusy || !isRunning,
        onSelect: () => {
          void mutations.pauseSession.mutateAsync();
        },
      },
      {
        id: "focus-resume-session",
        label: "Resume Focus Session",
        description: isPaused ? activeSession.goal : "No paused Focus session",
        icon: <Play className="size-4" />,
        keywords: ["focus", "resume", "session"],
        disabled: isBusy || !isPaused,
        onSelect: () => {
          void mutations.resumeSession.mutateAsync();
        },
      },
      {
        id: "focus-complete-session",
        label: "Complete Focus Session",
        description: activeSession ? activeSession.goal : "No active Focus session",
        icon: <Check className="size-4" />,
        keywords: ["focus", "complete", "stop", "end"],
        disabled: isBusy || !activeSession,
        onSelect: () => {
          void mutations.completeSession.mutateAsync();
        },
      },
    ];
  }, [enabled, mutations, status]);
}
