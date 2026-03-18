import { ChevronLeft, FolderOpen, Play, Plus, Search, Terminal } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
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

export function ScriptCommandsView({ onBack }: ScriptCommandsViewProps) {
  const scriptsQuery = useScriptCommandsQuery();
  const runMutation = useRunScriptCommandMutation();
  const createMutation = useCreateScriptCommandMutation();

  const [viewMode, setViewMode] = useState<ScriptCommandsViewMode>("manage");
  const [search, setSearch] = useState("");
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);
  const [argumentScriptId, setArgumentScriptId] = useState<string | null>(null);
  const [scriptArgumentValues, setScriptArgumentValues] = useState<
    Record<string, Record<string, string>>
  >({});
  const [createErrorMessage, setCreateErrorMessage] = useState<string | null>(null);
  const [runErrorMessage, setRunErrorMessage] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<ScriptExecutionResult | null>(null);
  const viewModeRef = useRef(viewMode);

  const scripts = scriptsQuery.data ?? [];
  const normalizedSearch = search.trim().toLowerCase();

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

  const resolvedSelectedScriptId = filteredScripts.some((script) => script.id === selectedScriptId)
    ? selectedScriptId
    : (filteredScripts[0]?.id ?? null);

  if (selectedScriptId !== resolvedSelectedScriptId) {
    setSelectedScriptId(resolvedSelectedScriptId);
  }

  const selectedScript = useMemo(
    () => filteredScripts.find((script) => script.id === resolvedSelectedScriptId) ?? null,
    [filteredScripts, resolvedSelectedScriptId],
  );

  const argumentScript = useMemo(
    () => scripts.find((script) => script.id === argumentScriptId) ?? null,
    [argumentScriptId, scripts],
  );

  const resolvedViewMode = viewMode === "arguments" && !argumentScript ? "manage" : viewMode;

  if (viewMode !== resolvedViewMode) {
    setViewMode(resolvedViewMode);
  }

  viewModeRef.current = resolvedViewMode;

  const executeScriptById = useCallback(
    async (scriptId: string, argumentValues?: Record<string, string>) => {
      setRunErrorMessage(null);
      try {
        const result = await runMutation.mutateAsync({
          commandId: scriptId,
          background: false,
          arguments: argumentValues ?? {},
        });
        setExecutionResult(result);
        if (result.exitCode === 0) {
          toast.success(result.message || "Script finished.");
        } else {
          toast.error(result.message || "Script failed.");
        }
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to run script.";
        setRunErrorMessage(message);
        toast.error(message);
        return false;
      }
    },
    [runMutation],
  );

  const openRunFlow = useCallback(
    (script: ScriptCommandSummary) => {
      setRunErrorMessage(null);
      setSelectedScriptId(script.id);
      setArgumentScriptId(script.id);
      if (script.argumentDefinitions.length > 0) {
        setViewMode("arguments");
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

  const handleRunWithArguments = useCallback(
    async (argumentValues: Record<string, string>) => {
      if (!argumentScript) {
        return;
      }

      setScriptArgumentValues((current) => ({
        ...current,
        [argumentScript.id]: argumentValues,
      }));

      const didRun = await executeScriptById(argumentScript.id, argumentValues);
      if (didRun) {
        setSelectedScriptId(argumentScript.id);
        setViewMode("manage");
      }
    },
    [argumentScript, executeScriptById],
  );

  const handleCreateScript = useCallback(
    async (request: CreateScriptCommandRequest) => {
      setCreateErrorMessage(null);
      try {
        const created = await createMutation.mutateAsync(request);
        setSearch("");
        setSelectedScriptId(created.id);
        setViewMode("manage");
        toast.success(`Created ${created.scriptName}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create script.";
        setCreateErrorMessage(message);
      }
    },
    [createMutation],
  );

  const openCreateView = useCallback(() => {
    setCreateErrorMessage(null);
    setViewMode("create");
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
    if (viewMode === "create" || viewMode === "arguments") {
      setViewMode("manage");
      return;
    }
    onBack();
  }, [onBack, viewMode]);

  useLauncherPanelBackHandler("script-commands", handleBack);

  useMountEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (viewModeRef.current !== "manage") {
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
      openCreateView();
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
        errorMessage={createErrorMessage}
        onSubmit={handleCreateScript}
      />
    );
  }

  if (resolvedViewMode === "arguments" && argumentScript) {
    return (
      <ScriptCommandArgumentsForm
        key={argumentScript.id}
        script={argumentScript}
        initialValues={scriptArgumentValues[argumentScript.id]}
        isSubmitting={runMutation.isPending}
        errorMessage={runErrorMessage}
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
      {/* Header */}
      <header className="scripts-header-enter flex h-14 shrink-0 items-center gap-3 border-b border-[var(--launcher-card-border)] px-4">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={handleBack}
          className="flex size-9 items-center justify-center rounded-lg bg-[var(--launcher-card-hover-bg)] text-muted-foreground transition-all duration-200 hover:bg-[var(--launcher-card-hover-bg)] hover:text-muted-foreground"
          aria-label="Back"
        >
          <ChevronLeft className="size-4" />
        </Button>

        {/* Icon */}
        <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--launcher-card-bg)]">
          <Terminal className="size-5 text-[var(--icon-green-fg)]" />
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-[14px] font-semibold tracking-[-0.02em] text-foreground">
            Script Commands
          </h1>
          <p className="text-[12px] text-muted-foreground tracking-[-0.01em]">
            Run local scripts from Beam
          </p>
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-1.5 rounded-full bg-[var(--launcher-card-hover-bg)] px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
          <Terminal className="size-3" />
          <span>{scripts.length > 0 ? `${scripts.length} scripts` : "No scripts"}</span>
        </div>
      </header>

      {/* Search bar */}
      <div className="scripts-toolbar-enter flex items-center gap-2 border-b border-[var(--launcher-card-border)] px-4 py-2.5">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search scripts..."
            className="h-10 w-full rounded-xl bg-[var(--launcher-card-hover-bg)] pl-9 pr-4 text-[13px] text-foreground placeholder:text-muted-foreground ring-1 ring-[var(--launcher-card-border)] transition-all duration-200 focus:outline-none focus:ring-[var(--ring)] focus:bg-[var(--launcher-card-hover-bg)]"
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={openCreateView}
          className="flex h-10 items-center gap-2 rounded-xl bg-[var(--launcher-card-hover-bg)] px-3.5 text-[12px] font-medium text-muted-foreground ring-1 ring-[var(--launcher-card-border)] transition-all duration-200 hover:bg-[var(--launcher-card-hover-bg)] hover:text-foreground"
        >
          <Plus className="size-3.5" />
          New
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => void handleOpenFolder()}
          className="flex h-10 items-center gap-2 rounded-xl bg-[var(--launcher-card-hover-bg)] px-3.5 text-[12px] font-medium text-muted-foreground ring-1 ring-[var(--launcher-card-border)] transition-all duration-200 hover:bg-[var(--launcher-card-hover-bg)] hover:text-foreground"
        >
          <FolderOpen className="size-3.5" />
          Folder
        </Button>
      </div>

      {/* Main content */}
      <div className="scripts-content-enter flex min-h-0 flex-1 overflow-hidden">
        {/* Scripts list */}
        <div className="w-[42%] border-r border-[var(--launcher-card-border)]">
          <ScriptCommandsList
            scripts={filteredScripts}
            selectedScriptId={selectedScriptId}
            isLoading={scriptsQuery.isLoading}
            onSelect={setSelectedScriptId}
            onRun={(scriptId) => void handleRunById(scriptId)}
          />
        </div>

        {/* Output panel */}
        <div className="flex-1 bg-[var(--launcher-card-hover-bg)]">
          <ScriptCommandsOutput
            selectedScript={selectedScript}
            executionResult={executionResult}
            runErrorMessage={runErrorMessage}
            isRunning={runMutation.isPending}
          />
        </div>
      </div>

      <ModuleFooter
        className="scripts-footer-enter border-[var(--launcher-card-border)]"
        leftSlot={
          <>
            <Terminal className="size-3.5" />
            <span>{filteredScripts.length} visible</span>
          </>
        }
        shortcuts={[
          {
            keys: ["Enter"],
            label: selectedScriptNeedsArguments ? "Args & Run" : "Run Selected",
          },
          { keys: ["⌘N"], label: "New Script" },
        ]}
        actions={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRunSelected}
            disabled={!selectedScript || runMutation.isPending}
            className="flex h-7 items-center gap-1.5 rounded-lg bg-[var(--ring)]/20 px-3 text-[12px] font-medium text-[var(--ring)] transition-all duration-200 hover:bg-[var(--ring)]/30 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Play className="size-3.5" />
            {selectedScriptNeedsArguments ? "Args & Run" : "Run"}
          </Button>
        }
      />
    </div>
  );
}
