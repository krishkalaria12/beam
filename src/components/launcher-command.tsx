import { Search } from "lucide-react";
import { lazy, Suspense, useState } from "react";

import { Command, CommandInput, CommandList, CommandSeparator } from "@/components/ui/command";
import Loader from "./loader";

const ApplicationsCommandGroup = lazy(() => import("@/modules/applications/components/applications-command-group"));
const CalculatorCommandGroup = lazy(() => import("@/modules/calculator/components/calculator-command-group"));
const ClipboardCommandGroup = lazy(() => import("@/modules/clipboard/components/clipboard-command-group"));
const EmojiCommandGroup = lazy(() => import("@/modules/emoji/components/emoji-command-group"));
const SearchCommandGroup = lazy(() => import("@/modules/search/components/search-command-group"));
const SettingsCommandGroup = lazy(() => import("@/modules/settings/components/settings-command-group"));

function ModuleLoader() {
  return (
    <div className="flex items-center justify-center py-8">
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
    <Command
      shouldFilter={false}
      value={commandSearch}
      onValueChange={setCommandSearch}
      className="h-full w-full overflow-hidden rounded-none border-border/40 bg-background text-foreground shadow-none backdrop-blur-[32px] **:data-[slot=command-input-wrapper]:border-border/50 [&_[data-slot=command-group]_[cmdk-group-heading]]:text-muted-foreground [&_[data-slot=command-item][data-selected=true]]:bg-foreground/10"
    >
      {!isEmojiPanelOpen && (
        <CommandInput
          placeholder="search beam..."
          className="text-lg placeholder:text-muted-foreground/50 disabled:cursor-default disabled:opacity-70"
        />
      )}

      <CommandList
        className={
          isEmojiPanelOpen
            ? "flex flex-1 min-h-0 flex-col h-full"
            : "flex-1 max-h-none overflow-y-auto px-1 pb-1"
        }
      >
        {activePanel === "commands" && (
          <>
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

            <Suspense fallback={<ModuleLoader />}>
              <CalculatorCommandGroup />
            </Suspense>
            <Suspense fallback={<ModuleLoader />}>
              <ApplicationsCommandGroup />
            </Suspense>
            <Suspense fallback={<ModuleLoader />}>
              <SearchCommandGroup />
            </Suspense>
          </>
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
        <>
          <CommandSeparator className="bg-border/80" />
          <div className="flex items-center justify-between px-4 py-1.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Search className="size-3.5" /> beam
            </span>
            <span className="inline-flex items-center gap-2">
              <kbd className="rounded-sm border border-border bg-muted px-1.5 py-0.5 text-[11px] text-foreground/80">
                enter
              </kbd>
              <kbd className="rounded-sm border border-border bg-muted px-1.5 py-0.5 text-[11px] text-foreground/80">
                esc
              </kbd>
            </span>
          </div>
        </>
      )}
    </Command>
  );
}
