import { ChevronLeft, FolderOpen, Play, Plus, Search, Terminal } from "lucide-react";
import { useCallback, useEffect, useEffectEvent, useMemo, useReducer } from "react";
import { toast } from "sonner";

import { ModuleFooter } from "@/components/module";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLauncherPanelBackHandler } from "@/modules/launcher/lib/back-navigation";
import { openScriptCommandsDirectory } from "@/modules/script-commands/api/open-script-commands-directory";
import { ScriptCommandArgumentsForm } from "@/modules/script-commands/components/script-command-arguments-form";
import { ScriptCommandCreateForm } from "@/modules/script-commands/components/script-command-create-form";
import { ScriptCommandsList } from "@/modules/script-commands/components/script-commands-list";
import { ScriptCommandsOutput } from "@/modules/script-commands/components/script-commands-output";
import { useCreateScriptCommandMutation } from "@/modules/script-commands/hooks/use-create-script-command-mutation";
import { useRunScriptCommandMutation } from "@/modules/script-commands/hooks/use-run-script-command-mutation";
import { useScriptCommandsQuery } from "@/modules/script-commands/hooks/use-script-commands-query";
import {
  clearScriptCommandActionsState,
  syncScriptCommandActionsState,
} from "@/modules/script-commands/hooks/use-script-command-action-items";
import { useMountEffect } from "@/hooks/use-mount-effect";
import type {
  CreateScriptCommandRequest,
  ScriptCommandSummary,
  ScriptExecutionResult,
} from "@/modules/script-commands/types";

interface ScriptCommandsViewProps {
  onBack: () => void;
}

type ScriptCommandsViewMode = "manage" | "create" | "arguments";

interface ScriptCommandsViewState {
  viewMode: ScriptCommandsViewMode;
  search: string;
  selectedScriptId: string | null;
  argumentScriptId: string | null;
  scriptArgumentValues: Record<string, Record<string, string>>;
  createErrorMessage: string | null;
  runErrorMessage: string | null;
  executionResult: ScriptExecutionResult | null;
}

type ScriptCommandsViewAction =
  | { type: "set-view-mode"; value: ScriptCommandsViewMode }
  | { type: "set-search"; value: string }
  | { type: "set-selected-script-id"; value: string | null }
  | { type: "set-argument-script-id"; value: string | null }
  | { type: "set-argument-values"; scriptId: string; value: Record<string, string> }
  | { type: "set-create-error"; value: string | null }
  | { type: "set-run-error"; value: string | null }
  | { type: "set-execution-result"; value: ScriptExecutionResult | null };

const INITIAL_SCRIPT_COMMANDS_VIEW_STATE: ScriptCommandsViewState = {
  viewMode: "manage",
  search: "",
  selectedScriptId: null,
  argumentScriptId: null,
  scriptArgumentValues: {},
  createErrorMessage: null,
  runErrorMessage: null,
  executionResult: null,
};

function scriptCommandsViewReducer(
  state: ScriptCommandsViewState,
  action: ScriptCommandsViewAction,
): ScriptCommandsViewState {
  switch (action.type) {
    case "set-view-mode":
      return { ...state, viewMode: action.value };
    case "set-search":
      return { ...state, search: action.value };
    case "set-selected-script-id":
      return { ...state, selectedScriptId: action.value };
    case "set-argument-script-id":
      return { ...state, argumentScriptId: action.value };
    case "set-argument-values":
      return {
        ...state,
        scriptArgumentValues: {
          ...state.scriptArgumentValues,
          [action.scriptId]: action.value,
        },
      };
    case "set-create-error":
      return { ...state, createErrorMessage: action.value };
    case "set-run-error":
      return { ...state, runErrorMessage: action.value };
    case "set-execution-result":
      return { ...state, executionResult: action.value };
  }
}

function getScriptExecutionSuccessMessage(message: string | null | undefined) {
  return message || "Script finished.";
}

function getScriptExecutionFailureMessage(message: string | null | undefined) {
  return message || "Script failed.";
}

