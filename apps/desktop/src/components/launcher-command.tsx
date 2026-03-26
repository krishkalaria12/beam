import { useQueryClient } from "@tanstack/react-query";
import { isTauri } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import {
  useCallback,
  useEffectEvent,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

import { buildCommandContext } from "@/command-registry/context";
import {
  CALCULATOR_RESULT_COMMAND_ID,
  createQuicklinkExecuteCommandDescriptor,
  toQuicklinkExecuteCommandId,
} from "@/command-registry/default-providers";
import { dispatchCommand } from "@/command-registry/dispatcher";
import type { CustomActionRequest } from "@/command-registry/dispatcher";
import { staticCommandRegistry } from "@/command-registry/registry";
import { createStaticCommandRegistryStore } from "@/command-registry/static-registry";
import { logDispatchFailure } from "@/command-registry/telemetry";
import { QUICKLINK_TRIGGER_MODE, SHELL_TRIGGER_MODE } from "@/command-registry/trigger-registry";
import type { CommandDescriptor, CommandPanel } from "@/command-registry/types";
import { useCommandPreferences } from "@/command-registry/use-command-preferences";
import { Command, CommandInput, CommandList } from "@/components/ui/command";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { isLauncherActionsHotkey, requestLauncherActionsToggle } from "@/lib/launcher-actions";
import { cn } from "@/lib/utils";

import { calculatorHistoryQueryKey } from "@/modules/calculator-history/api/query";
import { LauncherCommandModeContent } from "@/modules/launcher/components/launcher-command-mode-content";
import { LauncherFooter } from "@/modules/launcher/components/launcher-footer";
import { useLauncherCalculatorAutoSave } from "@/modules/launcher/hooks/use-launcher-calculator-auto-save";
import { useExtensionManagerEvents } from "@/modules/launcher/hooks/use-extension-manager-events";
import { useCliDmenuRequests } from "@/modules/launcher/hooks/use-cli-dmenu-requests";
import { useLauncherDeepLinks } from "@/modules/launcher/hooks/use-launcher-deep-links";
import { useLauncherFocusManagement } from "@/modules/launcher/hooks/use-launcher-focus-management";
import { useLauncherPanelActions } from "@/modules/launcher/hooks/use-launcher-panel-actions";
import { useLauncherPanelPrefetch } from "@/modules/launcher/hooks/use-launcher-panel-prefetch";
import { useLauncherWindowSizeSync } from "@/modules/launcher/hooks/use-launcher-window-size-sync";
import { LauncherTakeoverPanel } from "@/modules/launcher/components/launcher-takeover-panel";
import { useRankedRegistryCommands } from "@/modules/launcher/hooks/use-ranked-registry-commands";
import { LauncherSecondaryPanel } from "@/modules/launcher/components/launcher-secondary-panel";
import {
  isLauncherBackHotkey,
  runLauncherPanelBackHandler,
} from "@/modules/launcher/lib/back-navigation";
import { createCustomActionHandler } from "@/modules/launcher/lib/create-custom-action-handler";
import { useRunShellCommandMutation } from "@/modules/shell/hooks/use-run-shell-command-mutation";
import { ShellCommandPanel } from "@/modules/shell/components/shell-command-panel";
import type { ShellExecutionEntry } from "@/modules/shell/types";
import { persistentExtensionRunnerManager } from "@/modules/extensions/background/persistent-runners";
import {
  findExtensionCommandByName,
  getExtensionCatalogPlugins,
} from "@/modules/extensions/extension-catalog";
import { extensionManagerService } from "@/modules/extensions/extension-manager-service";
import { useExtensionInfrastructure } from "@/modules/extensions/hooks/use-extension-infrastructure";
import { useExtensionRuntimeStore } from "@/modules/extensions/runtime/store";
import { findQuicklinkByKeywordOrAlias } from "@/modules/quicklinks/api/quicklinks";
import { useQuicklinks } from "@/modules/quicklinks/hooks/use-quicklinks";
import { useManagedItemPreferencesStore } from "@/modules/launcher/managed-items";
import { HOTKEY_BACKEND_STATUS_EVENT, HOTKEY_COMMAND_EVENT } from "@/modules/settings/api/hotkeys";
import { useTriggerSymbols } from "@/modules/settings/hooks/use-trigger-symbols";
import { useUiLayout } from "@/modules/settings/hooks/use-ui-layout";
import { useAwakeStore } from "@/modules/system-actions/store/awake-store";
import {
  isLauncherCommandListExpandedPanel,
  isLauncherFooterHidden,
  isLauncherInputHidden,
  isLauncherTakeoverPanel,
  useLauncherUiStore,
} from "@/store/use-launcher-ui-store";

interface HotkeyCommandEventPayload {
  command_id?: string;
  source?: string;
}

interface HotkeyBackendStatusEventPayload {
  level?: string;
  message?: string;
  hint?: string;
  source?: string;
}

export default function LauncherCommand() {
  const queryClient = useQueryClient();
  const extensionInfrastructure = useExtensionInfrastructure();
  const commandSearchSessionSeed = useLauncherUiStore((state) => state.commandSearchSessionSeed);
  const calculatorSessionId = useMemo(() => crypto.randomUUID(), [commandSearchSessionSeed]);
  const commandSearch = useLauncherUiStore((state) => state.commandSearch);
  const activePanel = useLauncherUiStore((state) => state.activePanel);
  const fileSearchQuery = useLauncherUiStore((state) => state.fileSearchQuery);
  const dictionaryQuery = useLauncherUiStore((state) => state.dictionaryQuery);
  const translationQuery = useLauncherUiStore((state) => state.translationQuery);
  const spotifyQuery = useLauncherUiStore((state) => state.spotifyQuery);
  const githubQuery = useLauncherUiStore((state) => state.githubQuery);
  const quicklinksView = useLauncherUiStore((state) => state.quicklinksView);
  const setCommandSearch = useLauncherUiStore((state) => state.setCommandSearch);
  const setActivePanel = useLauncherUiStore((state) => state.setActivePanel);
  const setFileSearchQuery = useLauncherUiStore((state) => state.setFileSearchQuery);
  const setDictionaryQuery = useLauncherUiStore((state) => state.setDictionaryQuery);
  const setTranslationQuery = useLauncherUiStore((state) => state.setTranslationQuery);
  const setSpotifyQuery = useLauncherUiStore((state) => state.setSpotifyQuery);
  const setGithubQuery = useLauncherUiStore((state) => state.setGithubQuery);
  const setQuicklinksView = useLauncherUiStore((state) => state.setQuicklinksView);
  const openPanel = useLauncherUiStore((state) => state.openPanel);
  const openFileSearch = useLauncherUiStore((state) => state.openFileSearch);
  const openDictionary = useLauncherUiStore((state) => state.openDictionary);
  const openTranslation = useLauncherUiStore((state) => state.openTranslation);
  const openSpotify = useLauncherUiStore((state) => state.openSpotify);
  const openGithub = useLauncherUiStore((state) => state.openGithub);
  const backToCommands = useLauncherUiStore((state) => state.backToCommands);
  const {
    preparePanel,
    openPreparedPanel,
    openPreparedSecondaryPanel,
    openExtensions,
    openSettings,
    prefetchRegistryCommand,
    takeoverPanelOpeners,
  } = useLauncherPanelActions({ openPanel });

  const { data: quicklinks = [] } = useQuicklinks();
  const quicklinkAliasesById = useManagedItemPreferencesStore((state) => state.aliasesById);
  const { isCompressed } = useUiLayout();
  const { symbols: triggerSymbols } = useTriggerSymbols();
  const runShellCommandMutation = useRunShellCommandMutation();
  const [shellHistory, setShellHistory] = useState<ShellExecutionEntry[]>([]);
  const {
    state: commandPreferences,
    rankingSignals,
    hiddenCommandIds,
    markUsed,
    setPinned,
    setHidden,
    setAliases,
    movePinned,
    setFallbackActionsEnabled,
    setFallbackCommandIds,
  } = useCommandPreferences();
  useLauncherDeepLinks({ openPanel: openPreparedPanel, backToCommands });
  useExtensionManagerEvents({ backToCommands, openSettings });
  useCliDmenuRequests();
  useLauncherPanelPrefetch();

  const runExtensionPlugin = useCallback(
    async (input: {
      pluginPath: string;
      pluginMode: "view" | "no-view" | "menu-bar";
      pluginInterval?: string;
      title: string;
      subtitle?: string;
      launchArguments?: Record<string, unknown>;
      launchContext?: Record<string, unknown>;
      launchType?: string;
    }) => {
      const launchType = input.launchType === "background" ? "background" : "userInitiated";

      if (
        input.pluginMode === "menu-bar" ||
        (input.pluginMode === "no-view" && typeof input.pluginInterval === "string")
      ) {
        const discovered = await getExtensionCatalogPlugins();
        const matched = discovered.find((plugin) => plugin.pluginPath === input.pluginPath);
        if (!matched) {
          throw new Error("Extension command is no longer installed.");
        }

        await persistentExtensionRunnerManager.runPlugin(matched, launchType);
        return;
      }

      useExtensionRuntimeStore.getState().resetForNewPlugin({
        pluginPath: input.pluginPath,
        pluginMode: input.pluginMode,
        title: input.title,
        subtitle: input.subtitle,
      });

      if (input.pluginMode === "view") {
        await openPreparedPanel("extension-runner", true);
      }

      try {
        await extensionManagerService.runPlugin({
          pluginPath: input.pluginPath,
          mode: input.pluginMode,
          aiAccessStatus: false,
          arguments: input.launchArguments,
          launchContext: input.launchContext,
          launchType,
        });
      } catch (error) {
        useExtensionRuntimeStore.getState().resetRuntime();
        if (input.pluginMode === "view") {
          backToCommands();
        }
        throw error;
      }
    },
    [backToCommands, openPreparedPanel],
  );

  const launchExtensionCommandByName = useCallback(
    async (request: {
      requestId: string;
      name: string;
      type?: string;
      context?: Record<string, unknown>;
      arguments?: Record<string, unknown>;
      extensionName?: string;
    }) => {
      const command = await findExtensionCommandByName({
        commandName: request.name,
        extensionName: request.extensionName,
      });

      if (!command) {
        throw new Error(`command "${request.name}" was not found`);
      }

      const pluginMode =
        command.mode?.trim().toLowerCase() === "menu-bar"
          ? "menu-bar"
          : command.mode?.trim().toLowerCase() === "no-view"
            ? "no-view"
            : "view";
      const subtitle =
        [command.pluginTitle, command.description ?? ""]
          .filter((part) => part.trim().length > 0)
          .join(" - ") || undefined;

      await runExtensionPlugin({
        pluginPath: command.pluginPath,
        pluginMode,
        pluginInterval: command.interval ?? undefined,
        title: command.title,
        subtitle,
        launchArguments: request.arguments,
        launchContext: request.context,
        launchType: request.type,
      });
    },
    [runExtensionPlugin],
  );

  const commandContext = useMemo(
    () =>
      buildCommandContext({
        search: commandSearch,
        isCompressed,
        activePanel,
        isDesktopRuntime: isTauri(),
      }),
    [commandSearch, isCompressed, activePanel],
  );

  const trimmedCommandSearch = commandContext.rawQuery;
  const isQuicklinkTrigger = commandContext.mode === QUICKLINK_TRIGGER_MODE;
  const isShellTrigger = commandContext.mode === SHELL_TRIGGER_MODE;
  const quicklinkKeyword = commandContext.quicklinkKeyword;
  const quicklinkQuery = commandContext.query;
  const shellCommand = commandContext.query.trim();
  const matchedQuicklink = quicklinkKeyword
    ? findQuicklinkByKeywordOrAlias(quicklinks, quicklinkKeyword, quicklinkAliasesById)
    : undefined;

  const { rankedRegistryCommands, fallbackRegistryCommands } = useRankedRegistryCommands({
    commandContext,
    hiddenCommandIds,
    rankingSignals,
    fallbackEnabled: commandPreferences.fallbackEnabled,
    fallbackCommandIds: commandPreferences.fallbackCommandIds,
  });

  const handleRunShellCommand = useCallback(async () => {
    if (!isShellTrigger || shellCommand.length === 0 || runShellCommandMutation.isPending) {
      return;
    }

    const entryId = crypto.randomUUID();
    setShellHistory((previous) => [
      ...previous.slice(Math.max(0, previous.length - 19)),
      {
        id: entryId,
        command: shellCommand,
        startedAt: Date.now(),
        status: "running",
        result: null,
        errorMessage: null,
      },
    ]);

    try {
      const result = await runShellCommandMutation.mutateAsync({
        command: shellCommand,
      });
      setShellHistory((previous) =>
        previous.map((entry) =>
          entry.id === entryId
            ? {
                ...entry,
                status: "completed",
                result,
              }
            : entry,
        ),
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : "Shell command failed.";
      setShellHistory((previous) =>
        previous.map((entry) =>
          entry.id === entryId
            ? {
                ...entry,
                status: "error",
                errorMessage,
              }
            : entry,
        ),
      );
    }
  }, [isShellTrigger, runShellCommandMutation, shellCommand]);

  const calculatorPreview = useMemo(() => {
    const calculatorCommand = rankedRegistryCommands.find(
      (entry) => entry.command.id === CALCULATOR_RESULT_COMMAND_ID,
    )?.command;

    const payload = calculatorCommand?.action?.payload;
    const query =
      typeof payload?.calculatorQuery === "string" ? payload.calculatorQuery.trim() : "";
    const result =
      typeof payload?.calculatorResult === "string" ? payload.calculatorResult.trim() : "";

    if (!query || !result) {
      return null;
    }

    return { query, result };
  }, [rankedRegistryCommands]);
  useLauncherCalculatorAutoSave({ calculatorPreview, calculatorSessionId, queryClient });

  const customActionHandler = useMemo(
    () =>
      createCustomActionHandler({
        calculatorSessionId,
        setCommandSearch,
        runExtensionCommand: async (request: CustomActionRequest) => {
          const pluginPath =
            typeof request.payload.pluginPath === "string" ? request.payload.pluginPath.trim() : "";
          const pluginMode =
            request.payload.pluginMode === "menu-bar"
              ? "menu-bar"
              : request.payload.pluginMode === "no-view"
                ? "no-view"
                : "view";
          const pluginInterval =
            typeof request.payload.pluginInterval === "string"
              ? request.payload.pluginInterval.trim()
              : undefined;
          const launchArguments =
            request.payload.arguments && typeof request.payload.arguments === "object"
              ? (request.payload.arguments as Record<string, unknown>)
              : {};
          const launchContextFromPayload =
            request.payload.launchContext && typeof request.payload.launchContext === "object"
              ? (request.payload.launchContext as Record<string, unknown>)
              : request.payload.context && typeof request.payload.context === "object"
                ? (request.payload.context as Record<string, unknown>)
                : undefined;
          const launchContext =
            launchContextFromPayload ??
            (request.query
              ? {
                  query: request.query,
                }
              : undefined);
          const launchType =
            typeof request.payload.launchType === "string"
              ? request.payload.launchType
              : "userInitiated";

          if (!pluginPath) {
            throw new Error("Extension command payload is missing pluginPath.");
          }

          await runExtensionPlugin({
            pluginPath,
            pluginMode,
            pluginInterval,
            title: request.command.title,
            subtitle: request.command.subtitle,
            launchArguments,
            launchContext,
            launchType,
          });
        },
        onCalculatorHistoryChanged: () => {
          void queryClient.invalidateQueries({ queryKey: calculatorHistoryQueryKey });
        },
      }),
    [calculatorSessionId, queryClient, runExtensionPlugin, setCommandSearch],
  );

  const handleRegistryCommandSelect = useCallback(
    async (commandId: string, fallbackCommand?: CommandDescriptor) => {
      const selectedDynamicCommand =
        rankedRegistryCommands.find((entry) => entry.command.id === commandId)?.command ??
        fallbackCommand;
      const registry = staticCommandRegistry.has(commandId)
        ? staticCommandRegistry
        : selectedDynamicCommand
          ? createStaticCommandRegistryStore([selectedDynamicCommand])
          : staticCommandRegistry;

      const result = await dispatchCommand(commandId, {
        query: commandContext.query,
        mode: commandContext.mode,
        isDesktopRuntime: commandContext.isDesktopRuntime,
        registry,
        runtime: {
          setActivePanel,
          setCommandSearch,
          setQuicklinksView,
          setFileSearchQuery,
          setDictionaryQuery,
          setTranslationQuery,
          setSpotifyQuery,
          setGithubQuery,
          preparePanel,
          customActionHandler,
        },
      });

      if (!result.ok) {
        if (commandId === "system.awake") {
          toast.error(result.message || "Failed to toggle keep awake");
        }
        logDispatchFailure(commandId, result, {
          mode: commandContext.mode,
          activePanel: commandContext.activePanel,
          query: commandContext.query,
        });
        return;
      }

      if (commandId === "system.awake") {
        const isAwake = result.payload?.isAwake;
        if (typeof isAwake === "boolean") {
          useAwakeStore.getState().setAwake(isAwake);
          toast(isAwake ? "Keep awake enabled" : "Keep awake disabled");
        } else {
          void useAwakeStore.getState().fetchStatus();
        }
      }

      markUsed(commandId);
    },
    [
      commandContext,
      customActionHandler,
      markUsed,
      rankedRegistryCommands,
      setActivePanel,
      setCommandSearch,
      setDictionaryQuery,
      setFileSearchQuery,
      setGithubQuery,
      setQuicklinksView,
      setSpotifyQuery,
      setTranslationQuery,
    ],
  );

  const handleQuicklinkExecute = useCallback(
    async (keyword: string = quicklinkKeyword, query: string = quicklinkQuery) => {
      const quicklink = findQuicklinkByKeywordOrAlias(quicklinks, keyword, quicklinkAliasesById);
      if (!quicklink) {
        return;
      }

      const fallbackCommand = createQuicklinkExecuteCommandDescriptor({
        keyword: quicklink.keyword,
        query,
        name: quicklink.name,
      });

      await handleRegistryCommandSelect(
        toQuicklinkExecuteCommandId(quicklink.keyword),
        fallbackCommand,
      );
    },
    [
      handleRegistryCommandSelect,
      quicklinkAliasesById,
      quicklinkKeyword,
      quicklinkQuery,
      quicklinks,
    ],
  );

  const handleHotkeyCommand = useEffectEvent((event: { payload?: HotkeyCommandEventPayload }) => {
    const commandId =
      typeof event.payload?.command_id === "string" ? event.payload.command_id.trim() : "";
    if (!commandId) {
      return;
    }

    const dynamicFallback = rankedRegistryCommands.find(
      (entry) => entry.command.id === commandId,
    )?.command;

    if (!dynamicFallback && !staticCommandRegistry.has(commandId)) {
      toast.error(`Hotkey command not available: ${commandId}`);
      return;
    }

    void handleRegistryCommandSelect(commandId, dynamicFallback);
  });

  useMountEffect(() => {
    if (!isTauri()) {
      return;
    }

    let disposed = false;
    let unlistenFn: UnlistenFn | null = null;

    void listen<HotkeyCommandEventPayload>(HOTKEY_COMMAND_EVENT, (event) => {
      handleHotkeyCommand(event);
    })
      .then((cleanup) => {
        if (disposed) {
          cleanup();
          return;
        }
        unlistenFn = cleanup;
      })
      .catch(() => {
        unlistenFn = null;
      });

    return () => {
      disposed = true;
      unlistenFn?.();
    };
  });

  useMountEffect(() => {
    if (!isTauri()) {
      return;
    }

    let disposed = false;
    let unlistenFn: UnlistenFn | null = null;

    void listen<HotkeyBackendStatusEventPayload>(HOTKEY_BACKEND_STATUS_EVENT, (event) => {
      const message =
        typeof event.payload?.message === "string" ? event.payload.message.trim() : "";
      const hint = typeof event.payload?.hint === "string" ? event.payload.hint.trim() : "";
      if (!message) {
        return;
      }

      const description = hint
        ? `Add this compositor binding:\n${hint}`
        : "Add compositor keybindings for Beam launcher and commands.";
      toast.warning(message, {
        description,
        duration: 9000,
      });
    })
      .then((cleanup) => {
        if (disposed) {
          cleanup();
          return;
        }
        unlistenFn = cleanup;
      })
      .catch(() => {
        unlistenFn = null;
      });

    return () => {
      disposed = true;
      unlistenFn?.();
    };
  });

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.defaultPrevented) {
      return;
    }

    if (isLauncherActionsHotkey(e)) {
      e.preventDefault();
      e.stopPropagation();
      requestLauncherActionsToggle();
      return;
    }

    if (activePanel !== "commands") {
      if (isLauncherBackHotkey(e)) {
        e.preventDefault();
        e.stopPropagation();

        const handledByPanel = runLauncherPanelBackHandler(activePanel);
        if (!handledByPanel) {
          backToCommands();
        }
      }

      return;
    }

    if (e.key === "Enter" && isShellTrigger) {
      e.preventDefault();
      await handleRunShellCommand();
      return;
    }

    if (e.key === "Enter" && isQuicklinkTrigger && matchedQuicklink) {
      e.preventDefault();
      await handleQuicklinkExecute(matchedQuicklink.keyword, quicklinkQuery);
    }
  };

  const handleWindowBackHotkey = useEffectEvent((event: KeyboardEvent) => {
    if (activePanel === "commands") {
      return;
    }

    if (event.defaultPrevented || !isLauncherBackHotkey(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const handledByPanel = runLauncherPanelBackHandler(activePanel);
    if (!handledByPanel) {
      backToCommands();
    }
  });

  useMountEffect(() => {
    const onWindowBackHotkey = (event: KeyboardEvent) => {
      handleWindowBackHotkey(event);
    };

    window.addEventListener("keydown", onWindowBackHotkey);
    return () => {
      window.removeEventListener("keydown", onWindowBackHotkey);
    };
  });

  const shouldCollapseToInputOnly =
    activePanel === "commands" && isCompressed && trimmedCommandSearch.length === 0;
  const isInputHidden = isLauncherInputHidden(activePanel);
  const hasTakeoverPanel = isLauncherTakeoverPanel(activePanel);
  const isCommandListExpandedPanel = isLauncherCommandListExpandedPanel(activePanel);

  const shouldShowFooter =
    !isShellTrigger && !shouldCollapseToInputOnly && !isLauncherFooterHidden(activePanel);
  const footerPrimaryAction = useMemo(
    () =>
      isShellTrigger
        ? {
            label: runShellCommandMutation.isPending ? "Running" : "Run",
            shortcut: ["↩"],
            onClick: handleRunShellCommand,
            disabled: shellCommand.length === 0 || runShellCommandMutation.isPending,
          }
        : undefined,
    [handleRunShellCommand, isShellTrigger, runShellCommandMutation.isPending, shellCommand.length],
  );

  useLauncherWindowSizeSync(activePanel === "commands", shouldCollapseToInputOnly);
  useLauncherFocusManagement({ activePanel, isInputHidden });

  const ExtensionToastBridge = extensionInfrastructure?.ExtensionToastBridge ?? null;
  const PersistentExtensionsHost = extensionInfrastructure?.PersistentExtensionsHost ?? null;

  return (
    <div className="relative h-full w-full bg-transparent">
      {ExtensionToastBridge ? <ExtensionToastBridge /> : null}
      {PersistentExtensionsHost ? (
        <PersistentExtensionsHost
          launchCommand={launchExtensionCommandByName}
          openExtensions={openExtensions}
        />
      ) : null}
      <Command
        shouldFilter={false}
        smartPointerSelection
        onKeyDown={handleKeyDown}
        className="glass-effect beam-main-shell h-full w-full overflow-hidden text-foreground"
      >
        {!isInputHidden && (
          <CommandInput
            value={commandSearch}
            onValueChange={setCommandSearch}
            placeholder={isShellTrigger ? "Run shell command..." : "Search Beam..."}
            showLogo
            minimal
            className="border-none"
          />
        )}

        {/* If File Search or Dictionary is open, it takes over the view entirely */}

        {hasTakeoverPanel && (
          <LauncherTakeoverPanel
            activePanel={activePanel}
            fileSearchQuery={fileSearchQuery}
            dictionaryQuery={dictionaryQuery}
            translationQuery={translationQuery}
            spotifyQuery={spotifyQuery}
            githubQuery={githubQuery}
            quicklinksView={quicklinksView}
            setQuicklinksView={setQuicklinksView}
            openFileSearch={openFileSearch}
            openDictionary={openDictionary}
            openTranslation={openTranslation}
            openSpotify={openSpotify}
            openGithub={openGithub}
            openQuicklinks={takeoverPanelOpeners.openQuicklinks}
            openSpeedTest={takeoverPanelOpeners.openSpeedTest}
            openClipboard={takeoverPanelOpeners.openClipboard}
            openAi={takeoverPanelOpeners.openAi}
            openTodo={takeoverPanelOpeners.openTodo}
            openNotes={takeoverPanelOpeners.openNotes}
            openSnippets={takeoverPanelOpeners.openSnippets}
            openExtensions={takeoverPanelOpeners.openExtensions}
            openScriptCommands={takeoverPanelOpeners.openScriptCommands}
            pinnedCommandIds={commandPreferences.pinnedCommandIds}
            hiddenCommandIds={hiddenCommandIds}
            aliasesById={commandPreferences.aliasesById}
            onSetPinned={setPinned}
            onSetHidden={setHidden}
            onSetAliases={setAliases}
            onMovePinned={movePinned}
            backToCommands={backToCommands}
          />
        )}

        {hasTakeoverPanel || shouldCollapseToInputOnly ? null : activePanel === "commands" &&
          isShellTrigger ? (
          <div className="min-h-0 flex-1 overflow-hidden">
            <ShellCommandPanel
              shellSymbol={triggerSymbols.shell}
              currentCommand={shellCommand}
              history={shellHistory}
            />
          </div>
        ) : (
          <CommandList
            className={cn(
              "list-area flex-1 transition-all duration-300",
              "custom-scrollbar px-1.5",
              isCommandListExpandedPanel
                ? "min-h-0 flex flex-col h-full [&_[cmdk-list-sizer]]:h-full [&_[cmdk-list-sizer]]:min-h-0 [&_[cmdk-list-sizer]]:flex-1 [&_[cmdk-list-sizer]]:flex [&_[cmdk-list-sizer]]:flex-col"
                : "max-h-none overflow-y-auto",
            )}
          >
            {activePanel === "commands" ? (
              <LauncherCommandModeContent
                isQuicklinkTrigger={isQuicklinkTrigger}
                quicklinks={quicklinks}
                quicklinkAliasesById={quicklinkAliasesById}
                quicklinkKeyword={quicklinkKeyword}
                quicklinkQuery={quicklinkQuery}
                rankedRegistryCommands={rankedRegistryCommands}
                fallbackRegistryCommands={fallbackRegistryCommands}
                pinnedCommandIds={commandPreferences.pinnedCommandIds}
                usageById={commandPreferences.usageById}
                commandContext={commandContext}
                onQuicklinkExecute={(keyword, query) => {
                  void handleQuicklinkExecute(keyword, query);
                }}
                onQuicklinkFill={setCommandSearch}
                onRegistryCommandSelect={(commandId) => {
                  void handleRegistryCommandSelect(commandId);
                }}
                onRegistryCommandIntent={prefetchRegistryCommand}
                onSetPinned={setPinned}
              />
            ) : null}

            <LauncherSecondaryPanel
              activePanel={activePanel}
              onOpenCalculatorHistory={() => {
                void openPreparedSecondaryPanel("calculator-history");
              }}
              onOpenEmoji={() => {
                void openPreparedSecondaryPanel("emoji");
              }}
              onBack={backToCommands}
              pinnedCommandIds={commandPreferences.pinnedCommandIds}
              hiddenCommandIds={hiddenCommandIds}
              fallbackEnabled={commandPreferences.fallbackEnabled}
              fallbackCommandIds={commandPreferences.fallbackCommandIds}
              onSetPinned={setPinned}
              onSetHidden={setHidden}
              onMovePinned={movePinned}
              onSetFallbackEnabled={setFallbackActionsEnabled}
              onSetFallbackCommandIds={setFallbackCommandIds}
            />
          </CommandList>
        )}

        {shouldShowFooter && (
          <LauncherFooter
            leftSlot={isShellTrigger ? <span>Beam Shell</span> : undefined}
            primaryAction={footerPrimaryAction}
            actionsEnabled={activePanel === "commands"}
          />
        )}
      </Command>
    </div>
  );
}
