import { useQueryClient } from "@tanstack/react-query";
import { isTauri } from "@tauri-apps/api/core";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import RegistryCommandGroup from "@/command-registry/components/registry-command-group";
import { buildCommandContext } from "@/command-registry/context";
import {
  CALCULATOR_COPY_COMMAND_ID,
  CALCULATOR_RESULT_COMMAND_ID,
  createDefaultCommandProviders,
  createQuicklinkExecuteCommandDescriptor,
  INTERNAL_EXTENSION_ID,
  QUICKLINK_EXECUTE_COMMAND_ID,
  toQuicklinkExecuteCommandId,
} from "@/command-registry/default-providers";
import { dispatchCommand } from "@/command-registry/dispatcher";
import { createCommandProviderOrchestrator } from "@/command-registry/providers";
import type { RankedCommand } from "@/command-registry/ranker";
import { rankCommands } from "@/command-registry/ranker";
import { staticCommandRegistry } from "@/command-registry/registry";
import { resolveStaticCommandCandidates } from "@/command-registry/static-candidates";
import { createStaticCommandRegistryStore } from "@/command-registry/static-registry";
import { logDispatchFailure, logProviderResolution } from "@/command-registry/telemetry";
import type { CommandDescriptor, CommandProviderResolution } from "@/command-registry/types";
import { useCommandPreferences } from "@/command-registry/use-command-preferences";
import { Command, CommandInput, CommandList, CommandSeparator } from "@/components/ui/command";
import { cn } from "@/lib/utils";

import { saveCalculatorHistory } from "@/modules/calculator-history/api/save-calculator-history";
import CalculatorHistoryCommandGroup from "@/modules/calculator-history/components/calculator-history-command-group";
import { CALCULATOR_AUTO_SAVE_DEBOUNCE_MS } from "@/modules/calculator/constants";
import ClipboardCommandGroup from "@/modules/clipboard/components/clipboard-command-group";
import DictionaryCommandGroup from "@/modules/dictionary/components/dictionary-command-group";
import EmojiCommandGroup from "@/modules/emoji/components/emoji-command-group";
import FileSearchCommandGroup from "@/modules/file-search/components/file-search-command-group";
import { executeQuicklink, findQuicklinkByKeyword } from "@/modules/quicklinks/api/quicklinks";
import { QuicklinkPreview } from "@/modules/quicklinks/components/quicklink-preview";
import QuicklinksCommandGroup from "@/modules/quicklinks/components/quicklinks-command-group";
import { useQuicklinks } from "@/modules/quicklinks/hooks/use-quicklinks";
import { setLauncherCompactMode } from "@/modules/settings/api/set-launcher-compact-mode";
import SettingsCommandGroup from "@/modules/settings/components/settings-command-group";
import { useUiLayout } from "@/modules/settings/hooks/use-ui-layout";
import SpeedTestCommandGroup from "@/modules/speed-test/components/speed-test-command-group";
import TranslationCommandGroup from "@/modules/translation/components/translation-command-group";
import {
  isLauncherCommandListExpandedPanel,
  isLauncherFooterHidden,
  isLauncherInputHidden,
  useLauncherUiStore,
} from "@/store/use-launcher-ui-store";

