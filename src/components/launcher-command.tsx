import { Search } from "lucide-react";
import { lazy, Suspense, useState } from "react";

import { Command, CommandInput, CommandList, CommandSeparator } from "@/components/ui/command";
import Loader from "./loader";

const ApplicationsCommandGroup = lazy(() => import("@/modules/applications/components/applications-command-group"));
const CalculatorCommandGroup = lazy(() => import("@/modules/calculator/components/calculator-command-group"));
const ClipboardCommandGroup = lazy(() => import("@/modules/clipboard/components/clipboard-command-group"));
const EmojiCommandGroup = lazy(() => import("@/modules/emoji/components/emoji-command-group"));
const SearchCommandGroup = lazy(() => import("@/modules/search/components/search-command-group"));

function ModuleLoader() {
  return (
    <div className="flex items-center justify-center py-8">
      <Loader />
    </div>
  );
}

export default function LauncherCommand() {
  const [commandSearch, setCommandSearch] = useState("");
  const [activePanel, setActivePanel] = useState<"commands" | "clipboard" | "emoji">("commands");
  const isClipboardPanelOpen = activePanel === "clipboard";
  const isEmojiPanelOpen = activePanel === "emoji";

  return (
    <Command
      shouldFilter={false}
      value={commandSearch}
      onValueChange={setCommandSearch}
      className="h-full w-full overflow-hidden rounded-none border border-zinc-700/90 bg-zinc-900 text-zinc-100 shadow-none **:data-[slot=command-input-wrapper]:border-zinc-700/80 [&_[data-slot=command-group]_[cmdk-group-heading]]:text-zinc-400 [&_[data-slot=command-item][data-selected=true]]:bg-zinc-800/90"
    >
      {!isEmojiPanelOpen && (
        <CommandInput
          placeholder="search beam..."
          className="text-lg placeholder:text-zinc-500 disabled:cursor-default disabled:opacity-70"
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
      </CommandList>

      {!isEmojiPanelOpen && (
        <>
          <CommandSeparator className="bg-zinc-700/80" />
          <div className="flex items-center justify-between px-4 py-1.5 text-xs text-zinc-400">
            <span className="inline-flex items-center gap-2">
              <Search className="size-3.5" /> beam
            </span>
            <span className="inline-flex items-center gap-2">
              <kbd className="rounded-sm border border-zinc-600 bg-zinc-800 px-1.5 py-0.5 text-[11px] text-zinc-300">
                enter
              </kbd>
              <kbd className="rounded-sm border border-zinc-600 bg-zinc-800 px-1.5 py-0.5 text-[11px] text-zinc-300">
                esc
              </kbd>
            </span>
          </div>
        </>
      )}
    </Command>
  );
}
