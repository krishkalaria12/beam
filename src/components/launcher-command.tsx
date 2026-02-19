import { Search } from "lucide-react";
import { useEffect, useState } from "react";

import { Command, CommandInput, CommandList, CommandSeparator } from "@/components/ui/command";
import { cn } from "@/lib/utils";

import ApplicationsCommandGroup from "@/modules/applications/components/applications-command-group";
import CalculatorCommandGroup from "@/modules/calculator/components/calculator-command-group";
import CalculatorHistoryCommandGroup from "@/modules/calculator-history/components/calculator-history-command-group";
import ClipboardCommandGroup from "@/modules/clipboard/components/clipboard-command-group";
import DictionaryCommandGroup from "@/modules/dictionary/components/dictionary-command-group";
import EmojiCommandGroup from "@/modules/emoji/components/emoji-command-group";
import FileSearchCommandGroup from "@/modules/file-search/components/file-search-command-group";
import { useQuicklinks } from "@/modules/quicklinks/hooks/use-quicklinks";
import QuicklinksCommandGroup from "@/modules/quicklinks/components/quicklinks-command-group";
import { findQuicklinkByKeyword, executeQuicklink } from "@/modules/quicklinks/api/quicklinks";
import { QuicklinkPreview } from "@/modules/quicklinks/components/quicklink-preview";
import SearchCommandGroup from "@/modules/search/components/search-command-group";
import SettingsCommandGroup from "@/modules/settings/components/settings-command-group";
import { setLauncherCompactMode } from "@/modules/settings/api/set-launcher-compact-mode";
import { useUiLayout } from "@/modules/settings/hooks/use-ui-layout";
import SpeedTestCommandGroup from "@/modules/speed-test/components/speed-test-command-group";
import SystemActionsCommandGroup from "@/modules/system-actions/components/system-actions-command-group";
import TranslationCommandGroup from "@/modules/translation/components/translation-command-group";