export default function LauncherCommand() {
  const queryClient = useQueryClient();
  const [calculatorSessionId, setCalculatorSessionId] = useState(() => crypto.randomUUID());
  const [rankedRegistryCommands, setRankedRegistryCommands] = useState<RankedCommand[]>([]);
  const commandSearch = useLauncherUiStore((state) => state.commandSearch);
  const activePanel = useLauncherUiStore((state) => state.activePanel);
  const fileSearchQuery = useLauncherUiStore((state) => state.fileSearchQuery);
  const dictionaryQuery = useLauncherUiStore((state) => state.dictionaryQuery);
  const translationQuery = useLauncherUiStore((state) => state.translationQuery);
  const quicklinksView = useLauncherUiStore((state) => state.quicklinksView);
  const setCommandSearch = useLauncherUiStore((state) => state.setCommandSearch);
  const setActivePanel = useLauncherUiStore((state) => state.setActivePanel);
  const setFileSearchQuery = useLauncherUiStore((state) => state.setFileSearchQuery);
  const setDictionaryQuery = useLauncherUiStore((state) => state.setDictionaryQuery);
  const setTranslationQuery = useLauncherUiStore((state) => state.setTranslationQuery);
  const setQuicklinksView = useLauncherUiStore((state) => state.setQuicklinksView);
  const openPanel = useLauncherUiStore((state) => state.openPanel);
  const openFileSearch = useLauncherUiStore((state) => state.openFileSearch);
  const openDictionary = useLauncherUiStore((state) => state.openDictionary);
  const openTranslation = useLauncherUiStore((state) => state.openTranslation);
  const backToCommands = useLauncherUiStore((state) => state.backToCommands);

  const { data: quicklinks = [] } = useQuicklinks();
  const { isCompressed } = useUiLayout();
  const { rankingSignals, hiddenCommandIds, markUsed } = useCommandPreferences();
  const trimmedCommandSearch = commandSearch.trim();
  const isQuicklinkTrigger = trimmedCommandSearch.startsWith("!");
  const quicklinkParts = trimmedCommandSearch.slice(1).split(/\s+/).filter(Boolean);
  const quicklinkKeyword = quicklinkParts[0] ?? "";
  const quicklinkQuery = quicklinkParts.slice(1).join(" ");
  const matchedQuicklink = quicklinkKeyword
    ? findQuicklinkByKeyword(quicklinks, quicklinkKeyword)
    : undefined;
  const providerOrchestrator = useMemo(
    () =>
      createCommandProviderOrchestrator({
        providers: createDefaultCommandProviders(),
      }),
    [],
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

  useEffect(() => {
    let cancelled = false;
    const staticCandidates = resolveStaticCommandCandidates(staticCommandRegistry, commandContext);

    const applyRankedCommands = (dynamicResolution: CommandProviderResolution) => {
      if (cancelled) {
        return;
      }

      const dynamicCommands = dynamicResolution.commands.filter(
        (command) => command.scope.includes("all") || command.scope.includes(commandContext.mode),
      );
      const visibleCommands = [...staticCandidates, ...dynamicCommands].filter(
        (command) => !hiddenCommandIds.has(command.id),
      );
      const ranked = rankCommands({
        commands: visibleCommands,
        context: commandContext,
        signals: rankingSignals,
      });
      setRankedRegistryCommands(ranked);
    };

    applyRankedCommands({
      commands: [],
      errors: [],
      telemetry: [],
    });

    void providerOrchestrator
      .resolveIncremental(commandContext, (partialResolution) => {
        applyRankedCommands(partialResolution);
      })
      .then((result) => {
        if (cancelled) {
          return;
        }

        applyRankedCommands(result);
        logProviderResolution(result, {
          mode: commandContext.mode,
          activePanel: commandContext.activePanel,
          query: commandContext.query,
        });
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        console.error("Failed to resolve registry commands:", error);
        setRankedRegistryCommands([]);
      });

    return () => {
      cancelled = true;
      providerOrchestrator.cancel();
    };
  }, [commandContext, hiddenCommandIds, providerOrchestrator, rankingSignals]);

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

  const handleRegistryCommandSelect = async (
    commandId: string,
    fallbackCommand?: CommandDescriptor,
  ) => {
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
        customActionHandler: async (request) => {
          if (request.extensionId !== INTERNAL_EXTENSION_ID) {
            return {
              ok: false,
              code: "UNSUPPORTED_ACTION",
              message: "Unsupported custom command action.",
            };
          }

          if (request.extensionCommandId === CALCULATOR_COPY_COMMAND_ID) {
            const calculatorQuery =
              typeof request.payload.calculatorQuery === "string"
                ? request.payload.calculatorQuery.trim()
                : "";
            const calculatorResult =
              typeof request.payload.calculatorResult === "string"
                ? request.payload.calculatorResult.trim()
                : "";

            if (!calculatorQuery || !calculatorResult) {
              return {
                ok: false,
                code: "INVALID_INPUT",
                message: "Calculator command payload is missing query or result.",
              };
            }

            try {
              await navigator.clipboard.writeText(calculatorResult);
              await saveCalculatorHistory(calculatorQuery, calculatorResult, calculatorSessionId);
              queryClient.invalidateQueries({ queryKey: ["calculator", "history"] });
              return { ok: true, payload: { copied: calculatorResult } };
            } catch (error) {
              console.error("Failed to execute calculator custom command:", error);
              return {
                ok: false,
                code: "BACKEND_FAILURE",
                message: "Could not copy calculator result.",
              };
            }
          }

          if (request.extensionCommandId === QUICKLINK_EXECUTE_COMMAND_ID) {
            const quicklinkKeywordFromPayload =
              typeof request.payload.quicklinkKeyword === "string"
                ? request.payload.quicklinkKeyword.trim()
                : "";
            const executionQuery = request.query?.trim() ?? "";
            if (!quicklinkKeywordFromPayload) {
              return {
                ok: false,
                code: "INVALID_INPUT",
                message: "Quicklink command payload is missing keyword.",
              };
            }

            try {
              await executeQuicklink(quicklinkKeywordFromPayload, executionQuery);
              setCommandSearch("");
              return { ok: true, payload: { keyword: quicklinkKeywordFromPayload } };
            } catch (error) {
              console.error("Failed to execute quicklink custom command:", error);
              return {
                ok: false,
                code: "BACKEND_FAILURE",
                message: "Could not execute quicklink.",
              };
            }
          }

          return {
            ok: false,
            code: "UNSUPPORTED_ACTION",
            message: "Unsupported custom command action.",
          };
        },
      },
    });

    if (!result.ok) {
      logDispatchFailure(commandId, result, {
        mode: commandContext.mode,
        activePanel: commandContext.activePanel,
        query: commandContext.query,
      });
      return;
    }

    markUsed(commandId);
  };

  const handleQuicklinkExecute = async (
    keyword: string = quicklinkKeyword,
    query: string = quicklinkQuery,
  ) => {
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
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (activePanel !== "commands") {
      return;
    }

    if (e.key === "Enter" && isQuicklinkTrigger && matchedQuicklink) {
      e.preventDefault();
      await handleQuicklinkExecute(matchedQuicklink.keyword, quicklinkQuery);
    }
  };

  let commandListContent;
  if (activePanel === "commands") {
    commandListContent = (
      <div className="py-1">
        {isQuicklinkTrigger ? (
          <>
            <QuicklinkPreview
              quicklinks={quicklinks}
              keyword={quicklinkKeyword}
              query={quicklinkQuery}
              onExecute={handleQuicklinkExecute}
              onFill={setCommandSearch}
            />
            <CommandSeparator className="my-1 opacity-50" />
          </>
        ) : null}

        <RegistryCommandGroup
          commands={rankedRegistryCommands}
          query={commandContext.query}
          mode={commandContext.mode}
          onSelect={(commandId) => {
            void handleRegistryCommandSelect(commandId);
          }}
        />
      </div>
    );
  }

  const shouldCollapseToInputOnly =
    activePanel === "commands" && isCompressed && trimmedCommandSearch.length === 0;
  const isInputHidden = isLauncherInputHidden(activePanel);
  const isCommandListExpandedPanel = isLauncherCommandListExpandedPanel(activePanel);

  const shouldShowFooter = !shouldCollapseToInputOnly && !isLauncherFooterHidden(activePanel);

  useEffect(() => {
    const syncWindowSize = async () => {
      try {
        const inputWrapper = document.querySelector<HTMLElement>(
          "[data-slot='command-input-wrapper']",
        );
        const measuredInputHeight = inputWrapper
          ? Math.ceil(inputWrapper.getBoundingClientRect().height)
          : undefined;

        await setLauncherCompactMode(shouldCollapseToInputOnly, measuredInputHeight);
      } catch (error) {
        console.error("Failed to update launcher window size:", error);
      }
    };

    const frame = window.requestAnimationFrame(() => {
      void syncWindowSize();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [shouldCollapseToInputOnly]);

  const takeoverPanelContent = useMemo(() => {
    if (activePanel === "file-search") {
      return (
        <FileSearchCommandGroup
          isOpen
          query={fileSearchQuery}
          onOpen={(capturedQuery) => {
            openFileSearch(capturedQuery);
          }}
          onBack={backToCommands}
        />
      );
    }
    if (activePanel === "dictionary") {
      return (
        <DictionaryCommandGroup
          isOpen
          query={dictionaryQuery}
          onOpen={(capturedQuery) => {
            openDictionary(capturedQuery);
          }}
          onBack={backToCommands}
        />
      );
    }
    if (activePanel === "translation") {
      return (
        <TranslationCommandGroup
          isOpen
          query={translationQuery}
          onOpen={(capturedQuery) => {
            openTranslation(capturedQuery);
          }}
          onBack={backToCommands}
        />
      );
    }
    if (activePanel === "quicklinks") {
      return (
        <QuicklinksCommandGroup
          isOpen
          view={quicklinksView}
          setView={setQuicklinksView}
          onOpen={() => {
            openPanel("quicklinks");
          }}
          onBack={backToCommands}
        />
      );
    }
    if (activePanel === "speed-test") {
      return (
        <SpeedTestCommandGroup
          isOpen
          onOpen={() => {
            openPanel("speed-test", true);
          }}
          onBack={backToCommands}
        />
      );
    }
    if (activePanel === "clipboard") {
      return (
        <ClipboardCommandGroup
          isOpen
          onOpen={() => {
            openPanel("clipboard", true);
          }}
          onBack={backToCommands}
        />
      );
    }

    return null;
  }, [
    activePanel,
    backToCommands,
    dictionaryQuery,
    fileSearchQuery,
    openDictionary,
    openFileSearch,
    openPanel,
    openTranslation,
    quicklinksView,
    setQuicklinksView,
    translationQuery,
  ]);

  return (
    <div className="relative h-full w-full bg-background">
      <Command
        shouldFilter={false}
        onKeyDown={handleKeyDown}
        className="h-full w-full overflow-hidden bg-transparent"
      >
        {!isInputHidden && (
          <CommandInput
            value={commandSearch}
            onValueChange={setCommandSearch}
            placeholder="Search Beam..."
            className="border-none"
          />
        )}

        {/* If File Search or Dictionary is open, it takes over the view entirely */}

        {takeoverPanelContent ? (
          takeoverPanelContent
        ) : shouldCollapseToInputOnly ? null : (
          <CommandList
            className={cn(
              "flex-1 px-1 transition-all duration-300",
              isCommandListExpandedPanel
                ? "min-h-0 flex flex-col h-full"
                : "max-h-none overflow-y-auto",
            )}
          >
            {commandListContent}

            {activePanel === "calculator-history" && (
              <CalculatorHistoryCommandGroup
                isOpen
                onOpen={() => {
                  openPanel("calculator-history", true);
                }}
                onBack={backToCommands}
              />
            )}

            {activePanel === "emoji" && (
              <EmojiCommandGroup
                isOpen
                onOpen={() => {
                  openPanel("emoji", true);
                }}
                onBack={backToCommands}
              />
            )}

            {activePanel === "settings" && (
              <SettingsCommandGroup
                isOpen
                onOpen={() => {
                  openPanel("settings", true);
                }}
                onBack={backToCommands}
              />
            )}
          </CommandList>
        )}

        {shouldShowFooter && (
          <div className="flex h-9 items-center justify-between border-t border-border/40 px-4 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60">
            <div className="flex items-center gap-2">
              <Search className="size-3" />
              <span>Beam</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <kbd className="rounded border border-border/60 bg-muted/30 px-1 py-0.5 font-mono text-[9px] text-foreground/70">
                  ENTER
                </kbd>
                <span>Open</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="rounded border border-border/60 bg-muted/30 px-1 py-0.5 font-mono text-[9px] text-foreground/70">
                  ESC
                </kbd>
                <span>Back</span>
              </div>
            </div>
          </div>
        )}
      </Command>
    </div>
  );
}