function ScriptCommandsHeader({
  onBack,
  scripts,
}: {
  onBack: () => void;
  scripts: ScriptCommandSummary[];
}) {
  return (
    <header className="scripts-header-enter flex h-14 shrink-0 items-center gap-3 border-b border-[var(--launcher-card-border)] px-4">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onBack}
        className="flex size-9 items-center justify-center rounded-lg bg-[var(--launcher-card-hover-bg)] text-muted-foreground transition-all duration-200 hover:bg-[var(--launcher-card-hover-bg)] hover:text-muted-foreground"
        aria-label="Back"
      >
        <ChevronLeft className="size-4" />
      </Button>

      <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--launcher-card-bg)]">
        <Terminal className="size-5 text-[var(--icon-green-fg)]" />
      </div>

      <div className="min-w-0 flex-1">
        <h1 className="text-launcher-lg font-semibold tracking-[-0.02em] text-foreground">
          Script Commands
        </h1>
        <p className="text-launcher-sm tracking-[-0.01em] text-muted-foreground">
          Run local scripts from Beam
        </p>
      </div>

      <div className="flex items-center gap-1.5 rounded-full bg-[var(--launcher-card-hover-bg)] px-2.5 py-1 text-launcher-xs font-medium text-muted-foreground">
        <Terminal className="size-3" />
        <span>{scripts.length > 0 ? `${scripts.length} scripts` : "No scripts"}</span>
      </div>
    </header>
  );
}

function ScriptCommandsToolbar({
  search,
  onSearchChange,
  onCreate,
  onOpenFolder,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  onCreate: () => void;
  onOpenFolder: () => void;
}) {
  return (
    <div className="scripts-toolbar-enter flex items-center gap-2 border-b border-[var(--launcher-card-border)] px-4 py-2.5">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search scripts..."
          className="h-10 w-full rounded-xl bg-[var(--launcher-card-hover-bg)] pl-9 pr-4 text-launcher-md text-foreground placeholder:text-muted-foreground ring-1 ring-[var(--launcher-card-border)] transition-all duration-200 focus:outline-none focus:ring-[var(--ring)] focus:bg-[var(--launcher-card-hover-bg)]"
        />
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onCreate}
        className="flex h-10 items-center gap-2 rounded-xl bg-[var(--launcher-card-hover-bg)] px-3.5 text-launcher-sm font-medium text-muted-foreground ring-1 ring-[var(--launcher-card-border)] transition-all duration-200 hover:bg-[var(--launcher-card-hover-bg)] hover:text-foreground"
      >
        <Plus className="size-3.5" />
        New
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onOpenFolder}
        className="flex h-10 items-center gap-2 rounded-xl bg-[var(--launcher-card-hover-bg)] px-3.5 text-launcher-sm font-medium text-muted-foreground ring-1 ring-[var(--launcher-card-border)] transition-all duration-200 hover:bg-[var(--launcher-card-hover-bg)] hover:text-foreground"
      >
        <FolderOpen className="size-3.5" />
        Folder
      </Button>
    </div>
  );
}

function ScriptCommandsFooter({
  filteredScripts,
  selectedScriptNeedsArguments,
  selectedScript,
  isRunning,
  onRunSelected,
}: {
  filteredScripts: ScriptCommandSummary[];
  selectedScriptNeedsArguments: boolean;
  selectedScript: ScriptCommandSummary | null;
  isRunning: boolean;
  onRunSelected: () => void;
}) {
  return (
    <ModuleFooter
      className="scripts-footer-enter border-[var(--launcher-card-border)]"
      leftSlot={
        <>
          <Terminal className="size-3.5" />
          <span>{filteredScripts.length} visible</span>
        </>
      }
      shortcuts={[
        { keys: ["Enter"], label: selectedScriptNeedsArguments ? "Args & Run" : "Run Selected" },
        { keys: ["⌘N"], label: "New Script" },
      ]}
      actions={
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRunSelected}
          disabled={!selectedScript || isRunning}
          className="flex h-7 items-center gap-1.5 rounded-lg bg-[var(--ring)]/20 px-3 text-launcher-sm font-medium text-[var(--ring)] transition-all duration-200 hover:bg-[var(--ring)]/30 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Play className="size-3.5" />
          {selectedScriptNeedsArguments ? "Args & Run" : "Run"}
        </Button>
      }
    />
  );
}

