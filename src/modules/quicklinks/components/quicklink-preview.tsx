import { CommandGroup, CommandItem, CommandShortcut } from "@/components/ui/command";
import { Link2 } from "lucide-react";
import type { Quicklink } from "@/modules/quicklinks/types";
import { findQuicklinkByKeyword } from "@/modules/quicklinks/api/quicklinks";

interface QuicklinkPreviewProps {
  quicklinks: Quicklink[];
  search: string;
  onExecute: () => void;
}

export function QuicklinkPreview({ quicklinks, search, onExecute }: QuicklinkPreviewProps) {
  const keyword = search.slice(1).split(" ")[0];
  const query = search.slice(1).split(" ").slice(1).join(" ");
  const quicklink = findQuicklinkByKeyword(quicklinks, keyword);

  if (!quicklink) {
    return (
      <CommandGroup heading="Quicklinks">
        <CommandItem disabled className="text-muted-foreground">
          <Link2 className="mr-2 size-4" />
          <span>No quicklink found for !{keyword}</span>
        </CommandItem>
      </CommandGroup>
    );
  }

  return (
    <CommandGroup heading="Quicklinks">
      <CommandItem 
        key={quicklink.keyword}
        value={`!${keyword} ${query}`}
        onSelect={onExecute}
        className="cursor-pointer"
      >
        {quicklink.icon ? (
          <img src={quicklink.icon} alt="" className="mr-2 size-4 rounded object-cover" />
        ) : (
          <Link2 className="mr-2 size-4" />
        )}
        <span className="font-medium">{quicklink.name}</span>
        <span className="ml-2 text-muted-foreground">!{quicklink.keyword}</span>
        {query && (
          <span className="ml-2 text-xs text-muted-foreground">→ {query}</span>
        )}
        <CommandShortcut>Enter</CommandShortcut>
      </CommandItem>
    </CommandGroup>
  );
}
