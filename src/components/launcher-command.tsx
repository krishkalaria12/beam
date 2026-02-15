import { Search, Command as CommandIcon, Keyboard } from "lucide-react";
import { lazy, Suspense, useState } from "react";

import { Command, CommandInput, CommandList, CommandSeparator } from "@/components/ui/command";
import Loader from "./loader";
import { cn } from "@/lib/utils";

const ApplicationsCommandGroup = lazy(() => import("@/modules/applications/components/applications-command-group"));
const CalculatorCommandGroup = lazy(() => import("@/modules/calculator/components/calculator-command-group"));
const ClipboardCommandGroup = lazy(() => import("@/modules/clipboard/components/clipboard-command-group"));
const EmojiCommandGroup = lazy(() => import("@/modules/emoji/components/emoji-command-group"));
const SearchCommandGroup = lazy(() => import("@/modules/search/components/search-command-group"));
const SettingsCommandGroup = lazy(() => import("@/modules/settings/components/settings-command-group"));

function ModuleLoader() {
  return (
    <div className="flex items-center justify-center py-4">
      <Loader />
    </div>
  );
}

export default function LauncherCommand() {
  const [commandSearch, setCommandSearch] = useState("");
  const [activePanel, setActivePanel] = useState<"commands" | "clipboard" | "emoji" | "settings">("commands");
  const isClipboardPanelOpen = activePanel === "clipboard";
  const isEmojiPanelOpen = activePanel === "emoji";
  const isSettingsPanelOpen = activePanel === "settings";

  return (
    <div className="relative h-full w-full bg-background">
      <Command
        shouldFilter={false}
        value={commandSearch}
        onValueChange={setCommandSearch}
        className="h-full w-full overflow-hidden bg-transparent"
      >
        {!isEmojiPanelOpen && (
          <CommandInput
            placeholder="Search Beam..."
            className="border-none"
          />
        )}

        <CommandList
          className={cn(
            "flex-1 px-1 transition-all duration-300",
            isEmojiPanelOpen ? "min-h-0 flex flex-col h-full" : "max-h-none overflow-y-auto"
          )}
        >
          {activePanel === "commands" && (
            <div className="py-1">
              <Suspense fallback={<ModuleLoader />}>
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
              </Suspense>
              <Suspense fallback={<ModuleLoader />}>
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
              </Suspense>
              <Suspense fallback={<ModuleLoader />}>
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
              </Suspense>

              <CommandSeparator className="my-1 opacity-50" />

              <Suspense fallback={<ModuleLoader />}>
                <CalculatorCommandGroup />
              </Suspense>
              <Suspense fallback={<ModuleLoader />}>
                <ApplicationsCommandGroup />
              </Suspense>
              <Suspense fallback={<ModuleLoader />}>
                <SearchCommandGroup />
              </Suspense>
            </div>
          )}

          {isClipboardPanelOpen && (
            <Suspense fallback={<ModuleLoader />}>
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
            </Suspense>
          )}

          {isEmojiPanelOpen && (
            <Suspense fallback={<ModuleLoader />}>
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
            </Suspense>
          )}

          {isSettingsPanelOpen && (
            <Suspense fallback={<ModuleLoader />}>
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
            </Suspense>
          )}
        </CommandList>

        {!isEmojiPanelOpen && (
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
