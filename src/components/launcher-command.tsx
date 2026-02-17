import { Search } from "lucide-react";
import { useState } from "react";

import { Command, CommandInput, CommandList, CommandSeparator } from "@/components/ui/command";
import { cn } from "@/lib/utils";

import ApplicationsCommandGroup from "@/modules/applications/components/applications-command-group";
import CalculatorCommandGroup from "@/modules/calculator/components/calculator-command-group";
import CalculatorHistoryCommandGroup from "@/modules/calculator-history/components/calculator-history-command-group";
import ClipboardCommandGroup from "@/modules/clipboard/components/clipboard-command-group";
import DictionaryCommandGroup from "@/modules/dictionary/components/dictionary-command-group";
import EmojiCommandGroup from "@/modules/emoji/components/emoji-command-group";
import FileSearchCommandGroup from "@/modules/file-search/components/file-search-command-group";
import SearchCommandGroup from "@/modules/search/components/search-command-group";
import SettingsCommandGroup from "@/modules/settings/components/settings-command-group";

export default function LauncherCommand() {
  const [commandSearch, setCommandSearch] = useState("");
  const [fileSearchQuery, setFileSearchQuery] = useState("");
  const [dictionaryQuery, setDictionaryQuery] = useState("");
  const [activePanel, setActivePanel] = useState<"commands" | "clipboard" | "emoji" | "settings" | "calculator-history" | "file-search" | "dictionary">("commands");
  const isClipboardPanelOpen = activePanel === "clipboard";
  const isEmojiPanelOpen = activePanel === "emoji";
  const isSettingsPanelOpen = activePanel === "settings";
  const isCalculatorHistoryPanelOpen = activePanel === "calculator-history";
  const isFileSearchPanelOpen = activePanel === "file-search";
  const isDictionaryPanelOpen = activePanel === "dictionary";

  return (
    <div className="relative h-full w-full bg-background">
      <Command
        shouldFilter={false}
        value={commandSearch}
        onValueChange={setCommandSearch}
        className="h-full w-full overflow-hidden bg-transparent"
      >
        {!isEmojiPanelOpen && !isFileSearchPanelOpen && !isDictionaryPanelOpen && (
          <CommandInput
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
        ) : (
        <CommandList
          className={cn(
            "flex-1 px-1 transition-all duration-300",
            isEmojiPanelOpen ? "min-h-0 flex flex-col h-full" : "max-h-none overflow-y-auto"
          )}
        >
          {activePanel === "commands" && (
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
              <SearchCommandGroup />
            </div>
          )}

          {isClipboardPanelOpen && (
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
          )}

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

        {!isEmojiPanelOpen && !isFileSearchPanelOpen && !isDictionaryPanelOpen && (
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
