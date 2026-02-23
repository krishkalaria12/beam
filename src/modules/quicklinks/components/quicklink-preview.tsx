import { CommandGroup, CommandItem, CommandShortcut } from "@/components/ui/command";
import { Link2 } from "lucide-react";
import type { Quicklink } from "@/modules/quicklinks/types";
import { findQuicklinkByKeyword, isFileQuicklinkTarget } from "@/modules/quicklinks/api/quicklinks";
import { QuicklinkIcon } from "@/modules/quicklinks/components/quicklink-icon";

interface QuicklinkPreviewProps {
  quicklinks: Quicklink[];
  keyword: string;
  query: string;
  onExecute: (keyword: string, query: string) => void;
  onFill: (value: string) => void;
}

export function QuicklinkPreview({
  quicklinks,
  keyword,
  query,
  onExecute,
  onFill,
}: QuicklinkPreviewProps) {
  const quicklink = findQuicklinkByKeyword(quicklinks, keyword);

  if (!keyword) {
    return (
      <CommandGroup heading="Available Quicklinks" forceMount>
        {quicklinks.length === 0 ? (
          <CommandItem disabled className="text-muted-foreground" forceMount>
            <Link2 className="mr-2 size-4" />
            <span>No quicklinks configured</span>
          </CommandItem>
        ) : (
          quicklinks.map((ql) => (
            <CommandItem
              key={ql.keyword}
              value={`!${ql.keyword}`}
              onSelect={() => onFill(`!${ql.keyword} `)}
              className="cursor-pointer"
              forceMount
            >
              <QuicklinkIcon
                icon={ql.icon}
                isFileTarget={isFileQuicklinkTarget(ql.url)}
                className="mr-2 size-4 rounded object-cover"
                fallbackClassName="mr-2 size-4 rounded bg-muted"
              />
              <span className="font-medium">{ql.name}</span>
              <span className="ml-2 text-muted-foreground">!{ql.keyword}</span>
              <CommandShortcut>quicklink</CommandShortcut>
            </CommandItem>
          ))
        )}
      </CommandGroup>
    );
  }

  if (!quicklink) {
    return (
      <CommandGroup heading="Quicklinks" forceMount>
        <CommandItem disabled className="text-muted-foreground" forceMount>
          <Link2 className="mr-2 size-4" />
          <span>No quicklink found for !{keyword}</span>
        </CommandItem>
      </CommandGroup>
    );
  }

  return (
    <CommandGroup heading="Quicklinks" forceMount>
      <CommandItem 
        key={quicklink.keyword}
        value={`!${quicklink.keyword} ${query}`}
        onSelect={() => onExecute(quicklink.keyword, query)}
        className="cursor-pointer"
        forceMount
      >
        <QuicklinkIcon
          icon={quicklink.icon}
          isFileTarget={isFileQuicklinkTarget(quicklink.url)}
          className="mr-2 size-4 rounded object-cover"
          fallbackClassName="mr-2 size-4 rounded bg-muted"
        />
        <span className="font-medium">{quicklink.name}</span>
        <span className="ml-2 text-muted-foreground">!{quicklink.keyword}</span>
        {query && (
          <span className="ml-2 text-xs text-muted-foreground">→ {query}</span>
        )}
        <CommandShortcut>quicklink</CommandShortcut>
      </CommandItem>
    </CommandGroup>
  );
}