export function ScriptCommandsView({ onBack }: ScriptCommandsViewProps) {
  const scriptsQuery = useScriptCommandsQuery();
  const runMutation = useRunScriptCommandMutation();
  const createMutation = useCreateScriptCommandMutation();

  const [state, dispatch] = useReducer(
    scriptCommandsViewReducer,
    INITIAL_SCRIPT_COMMANDS_VIEW_STATE,
  );

  const scripts = scriptsQuery.data ?? [];
  const normalizedSearch = state.search.trim().toLowerCase();

  useMountEffect(() => clearScriptCommandActionsState);

  const filteredScripts = useMemo(
    () =>
      scripts.filter((script) => {
        if (!normalizedSearch) {
          return true;
        }

        const haystack = `${script.title} ${script.scriptName} ${script.subtitle}`.toLowerCase();
        return haystack.includes(normalizedSearch);
      }),
    [normalizedSearch, scripts],
  );

  const resolvedSelectedScriptId = filteredScripts.some(
    (script) => script.id === state.selectedScriptId,
  )
    ? state.selectedScriptId
    : (filteredScripts[0]?.id ?? null);

  const selectedScript = useMemo(
    () => filteredScripts.find((script) => script.id === resolvedSelectedScriptId) ?? null,
    [filteredScripts, resolvedSelectedScriptId],
  );

  const argumentScript = useMemo(
    () => scripts.find((script) => script.id === state.argumentScriptId) ?? null,
    [state.argumentScriptId, scripts],
  );

  const resolvedViewMode =
    state.viewMode === "arguments" && !argumentScript ? "manage" : state.viewMode;

  if (state.viewMode !== resolvedViewMode) {
    dispatch({ type: "set-view-mode", value: resolvedViewMode });
  }

  const handleWindowKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (resolvedViewMode !== "manage") {
      return;
    }

    if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "n") {
      return;
    }

    const target = event.target;
    if (target instanceof HTMLElement) {
      const tag = target.tagName.toLowerCase();
      if (tag === "input" || tag === "textarea" || target.isContentEditable) {
        return;
      }
    }

    event.preventDefault();
    dispatch({ type: "set-run-error", value: null });
    dispatch({ type: "set-selected-script-id", value: null });
    dispatch({ type: "set-argument-script-id", value: null });
    dispatch({ type: "set-view-mode", value: "create" });
  });

  const executeScriptById = useCallback(
    async (scriptId: string, argumentValues?: Record<string, string>) => {
      dispatch({ type: "set-run-error", value: null });
      const normalizedArgumentValues = argumentValues ?? {};

      try {
        const result = await runMutation.mutateAsync({
          commandId: scriptId,
          background: false,
          arguments: normalizedArgumentValues,
        });
        const successMessage = getScriptExecutionSuccessMessage(result.message);
        const failureMessage = getScriptExecutionFailureMessage(result.message);

        dispatch({ type: "set-execution-result", value: result });
        if (result.exitCode === 0) {
          toast.success(successMessage);
        } else {
          toast.error(failureMessage);
        }
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to run script.";
        dispatch({ type: "set-run-error", value: message });
        toast.error(message);
        return false;
      }
    },
    [runMutation],
  );

  const openRunFlow = useCallback(
    (script: ScriptCommandSummary) => {
      dispatch({ type: "set-run-error", value: null });
      dispatch({ type: "set-selected-script-id", value: script.id });
      dispatch({ type: "set-argument-script-id", value: script.id });
      if (script.argumentDefinitions.length > 0) {
        dispatch({ type: "set-view-mode", value: "arguments" });
        return;
      }
      void executeScriptById(script.id);
    },
    [executeScriptById],
  );

  const handleRunById = useCallback(
    (scriptId: string) => {
      const script = scripts.find((entry) => entry.id === scriptId);
      if (!script) {
        return;
      }
      openRunFlow(script);
    },
    [openRunFlow, scripts],
  );

  const handleRunSelected = useCallback(() => {
    if (!selectedScript) {
      return;
    }
    openRunFlow(selectedScript);
  }, [openRunFlow, selectedScript]);

  useEffect(() => {
    syncScriptCommandActionsState({
      selectedScript,
      onRunSelected: handleRunSelected,
    });
  }, [handleRunSelected, selectedScript]);

  const handleRunWithArguments = useCallback(
    async (argumentValues: Record<string, string>) => {
      if (!argumentScript) {
        return;
      }

      dispatch({ type: "set-argument-values", scriptId: argumentScript.id, value: argumentValues });

      const didRun = await executeScriptById(argumentScript.id, argumentValues);
      if (didRun) {
        dispatch({ type: "set-selected-script-id", value: argumentScript.id });
        dispatch({ type: "set-view-mode", value: "manage" });
      }
    },
    [argumentScript, executeScriptById],
  );

  const handleCreateScript = useCallback(
    async (request: CreateScriptCommandRequest) => {
      dispatch({ type: "set-create-error", value: null });
      try {
        const created = await createMutation.mutateAsync(request);
        dispatch({ type: "set-search", value: "" });
        dispatch({ type: "set-selected-script-id", value: created.id });
        dispatch({ type: "set-view-mode", value: "manage" });
        toast.success(`Created ${created.scriptName}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create script.";
        dispatch({ type: "set-create-error", value: message });
      }
    },
    [createMutation],
  );

  const openCreateView = useCallback(() => {
    dispatch({ type: "set-create-error", value: null });
    dispatch({ type: "set-view-mode", value: "create" });
  }, []);

  const handleOpenFolder = useCallback(async () => {
    try {
      await openScriptCommandsDirectory();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to open script folder.";
      toast.error(message);
    }
  }, []);

  const handleBack = useCallback(() => {
    if (state.viewMode === "create" || state.viewMode === "arguments") {
      dispatch({ type: "set-view-mode", value: "manage" });
      return;
    }
    onBack();
  }, [onBack, state.viewMode]);

  useLauncherPanelBackHandler("script-commands", handleBack);

  useMountEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      handleWindowKeyDown(event);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  });

  if (resolvedViewMode === "create") {
    return (
      <ScriptCommandCreateForm
        onBack={handleBack}
        isSubmitting={createMutation.isPending}
        errorMessage={state.createErrorMessage}
        onSubmit={handleCreateScript}
      />
    );
  }

  if (resolvedViewMode === "arguments" && argumentScript) {
    return (
      <ScriptCommandArgumentsForm
        key={argumentScript.id}
        script={argumentScript}
        initialValues={state.scriptArgumentValues[argumentScript.id]}
        isSubmitting={runMutation.isPending}
        errorMessage={state.runErrorMessage}
        onBack={handleBack}
        onSubmit={handleRunWithArguments}
      />
    );
  }

  const selectedScriptNeedsArguments = selectedScript
    ? selectedScript.argumentDefinitions.length > 0
    : false;

  return (
    <div className="scripts-view-enter flex h-full w-full flex-col overflow-hidden text-foreground">
      <ScriptCommandsHeader onBack={handleBack} scripts={scripts} />

      <ScriptCommandsToolbar
        search={state.search}
        onSearchChange={(value) => dispatch({ type: "set-search", value })}
        onCreate={openCreateView}
        onOpenFolder={() => {
          void handleOpenFolder();
        }}
      />

      {/* Main content */}
      <div className="scripts-content-enter flex min-h-0 flex-1 overflow-hidden">
        {/* Scripts list */}
        <div className="w-[42%] border-r border-[var(--launcher-card-border)]">
          <ScriptCommandsList
            scripts={filteredScripts}
            selectedScriptId={state.selectedScriptId}
            isLoading={scriptsQuery.isLoading}
            onSelect={(value) => dispatch({ type: "set-selected-script-id", value })}
            onRun={(scriptId) => void handleRunById(scriptId)}
          />
        </div>

        {/* Output panel */}
        <div className="flex-1 bg-[var(--launcher-card-hover-bg)]">
          <ScriptCommandsOutput
            selectedScript={selectedScript}
            executionResult={state.executionResult}
            runErrorMessage={state.runErrorMessage}
            isRunning={runMutation.isPending}
          />
        </div>
      </div>

      <ScriptCommandsFooter
        filteredScripts={filteredScripts}
        selectedScriptNeedsArguments={selectedScriptNeedsArguments}
        selectedScript={selectedScript}
        isRunning={runMutation.isPending}
        onRunSelected={handleRunSelected}
      />
    </div>
  );
}
