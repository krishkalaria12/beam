import { ChevronLeft, FolderOpen, Play, Plus, Search, Terminal } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useLauncherPanelBackHandler } from "@/modules/launcher/lib/back-navigation";
import { openScriptCommandsDirectory } from "@/modules/script-commands/api/open-script-commands-directory";
import { ScriptCommandArgumentsForm } from "@/modules/script-commands/components/script-command-arguments-form";
import { ScriptCommandCreateForm } from "@/modules/script-commands/components/script-command-create-form";
import { ScriptCommandsList } from "@/modules/script-commands/components/script-commands-list";
import { ScriptCommandsOutput } from "@/modules/script-commands/components/script-commands-output";
import { useCreateScriptCommandMutation } from "@/modules/script-commands/hooks/use-create-script-command-mutation";
import { useRunScriptCommandMutation } from "@/modules/script-commands/hooks/use-run-script-command-mutation";
import { useScriptCommandsQuery } from "@/modules/script-commands/hooks/use-script-commands-query";
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

  useEffect(() => {
    if (filteredScripts.length === 0) {
      setSelectedScriptId(null);
      return;
    }

    if (!selectedScriptId || !filteredScripts.some((script) => script.id === selectedScriptId)) {
      setSelectedScriptId(filteredScripts[0]?.id ?? null);
    }
  }, [filteredScripts, selectedScriptId]);

  const selectedScript = useMemo(
    () => filteredScripts.find((script) => script.id === selectedScriptId) ?? null,
    [filteredScripts, selectedScriptId],
  );

  const argumentScript = useMemo(
    () => scripts.find((script) => script.id === argumentScriptId) ?? null,
    [argumentScriptId, scripts],
  );

  useEffect(() => {
    if (viewMode !== "arguments") {
      return;
    }

    if (!argumentScript) {
      setViewMode("manage");
    }
  }, [argumentScript, viewMode]);

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

  useEffect(() => {
    if (viewMode !== "manage") {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
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
  }, [openCreateView, viewMode]);

  if (viewMode === "create") {
    return (
      <ScriptCommandCreateForm
        onBack={handleBack}
        isSubmitting={createMutation.isPending}
        errorMessage={createErrorMessage}
        onSubmit={handleCreateScript}
      />
    );
  }

  if (viewMode === "arguments" && argumentScript) {
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
    <div className="scripts-view-enter flex h-full w-full flex-col overflow-hidden text-white">
      {/* Header */}
      <header className="scripts-header-enter flex h-14 shrink-0 items-center gap-3 border-b border-white/[0.06] px-4">
        <button
          type="button"
          onClick={handleBack}
          className="flex size-9 items-center justify-center rounded-lg bg-white/[0.03] text-white/40 transition-all duration-200 hover:bg-white/[0.06] hover:text-white/70"
          aria-label="Back"
        >
          <ChevronLeft className="size-4" />
        </button>

        {/* Icon */}
        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
          <Terminal className="size-5 text-emerald-400" />
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-[14px] font-semibold tracking-[-0.02em] text-white/90">
            Script Commands
          </h1>
          <p className="text-[12px] text-white/40 tracking-[-0.01em]">
            Run local scripts from Beam
          </p>
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-1.5 rounded-full bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/50">
          <Terminal className="size-3" />
          <span>{scripts.length > 0 ? `${scripts.length} scripts` : "No scripts"}</span>
        </div>
      </header>

      {/* Search bar */}
      <div className="scripts-toolbar-enter flex items-center gap-2 border-b border-white/[0.06] px-4 py-2.5">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search scripts..."
            className="h-10 w-full rounded-xl bg-white/[0.04] pl-9 pr-4 text-[13px] text-white/90 placeholder:text-white/30 ring-1 ring-white/[0.06] transition-all duration-200 focus:outline-none focus:ring-[var(--solid-accent,#4ea2ff)] focus:bg-white/[0.05]"
          />
        </div>
        <button
          type="button"
          onClick={openCreateView}
          className="flex h-10 items-center gap-2 rounded-xl bg-white/[0.04] px-3.5 text-[12px] font-medium text-white/70 ring-1 ring-white/[0.06] transition-all duration-200 hover:bg-white/[0.06] hover:text-white/90"
        >
          <Plus className="size-3.5" />
          New
        </button>
        <button
          type="button"
          onClick={() => void handleOpenFolder()}
          className="flex h-10 items-center gap-2 rounded-xl bg-white/[0.04] px-3.5 text-[12px] font-medium text-white/70 ring-1 ring-white/[0.06] transition-all duration-200 hover:bg-white/[0.06] hover:text-white/90"
        >
          <FolderOpen className="size-3.5" />
          Folder
        </button>
      </div>

      {/* Main content */}
      <div className="scripts-content-enter flex min-h-0 flex-1 overflow-hidden">
        {/* Scripts list */}
        <div className="w-[42%] border-r border-white/[0.06]">
          <ScriptCommandsList
            scripts={filteredScripts}
            selectedScriptId={selectedScriptId}
            isLoading={scriptsQuery.isLoading}
            onSelect={setSelectedScriptId}
            onRun={(scriptId) => void handleRunById(scriptId)}
          />
        </div>

        {/* Output panel */}
        <div className="flex-1 bg-white/[0.01]">
          <ScriptCommandsOutput
            selectedScript={selectedScript}
            executionResult={executionResult}
            runErrorMessage={runErrorMessage}
            isRunning={runMutation.isPending}
          />
        </div>
      </div>

      {/* Footer */}
      <footer className="scripts-footer-enter flex h-12 shrink-0 items-center justify-between border-t border-white/[0.06] px-4">
        <div className="flex items-center gap-2 text-[12px] text-white/40">
          <Terminal className="size-3.5" />
          <span>{filteredScripts.length} visible</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-white/30">
            <kbd className="rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-[10px]">Enter</kbd>
            <span>{selectedScriptNeedsArguments ? "Args & Run" : "Run Selected"}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-white/30">
            <kbd className="rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-[10px]">⌘N</kbd>
            <span>New Script</span>
          </div>
          <button
            type="button"
            onClick={handleRunSelected}
            disabled={!selectedScript || runMutation.isPending}
            className="flex h-7 items-center gap-1.5 rounded-lg bg-[var(--solid-accent,#4ea2ff)]/20 px-3 text-[12px] font-medium text-[var(--solid-accent,#4ea2ff)] transition-all duration-200 hover:bg-[var(--solid-accent,#4ea2ff)]/30 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Play className="size-3.5" />
            {selectedScriptNeedsArguments ? "Args & Run" : "Run"}
          </button>
        </div>
      </footer>
    </div>
  );
}
