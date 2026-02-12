import { Search } from "lucide-react";

import {
  Command,
  CommandInput,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import ApplicationsCommandGroup from "@/modules/applications/components/applications-command-group";
import CalculatorCommandGroup from "@/modules/calculator/components/calculator-command-group";
import SearchCommandGroup from "@/modules/search/components/search-command-group";

export default function LauncherCommand() {
  return (
    <Command
      shouldFilter={false}
      className="h-full w-full overflow-hidden rounded-none border border-zinc-700/90 bg-zinc-900 text-zinc-100 shadow-none [&_[data-slot=command-input-wrapper]]:border-zinc-700/80 [&_[data-slot=command-group]_[cmdk-group-heading]]:text-zinc-400 [&_[data-slot=command-item][data-selected=true]]:bg-zinc-800/90"
    >
      <CommandInput
        placeholder="search beam..."
        className="text-lg placeholder:text-zinc-500"
      />

      <CommandList className="flex-1 max-h-none overflow-y-auto px-1 pb-1">
        <CalculatorCommandGroup />
        <ApplicationsCommandGroup />
        <SearchCommandGroup />
      </CommandList>

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
    </Command>
  );
}
