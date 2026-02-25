import { FolderOpen, Play, Plus, Search, Terminal } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { CommandFooterBar } from "@/components/command/command-footer-bar";
import { CommandKeyHint } from "@/components/command/command-key-hint";
import { CommandPanelBackButton, CommandPanelHeader, CommandPanelTitleBlock } from "@/components/command/command-panel-header";
import { CommandStatusChip } from "@/components/command/command-status-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLauncherPanelBackHandler } from "@/modules/launcher/lib/back-navigation";
import { openScriptCommandsDirectory } from "@/modules/script-commands/api/open-script-commands-directory";
import { ScriptCommandCreateForm } from "@/modules/script-commands/components/script-command-create-form";
import { ScriptCommandsList } from "@/modules/script-commands/components/script-commands-list";
import { ScriptCommandsOutput } from "@/modules/script-commands/components/script-commands-output";
import { useCreateScriptCommandMutation } from "@/modules/script-commands/hooks/use-create-script-command-mutation";
import { useRunScriptCommandMutation } from "@/modules/script-commands/hooks/use-run-script-command-mutation";
import { useScriptCommandsQuery } from "@/modules/script-commands/hooks/use-script-commands-query";
import type { CreateScriptCommandRequest, ScriptExecutionResult } from "@/modules/script-commands/types";

interface ScriptCommandsViewProps {
  onBack: () => void;
}

type ScriptCommandsViewMode = "manage" | "create";

export function ScriptCommandsView({ onBack }: ScriptCommandsViewProps) {
  const scriptsQuery = useScriptCommandsQuery();
  const runMutation = useRunScriptCommandMutation();
  const createMutation = useCreateScriptCommandMutation();

  const [viewMode, setViewMode] = useState<ScriptCommandsViewMode>("manage");
  const [search, setSearch] = useState("");
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);
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

  const handleRunById = useCallback(async (scriptId: string) => {
    setRunErrorMessage(null);
    try {
      const result = await runMutation.mutateAsync({
        commandId: scriptId,
        background: false,
      });
      setExecutionResult(result);
      if (result.exitCode === 0) {
        toast.success(result.message || "Script finished.");
      } else {
        toast.error(result.message || "Script failed.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to run script.";
      setRunErrorMessage(message);
      toast.error(message);
    }
  }, [runMutation]);

  const handleRunSelected = useCallback(() => {
    if (!selectedScript) {
      return;
    }
    void handleRunById(selectedScript.id);
  }, [handleRunById, selectedScript]);

  const handleCreateScript = useCallback(async (request: CreateScriptCommandRequest) => {
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
  }, [createMutation]);

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
    if (viewMode === "create") {
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

  return (
    <div className="glass-effect flex h-full w-full flex-col overflow-hidden text-foreground">
      <CommandPanelHeader>
        <CommandPanelBackButton onClick={handleBack} aria-label="Back" />
        <CommandPanelTitleBlock
          title="Script Commands"
          subtitle="Run local scripts from Beam"
          className="flex-1"
        />
        <CommandStatusChip
          label={scripts.length > 0 ? `${scripts.length} scripts` : "No scripts"}
          tone="neutral"
        />
      </CommandPanelHeader>

      <div className="flex items-center gap-2 border-b border-[var(--ui-divider)] px-3 py-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground/60" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
            }}
            placeholder="Search scripts..."
            className="h-9 pl-8"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={openCreateView}
        >
          <Plus className="size-3.5" />
          New
        </Button>
        <Button size="sm" variant="outline" onClick={() => {
          void handleOpenFolder();
        }}>
          <FolderOpen className="size-3.5" />
          Folder
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="w-[42%] border-r border-[var(--ui-divider)] bg-background/10">
          <ScriptCommandsList
            scripts={filteredScripts}
            selectedScriptId={selectedScriptId}
            isLoading={scriptsQuery.isLoading}
            onSelect={setSelectedScriptId}
            onRun={(scriptId) => {
              void handleRunById(scriptId);
            }}
          />
        </div>
        <div className="flex-1 bg-background/5">
          <ScriptCommandsOutput
            selectedScript={selectedScript}
            executionResult={executionResult}
            runErrorMessage={runErrorMessage}
            isRunning={runMutation.isPending}
          />
        </div>
      </div>

      <CommandFooterBar
        leftSlot={(
          <div className="inline-flex items-center gap-2">
            <Terminal className="size-3.5 text-muted-foreground/70" />
            <span>{filteredScripts.length} visible</span>
          </div>
        )}
        rightSlot={(
          <>
            <CommandKeyHint keyLabel="ENTER" label="Run Selected" />
            <CommandKeyHint keyLabel="CMD/CTRL + N" label="New Script" />
            <Button
              size="sm"
              variant="default"
              className="h-7 px-2.5"
              onClick={handleRunSelected}
              disabled={!selectedScript || runMutation.isPending}
            >
              <Play className="size-3.5" />
              Run
            </Button>
          </>
        )}
      />
    </div>
  );
}
