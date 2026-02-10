import { Search } from "lucide-react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { launcherItems } from "@/lib/launcher-items";

export default function LauncherCommand() {
  return (
    <Command className="h-full w-full overflow-hidden rounded-none border border-zinc-700/90 bg-zinc-900 text-zinc-100 shadow-none [&_[data-slot=command-input-wrapper]]:border-zinc-700/80 [&_[data-slot=command-group]_[cmdk-group-heading]]:text-zinc-400 [&_[data-slot=command-item][data-selected=true]]:bg-zinc-800/90">
      <CommandInput
        placeholder="search beam..."
        className="text-lg placeholder:text-zinc-500"
      />

      <CommandList className="flex-1 max-h-none overflow-y-auto px-1 pb-1">
        <CommandEmpty>no results found.</CommandEmpty>
        <CommandGroup heading="results">
          {launcherItems.map((item) => (
            <CommandItem key={item.id} value={item.title} className="rounded-md px-3 py-3.5">
              <item.icon className="size-4 text-zinc-300" />
              <div className="min-w-0">
                <p className="truncate text-[1.08rem] leading-tight text-zinc-100">{item.title}</p>
                <p className="truncate text-base leading-tight text-zinc-400">{item.subtitle}</p>
              </div>
              <CommandShortcut className="normal-case tracking-normal text-zinc-400">
                {item.type}
              </CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
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
