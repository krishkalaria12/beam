import { useReducer } from "react";
import { AlertTriangle, Check, Focus, Globe2, Loader2, Play, Shield } from "lucide-react";
import { toast } from "sonner";

import { IconChip, ModuleFooter, ModuleHeader } from "@/components/module";
import { Button } from "@/components/ui/button";
import { useLauncherPanelBackHandler } from "@/modules/launcher/lib/back-navigation";
import {
  useFocusEvents,
  useFocusMutations,
  useFocusStatus,
  type FocusMutations,
} from "@/modules/focus/hooks/use-focus";
import type { FocusSession, FocusSessionDraft, FocusStatus } from "@/modules/focus/types";

import { FocusCategoriesTab } from "./focus-categories-tab";
import { FocusImportTab } from "./focus-import-tab";
import { FocusSessionTab } from "./focus-session-tab";
import {
  createFocusViewState,
  focusViewReducer,
  focusViewStateToDraft,
  textToRules,
  textToWebsiteRules,
} from "./focus-view-state";

interface FocusViewProps {
  onBack: () => void;
}

const DEFAULT_DRAFT: FocusSessionDraft = {
  goal: "Deep work",
  durationSeconds: 25 * 60,
  mode: "block",
  categoryIds: [],
  apps: [],
  websites: [],
};