export default function LauncherCommand() {
  const [commandSearch, setCommandSearch] = useState("");
  const [fileSearchQuery, setFileSearchQuery] = useState("");
  const [dictionaryQuery, setDictionaryQuery] = useState("");
  const [translationQuery, setTranslationQuery] = useState("");
  const [activePanel, setActivePanel] = useState<"commands" | "clipboard" | "emoji" | "settings" | "calculator-history" | "file-search" | "dictionary" | "quicklinks" | "speed-test" | "translation">("commands");
  const isClipboardPanelOpen = activePanel === "clipboard";
  const isEmojiPanelOpen = activePanel === "emoji";
  const isSettingsPanelOpen = activePanel === "settings";
  const isCalculatorHistoryPanelOpen = activePanel === "calculator-history";
  const isFileSearchPanelOpen = activePanel === "file-search";
  const isDictionaryPanelOpen = activePanel === "dictionary";
  const isQuicklinksPanelOpen = activePanel === "quicklinks";
  const isSpeedTestPanelOpen = activePanel === "speed-test";
  const isTranslationPanelOpen = activePanel === "translation";
  const [quicklinksView, setQuicklinksView] = useState<"create" | "manage">("manage");

  const { data: quicklinks = [] } = useQuicklinks();
  const { isCompressed } = useUiLayout();
  const trimmedCommandSearch = commandSearch.trim();
  const isQuicklinkTrigger = trimmedCommandSearch.startsWith("!");
  const isSystemTrigger = trimmedCommandSearch.startsWith("$");
  const quicklinkParts = trimmedCommandSearch.slice(1).split(/\s+/).filter(Boolean);
  const quicklinkKeyword = quicklinkParts[0] ?? "";
  const quicklinkQuery = quicklinkParts.slice(1).join(" ");
  const systemQuery = trimmedCommandSearch.slice(1).trim();
  const matchedQuicklink = quicklinkKeyword
    ? findQuicklinkByKeyword(quicklinks, quicklinkKeyword)
    : undefined;

  const handleQuicklinkExecute = async (keyword: string = quicklinkKeyword, query: string = quicklinkQuery) => {
    const quicklink = findQuicklinkByKeyword(quicklinks, keyword);
    if (!quicklink) {
      return;
    }

    try {
      await executeQuicklink(quicklink.keyword, query);
      setCommandSearch("");
    } catch (error) {
      console.error("Failed to execute quicklink:", error);
    }
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
    if (isSystemTrigger) {
      commandListContent = (
        <div className="py-1">
          <SystemActionsCommandGroup queryOverride={systemQuery} showAllWhenEmpty />
        </div>
      );
    } else if (isCompressed) {
      commandListContent = trimmedCommandSearch.length === 0 ? null : (
        <div className="py-1">
          <SettingsCommandGroup
            isOpen={false}
            onOpen={() => {
              setActivePanel("settings");
              setCommandSearch("");
            }}
            onBack={() => {
              setActivePanel("commands");
              setCommandSearch("");
            }}
          />
          <CalculatorCommandGroup />
          <ApplicationsCommandGroup />
          <SystemActionsCommandGroup />
          <SpeedTestCommandGroup
            isOpen={false}
            onOpen={() => {
              setActivePanel("speed-test");
              setCommandSearch("");
            }}
            onBack={() => {}} // Not used when closed
          />
          <FileSearchCommandGroup
            isOpen={false}
            onOpen={(capturedQuery) => {
              setFileSearchQuery(capturedQuery);
              setActivePanel("file-search");
            }}
            onBack={() => {}} // Not used when closed
          />
          <DictionaryCommandGroup
            isOpen={false}
            onOpen={(capturedQuery) => {
              setDictionaryQuery(capturedQuery);
              setActivePanel("dictionary");
            }}
            onBack={() => {}} // Not used when closed
          />
          <TranslationCommandGroup
            isOpen={false}
            onOpen={(capturedQuery) => {
              setTranslationQuery(capturedQuery);
              setActivePanel("translation");
            }}
            onBack={() => {}} // Not used when closed
          />
          <QuicklinksCommandGroup
            isOpen={false}
            view={quicklinksView}
            setView={setQuicklinksView}
            onOpen={() => {
              setActivePanel("quicklinks");
            }}
            onBack={() => {}} // Not used when closed
          />
          <SearchCommandGroup />
        </div>
      );
    } else if (isQuicklinkTrigger) {
      commandListContent = (
        <div className="py-1">
          <QuicklinkPreview
            quicklinks={quicklinks}
            keyword={quicklinkKeyword}
            query={quicklinkQuery}
            onExecute={handleQuicklinkExecute}
            onFill={setCommandSearch}
          />
          <CommandSeparator className="my-1 opacity-50" />
          <FileSearchCommandGroup
            isOpen={false}
            queryOverride={quicklinkQuery}
            onOpen={(capturedQuery) => {
              setFileSearchQuery(capturedQuery);
              setActivePanel("file-search");
            }}
            onBack={() => {}} // Not used when closed
          />
          <SpeedTestCommandGroup
            isOpen={false}
            queryOverride={quicklinkQuery}
            onOpen={() => {
              setActivePanel("speed-test");
              setCommandSearch("");
            }}
            onBack={() => {}} // Not used when closed
          />
          <TranslationCommandGroup
            isOpen={false}
            queryOverride={quicklinkQuery}
            onOpen={(capturedQuery) => {
              setTranslationQuery(capturedQuery);
              setActivePanel("translation");
            }}
            onBack={() => {}} // Not used when closed
          />
          <SearchCommandGroup queryOverride={quicklinkQuery} />
        </div>
      );
    } else {
        commandListContent = (
            <div className="py-1">
              <SettingsCommandGroup
                isOpen={false}
                onOpen={() => {
                  setActivePanel("settings");
                  setCommandSearch("");
                }}
                onBack={() => {
                  setActivePanel("commands");
                  setCommandSearch("");
                }}
              />
              <ClipboardCommandGroup
                isOpen={false}
                onOpen={() => {
                  setActivePanel("clipboard");
                  setCommandSearch("");
                }}
                onBack={() => {
                  setActivePanel("commands");
                  setCommandSearch("");
                }}
              />
              <CalculatorHistoryCommandGroup
                isOpen={false}
                onOpen={() => {
                  setActivePanel("calculator-history");
                  setCommandSearch("");
                }}
                onBack={() => {
                  setActivePanel("commands");
                  setCommandSearch("");
                }}
              />
              <EmojiCommandGroup
                isOpen={false}
                onOpen={() => {
                  setActivePanel("emoji");
                  setCommandSearch("");
                }}
                onBack={() => {
                  setActivePanel("commands");
                  setCommandSearch("");
                }}
              />

              <CommandSeparator className="my-1 opacity-50" />

              <CalculatorCommandGroup />
              <ApplicationsCommandGroup />
              <SystemActionsCommandGroup />
              <SpeedTestCommandGroup
                isOpen={false}
                onOpen={() => {
                  setActivePanel("speed-test");
                  setCommandSearch("");
                }}
                onBack={() => {}} // Not used when closed
              />
              <FileSearchCommandGroup 
                isOpen={false}
                onOpen={(capturedQuery) => {
                    setFileSearchQuery(capturedQuery);
                    setActivePanel("file-search");
                }}
                onBack={() => {}} // Not used when closed
              />
              <DictionaryCommandGroup
                isOpen={false}
                onOpen={(capturedQuery) => {
                    setDictionaryQuery(capturedQuery);
                    setActivePanel("dictionary");
                }}
                onBack={() => {}} // Not used when closed
              />
              <TranslationCommandGroup
                isOpen={false}
                onOpen={(capturedQuery) => {
                    setTranslationQuery(capturedQuery);
                    setActivePanel("translation");
                }}
                onBack={() => {}} // Not used when closed
              />
              <QuicklinksCommandGroup
                isOpen={false}
                view={quicklinksView}
                setView={setQuicklinksView}
                onOpen={() => {
                    setActivePanel("quicklinks");
                }}
                onBack={() => {}} // Not used when closed
              />
              <SearchCommandGroup />
            </div>
        );
    }
  }

  const shouldCollapseToInputOnly =
    activePanel === "commands" &&
    isCompressed &&
    trimmedCommandSearch.length === 0;

  const shouldShowFooter =
    !shouldCollapseToInputOnly &&
    !isEmojiPanelOpen &&
    !isFileSearchPanelOpen &&
    !isDictionaryPanelOpen &&
    !isQuicklinksPanelOpen &&
    !isSpeedTestPanelOpen &&
    !isTranslationPanelOpen &&
    !isClipboardPanelOpen;

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

  return (
    <div className="relative h-full w-full bg-background">
      <Command
        shouldFilter={false}
        onKeyDown={handleKeyDown}
        className="h-full w-full overflow-hidden bg-transparent"
      >
        {!isEmojiPanelOpen && !isFileSearchPanelOpen && !isDictionaryPanelOpen && !isQuicklinksPanelOpen && !isSpeedTestPanelOpen && !isTranslationPanelOpen && !isClipboardPanelOpen && (
          <CommandInput
            value={commandSearch}
            onValueChange={setCommandSearch}
            placeholder="Search Beam..."
            className="border-none"
          />
        )}

        {/* If File Search or Dictionary is open, it takes over the view entirely */}
        
        {isFileSearchPanelOpen ? (
           <FileSearchCommandGroup
              isOpen
              query={fileSearchQuery}
              onOpen={(capturedQuery) => {
                setFileSearchQuery(capturedQuery);
                setActivePanel("file-search");
              }}
              onBack={() => {
                setActivePanel("commands");
                setCommandSearch("");
              }}
            />
        ) : isDictionaryPanelOpen ? (
           <DictionaryCommandGroup
              isOpen
              query={dictionaryQuery}
              onOpen={(capturedQuery) => {
                setDictionaryQuery(capturedQuery);
                setActivePanel("dictionary");
              }}
              onBack={() => {
                setActivePanel("commands");
                setCommandSearch("");
              }}
            />
        ) : isTranslationPanelOpen ? (
           <TranslationCommandGroup
              isOpen
              query={translationQuery}
              onOpen={(capturedQuery) => {
                setTranslationQuery(capturedQuery);
                setActivePanel("translation");
              }}
              onBack={() => {
                setActivePanel("commands");
                setCommandSearch("");
              }}
            />
        ) : isQuicklinksPanelOpen ? (
           <QuicklinksCommandGroup
              isOpen
              view={quicklinksView}
              setView={setQuicklinksView}
              onOpen={() => {
                setActivePanel("quicklinks");
              }}
              onBack={() => {
                setActivePanel("commands");
                setCommandSearch("");
              }}
            />
        ) : isSpeedTestPanelOpen ? (
           <SpeedTestCommandGroup
              isOpen
              onOpen={() => {
                setActivePanel("speed-test");
                setCommandSearch("");
              }}
              onBack={() => {
                setActivePanel("commands");
                setCommandSearch("");
              }}
            />
        ) : isClipboardPanelOpen ? (
            <ClipboardCommandGroup
              isOpen
              onOpen={() => {
                setActivePanel("clipboard");
                setCommandSearch("");
              }}
              onBack={() => {
                setActivePanel("commands");
                setCommandSearch("");
              }}
            />
        ) : shouldCollapseToInputOnly ? null : (
        <CommandList
          className={cn(
            "flex-1 px-1 transition-all duration-300",
            isEmojiPanelOpen ? "min-h-0 flex flex-col h-full" : "max-h-none overflow-y-auto"
          )}
        >
          {commandListContent}

          {isCalculatorHistoryPanelOpen && (
            <CalculatorHistoryCommandGroup
              isOpen
              onOpen={() => {
                setActivePanel("calculator-history");
                setCommandSearch("");
              }}
              onBack={() => {
                setActivePanel("commands");
                setCommandSearch("");
              }}
            />
          )}

          {isEmojiPanelOpen && (
            <EmojiCommandGroup
              isOpen
              onOpen={() => {
                setActivePanel("emoji");
                setCommandSearch("");
              }}
              onBack={() => {
                setActivePanel("commands");
                setCommandSearch("");
              }}
            />
          )}

          {isSettingsPanelOpen && (
            <SettingsCommandGroup
              isOpen
              onOpen={() => {
                setActivePanel("settings");
                setCommandSearch("");
              }}
              onBack={() => {
                setActivePanel("commands");
                setCommandSearch("");
              }}
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
                <kbd className="rounded border border-border/60 bg-muted/30 px-1 py-0.5 font-mono text-[9px] text-foreground/70">ENTER</kbd>
                <span>Open</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="rounded border border-border/60 bg-muted/30 px-1 py-0.5 font-mono text-[9px] text-foreground/70">ESC</kbd>
                <span>Back</span>
              </div>
            </div>
          </div>
        )}
      </Command>
    </div>
  );
}
