import { useQueryClient } from "@tanstack/react-query";
import { isTauri } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { QUICKLINK_TRIGGER_MODE } from "@/command-registry/trigger-registry";
import type { CommandDescriptor } from "@/command-registry/types";
import { useCommandPreferences } from "@/command-registry/use-command-preferences";
import { Command, CommandInput, CommandList } from "@/components/ui/command";
import { isLauncherActionsHotkey, requestLauncherActionsToggle } from "@/lib/launcher-actions";
import { cn } from "@/lib/utils";

import { saveCalculatorHistory } from "@/modules/calculator-history/api/save-calculator-history";
import { CALCULATOR_AUTO_SAVE_DEBOUNCE_MS } from "@/modules/calculator/constants";
import { LauncherCommandModeContent } from "@/modules/launcher/components/launcher-command-mode-content";
import { LauncherFooter } from "@/modules/launcher/components/launcher-footer";
import { LauncherSecondaryPanel } from "@/modules/launcher/components/launcher-secondary-panel";
import { LauncherTakeoverPanel } from "@/modules/launcher/components/launcher-takeover-panel";
import { useExtensionSidecarEvents } from "@/modules/launcher/hooks/use-extension-sidecar-events";
import { useLauncherDeepLinks } from "@/modules/launcher/hooks/use-launcher-deep-links";
import { useLauncherPanelPrefetch } from "@/modules/launcher/hooks/use-launcher-panel-prefetch";
import { useLauncherWindowSizeSync } from "@/modules/launcher/hooks/use-launcher-window-size-sync";
import { useRankedRegistryCommands } from "@/modules/launcher/hooks/use-ranked-registry-commands";
import {
  isLauncherBackHotkey,
  runLauncherPanelBackHandler,
} from "@/modules/launcher/lib/back-navigation";
import { createCustomActionHandler } from "@/modules/launcher/lib/create-custom-action-handler";
import { extensionSidecarService } from "@/modules/extensions/sidecar-service";
import { ExtensionToastBridge } from "@/modules/extensions/components/extension-toast-bridge";
import { useExtensionRuntimeStore } from "@/modules/extensions/runtime/store";
import { findQuicklinkByKeyword } from "@/modules/quicklinks/api/quicklinks";
import { useQuicklinks } from "@/modules/quicklinks/hooks/use-quicklinks";
import { HOTKEY_BACKEND_STATUS_EVENT, HOTKEY_COMMAND_EVENT } from "@/modules/settings/api/hotkeys";
import { useUiLayout } from "@/modules/settings/hooks/use-ui-layout";
import { useAwakeStore } from "@/modules/system-actions/store/awake-store";
import {
  isLauncherCommandListExpandedPanel,
  isLauncherFooterHidden,
  isLauncherInputHidden,
  isLauncherTakeoverPanel,
  useLauncherUiStore,
} from "@/store/use-launcher-ui-store";