function formatRemaining(ms: number | null): string {
  if (ms === null) {
    return "Untimed";
  }
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function sessionToDraft(session: FocusSession): FocusSessionDraft {
  return {
    goal: session.goal,
    durationSeconds: session.durationSeconds,
    mode: session.mode,
    categoryIds: session.categoryIds,
    apps: session.directApps,
    websites: session.directWebsites,
  };
}

function currentSessionDraft(
  statusDraft: FocusSessionDraft,
  session: FocusSession | null,
): FocusSessionDraft {
  if (session) {
    return sessionToDraft(session);
  }
  return statusDraft;
}

function getRemainingMs(
  activeSession: FocusSession | null,
  now: number | undefined,
): number | null {
  if (!activeSession?.endsAt) {
    return null;
  }

  if (activeSession.status === "paused" && activeSession.pausedAt) {
    return activeSession.endsAt - activeSession.pausedAt;
  }

  if (activeSession.status === "running") {
    return activeSession.endsAt - (now ?? Date.now());
  }

  return null;
}

export function FocusView({ onBack }: FocusViewProps) {
  useLauncherPanelBackHandler("focus", onBack);
  useFocusEvents();

  const { data: status, isLoading, isFetching } = useFocusStatus();
  const mutations = useFocusMutations();

  const session = status?.session ?? null;
  const activeSession = session && session.status !== "completed" ? session : null;
  const statusDraft = status?.lastDraft ?? DEFAULT_DRAFT;
  const effectiveDraft = currentSessionDraft(statusDraft, activeSession);
  const draftKey = JSON.stringify(effectiveDraft);

  return (
    <FocusViewContent
      key={draftKey}
      onBack={onBack}
      status={status}
      isLoading={isLoading}
      isFetching={isFetching}
      activeSession={activeSession}
      initialDraft={effectiveDraft}
      mutations={mutations}
    />
  );
}

interface FocusViewContentProps {
  onBack: () => void;
  status: FocusStatus | undefined;
  isLoading: boolean;
  isFetching: boolean;
  activeSession: FocusSession | null;
  initialDraft: FocusSessionDraft;
  mutations: FocusMutations;
}

function FocusViewContent({
  onBack,
  status,
  isLoading,
  isFetching,
  activeSession,
  initialDraft,
  mutations,
}: FocusViewContentProps) {
  const [state, dispatch] = useReducer(focusViewReducer, initialDraft, createFocusViewState);

  const remainingMs = getRemainingMs(activeSession, status?.now);
  const remainingText = formatRemaining(remainingMs);
  const isBusy = Object.values(mutations).some((mutation) => mutation.isPending);

  async function handleStartOrSave() {
    const draft = focusViewStateToDraft(state);
    if (!draft.goal) {
      toast.error("Focus goal is required.");
      return;
    }

    if (activeSession) {
      await mutations.editSession.mutateAsync(draft);
      return;
    }

    await mutations.startSession.mutateAsync(draft);
  }

  async function handleSaveCategory() {
    const input = {
      title: state.categoryEditor.title.trim(),
      apps: textToRules(state.categoryEditor.appsText),
      websites: textToWebsiteRules(state.categoryEditor.websitesText),
    };
    if (!input.title) {
      toast.error("Category title is required.");
      return;
    }

    if (state.categoryEditor.id) {
      await mutations.updateCategory.mutateAsync({ id: state.categoryEditor.id, input });
    } else {
      await mutations.createCategory.mutateAsync(input);
    }
    dispatch({ type: "new-category" });
  }

  async function handleImport() {
    if (!state.importText.trim()) {
      return;
    }
    await mutations.importCategories.mutateAsync(state.importText);
    dispatch({ type: "set-import-text", value: "" });
    dispatch({ type: "set-tab", tab: "categories" });
  }

  async function handleSnoozeApp() {
    const target = state.snoozeTarget.trim();
    if (!target) {
      toast.error("Enter an app or website to snooze.");
      return;
    }
    await mutations.snoozeTarget.mutateAsync({
      targetType: state.snoozeTargetType,
      target,
      durationSeconds: 5 * 60,
    });
    dispatch({ type: "set-snooze-target", value: "" });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ModuleHeader
        onBack={onBack}
        title="Focus Mode"
        subtitle={
          activeSession
            ? `${activeSession.status === "paused" ? "Paused" : "Running"} - ${activeSession.goal}`
            : "Start and manage distraction blocking"
        }
        icon={
          <IconChip variant="primary">
            <Focus className="size-4" />
          </IconChip>
        }
        rightSlot={
          isFetching ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null
        }
      />

      <div className="flex h-10 shrink-0 items-center gap-1 border-b border-[var(--launcher-card-border)] px-4">
        {(["session", "categories", "import"] as const).map((tab) => (
          <Button
            key={tab}
            size="sm"
            variant={state.tab === tab ? "secondary" : "ghost"}
            onClick={() => dispatch({ type: "set-tab", tab })}
            className="capitalize"
          >
            {tab}
          </Button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />
            Loading focus mode
          </div>
        ) : null}

        {!isLoading && state.tab === "session" ? (
          <FocusSessionTab
            state={state}
            dispatch={dispatch}
            status={status}
            activeSession={activeSession}
            remainingText={remainingText}
            mutations={mutations}
            onSnooze={handleSnoozeApp}
          />
        ) : null}

        {!isLoading && state.tab === "categories" ? (
          <FocusCategoriesTab
            state={state}
            dispatch={dispatch}
            status={status}
            mutations={mutations}
            isBusy={isBusy}
            onSaveCategory={handleSaveCategory}
          />
        ) : null}

        {!isLoading && state.tab === "import" ? (
          <FocusImportTab
            state={state}
            dispatch={dispatch}
            isBusy={isBusy}
            onImport={handleImport}
          />
        ) : null}
      </div>

      <ModuleFooter
        leftSlot={
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex min-w-0 items-center gap-1.5">
              {status?.capabilities.appBlockingSupported ? (
                <Shield className="size-3.5 shrink-0" />
              ) : (
                <AlertTriangle className="size-3.5 shrink-0" />
              )}
              <span className="truncate">{status?.capabilities.backend ?? "focus"}</span>
            </span>
            <span className="flex min-w-0 items-center gap-1.5">
              {status?.capabilities.websiteBlockingSupported ? (
                <Globe2 className="size-3.5 shrink-0" />
              ) : (
                <AlertTriangle className="size-3.5 shrink-0" />
              )}
              <span className="truncate">
                {status?.capabilities.websiteBlockingSupported
                  ? "browser connected"
                  : "browser missing"}
              </span>
            </span>
          </span>
        }
        actions={
          state.tab === "session" ? (
            <Button size="sm" onClick={handleStartOrSave} disabled={isBusy}>
              {activeSession ? <Check className="size-4" /> : <Play className="size-4" />}
              {activeSession ? "Save" : "Start"}
            </Button>
          ) : null
        }
      />
    </div>
  );
}