function focusLauncherInputElement() {
  const input = document.querySelector<HTMLInputElement>('[data-slot="command-input"]');
  if (!input) {
    return;
  }

  if (document.activeElement === input) {
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
  const [calculatorSessionId, setCalculatorSessionId] = useState(() => crypto.randomUUID());
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

  const { data: quicklinks = [] } = useQuicklinks();
  const { isCompressed } = useUiLayout();
  const {
    state: commandPreferences,
    rankingSignals,
    hiddenCommandIds,
    markUsed,
    setPinned,
    setHidden,
    movePinned,
    setFallbackActionsEnabled,
    setFallbackCommandIds,
  } = useCommandPreferences();
  useLauncherDeepLinks({ openPanel, backToCommands });
  useExtensionSidecarEvents({ backToCommands });
  useLauncherPanelPrefetch();

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
  const quicklinkKeyword = commandContext.quicklinkKeyword;
  const quicklinkQuery = commandContext.query;
  const matchedQuicklink = quicklinkKeyword
    ? findQuicklinkByKeyword(quicklinks, quicklinkKeyword)
    : undefined;

  const { rankedRegistryCommands, fallbackRegistryCommands } = useRankedRegistryCommands({
    commandContext,
    hiddenCommandIds,
    rankingSignals,
    fallbackEnabled: commandPreferences.fallbackEnabled,
    fallbackCommandIds: commandPreferences.fallbackCommandIds,
  });

  useEffect(() => {
    if (trimmedCommandSearch.length === 0) {
      setCalculatorSessionId(crypto.randomUUID());
    }
  }, [trimmedCommandSearch]);

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

  useEffect(() => {
    if (!calculatorPreview) {
      return;
    }

    const timerId = window.setTimeout(() => {
      void saveCalculatorHistory(
        calculatorPreview.query,
        calculatorPreview.result,
        calculatorSessionId,
      ).then(() => {
        queryClient.invalidateQueries({ queryKey: ["calculator", "history"] });
      });
    }, CALCULATOR_AUTO_SAVE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [calculatorPreview?.query, calculatorPreview?.result, calculatorSessionId, queryClient]);

  const customActionHandler = useMemo(
    () =>
      createCustomActionHandler({
        calculatorSessionId,
        setCommandSearch,
        runExtensionCommand: async (request: CustomActionRequest) => {
          const pluginPath =
            typeof request.payload.pluginPath === "string" ? request.payload.pluginPath.trim() : "";
          const pluginMode = request.payload.pluginMode === "no-view" ? "no-view" : "view";

          if (!pluginPath) {
            throw new Error("Extension command payload is missing pluginPath.");
          }

          useExtensionRuntimeStore.getState().resetForNewPlugin({
            pluginPath,
            pluginMode,
            title: request.command.title,
            subtitle: request.command.subtitle,
          });

          if (pluginMode === "view") {
            openPanel("extension-runner", true);
          }

          try {
            await extensionSidecarService.runPlugin({
              pluginPath,
              mode: pluginMode,
              aiAccessStatus: false,
            });
          } catch (error) {
            useExtensionRuntimeStore.getState().resetRuntime();
            if (pluginMode === "view") {
              backToCommands();
            }
            throw error;
          }
        },
        onCalculatorHistoryChanged: () => {
          void queryClient.invalidateQueries({ queryKey: ["calculator", "history"] });
        },
      }),
    [backToCommands, calculatorSessionId, openPanel, queryClient, setCommandSearch],
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
      const quicklink = findQuicklinkByKeyword(quicklinks, keyword);
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
    [handleRegistryCommandSelect, quicklinkKeyword, quicklinkQuery, quicklinks],
  );

  const rankedCommandsRef = useRef(rankedRegistryCommands);
  const handleRegistryCommandSelectRef = useRef(handleRegistryCommandSelect);

  useEffect(() => {
    rankedCommandsRef.current = rankedRegistryCommands;
  }, [rankedRegistryCommands]);

  useEffect(() => {
    handleRegistryCommandSelectRef.current = handleRegistryCommandSelect;
  }, [handleRegistryCommandSelect]);

  useEffect(() => {
    if (!isTauri()) {
      return;
    }

    let unlistenFn: UnlistenFn | null = null;

    listen<HotkeyCommandEventPayload>(HOTKEY_COMMAND_EVENT, (event) => {
      const commandId =
        typeof event.payload?.command_id === "string" ? event.payload.command_id.trim() : "";
      if (!commandId) {
        return;
      }

      const dynamicFallback = rankedCommandsRef.current.find(
        (entry) => entry.command.id === commandId,
      )?.command;

      if (!dynamicFallback && !staticCommandRegistry.has(commandId)) {
        toast.error(`Hotkey command not available: ${commandId}`);
        return;
      }

      void handleRegistryCommandSelectRef.current(commandId, dynamicFallback);
    })
      .then((cleanup) => {
        unlistenFn = cleanup;
      })
      .catch(() => {
        unlistenFn = null;
      });

    return () => {
      unlistenFn?.();
    };
  }, []);

  useEffect(() => {
    if (!isTauri()) {
      return;
    }

    let unlistenFn: UnlistenFn | null = null;

    listen<HotkeyBackendStatusEventPayload>(HOTKEY_BACKEND_STATUS_EVENT, (event) => {
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
        unlistenFn = cleanup;
      })
      .catch(() => {
        unlistenFn = null;
      });

    return () => {
      unlistenFn?.();
    };
  }, []);

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

    if (e.key === "Enter" && isQuicklinkTrigger && matchedQuicklink) {
      e.preventDefault();
      await handleQuicklinkExecute(matchedQuicklink.keyword, quicklinkQuery);
    }
  };

  useEffect(() => {
    if (activePanel === "commands") {
      return;
    }

    const handleWindowBackHotkey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || !isLauncherBackHotkey(event)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const handledByPanel = runLauncherPanelBackHandler(activePanel);
      if (!handledByPanel) {
        backToCommands();
      }
    };

    window.addEventListener("keydown", handleWindowBackHotkey);
    return () => {
      window.removeEventListener("keydown", handleWindowBackHotkey);
    };
  }, [activePanel, backToCommands]);

  const shouldCollapseToInputOnly =
    activePanel === "commands" && isCompressed && trimmedCommandSearch.length === 0;
  const isInputHidden = isLauncherInputHidden(activePanel);
  const hasTakeoverPanel = isLauncherTakeoverPanel(activePanel);
  const isCommandListExpandedPanel = isLauncherCommandListExpandedPanel(activePanel);

  const shouldShowFooter = !shouldCollapseToInputOnly && !isLauncherFooterHidden(activePanel);

  useLauncherWindowSizeSync(activePanel === "commands", shouldCollapseToInputOnly);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    if (activePanel !== "commands" || isInputHidden) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      focusLauncherInputElement();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [activePanel, isInputHidden]);

  return (
    <div className="relative h-full w-full bg-transparent">
      <ExtensionToastBridge />
      <Command
        shouldFilter={false}
        onKeyDown={handleKeyDown}
        className="glass-effect h-full w-full overflow-hidden text-foreground"
      >
        {!isInputHidden && (
          <CommandInput
            value={commandSearch}
            onValueChange={setCommandSearch}
            placeholder="Search Beam..."
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
            openQuicklinks={() => {
              openPanel("quicklinks");
            }}
            openSpeedTest={() => {
              openPanel("speed-test", true);
            }}
            openClipboard={() => {
              openPanel("clipboard", true);
            }}
            openAi={() => {
              openPanel("ai", true);
            }}
            openTodo={() => {
              openPanel("todo", true);
            }}
            openSnippets={() => {
              openPanel("snippets", true);
            }}
            openExtensions={() => {
              openPanel("extensions", true);
            }}
            openScriptCommands={() => {
              openPanel("script-commands", true);
            }}
            backToCommands={backToCommands}
          />
        )}

        {hasTakeoverPanel || shouldCollapseToInputOnly ? null : (
          <CommandList
            className={cn(
              "list-area custom-scrollbar flex-1 px-1.5 transition-all duration-300",
              isCommandListExpandedPanel
                ? "min-h-0 flex flex-col h-full"
                : "max-h-none overflow-y-auto",
            )}
          >
            {activePanel === "commands" ? (
              <LauncherCommandModeContent
                isQuicklinkTrigger={isQuicklinkTrigger}
                quicklinks={quicklinks}
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
                onSetPinned={setPinned}
                onOpenTodoPreview={() => {
                  void handleRegistryCommandSelect("todo.panel.open");
                }}
              />
            ) : null}

            <LauncherSecondaryPanel
              activePanel={activePanel}
              onOpenCalculatorHistory={() => {
                openPanel("calculator-history", true);
              }}
              onOpenEmoji={() => {
                openPanel("emoji", true);
              }}
              onOpenSettings={() => {
                openPanel("settings", true);
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

        {shouldShowFooter && <LauncherFooter />}
      </Command>
    </div>
  );
}
