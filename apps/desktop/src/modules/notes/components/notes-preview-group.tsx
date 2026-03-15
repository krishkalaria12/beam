import { Book, Pin } from "lucide-react";

import { CommandGroup, CommandItem, CommandShortcut } from "@/components/ui/command";
import { matchesCommandKeywords } from "@/modules/launcher/lib/command-query";
import { useNotesQuery } from "@/modules/notes/hooks/use-notes";

interface NotesPreviewGroupProps {
  query: string;
  onOpenNotes: () => void;
}

const NOTES_PREVIEW_KEYWORDS = [
  "note",
  "notes",
  "memo",
  "memos",
  "notepad",
  "scratchpad",
  "journal",
  "draft",
  "drafts",
] as const;

export function shouldShowNotesPreview(query: string): boolean {
  return query.trim().length === 0 || matchesCommandKeywords(query, NOTES_PREVIEW_KEYWORDS);
}

function excerptContent(content: string): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "Empty note";
  }

  return normalized.length > 56 ? `${normalized.slice(0, 56)}...` : normalized;
}

export function NotesPreviewGroup({ query, onOpenNotes }: NotesPreviewGroupProps) {
  const { data: notes = [], isLoading } = useNotesQuery();

  if (!shouldShowNotesPreview(query)) {
    return null;
  }

  if (isLoading && notes.length === 0) {
    return (
      <CommandGroup heading="Notes" forceMount>
        <CommandItem disabled forceMount className="text-muted-foreground">
          <Book className="size-4" />
          <span>Loading notes...</span>
        </CommandItem>
      </CommandGroup>
    );
  }

  const recentNotes = notes.slice(0, 2);

  return (
    <CommandGroup heading="Notes" forceMount>
      <CommandItem
        value={`open notes ${notes.length} quick notes drafts`}
        onSelect={onOpenNotes}
        className="cursor-pointer"
        forceMount
      >
        <Book className="size-4" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">Open notes</p>
          <p className="text-xs text-muted-foreground">
            {notes.length === 0
              ? "No notes yet"
              : `${notes.length} saved note${notes.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <CommandShortcut>open</CommandShortcut>
      </CommandItem>

      {notes.length === 0 ? (
        <CommandItem disabled forceMount className="text-muted-foreground">
          <Book className="size-4" />
          <span>Create your first note.</span>
        </CommandItem>
      ) : (
        recentNotes.map((note) => (
          <CommandItem
            key={note.id}
            value={`note ${note.title} ${note.content}`}
            onSelect={onOpenNotes}
            className="cursor-pointer"
            forceMount
          >
            {note.pinned ? <Pin className="size-4" /> : <Book className="size-4" />}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{note.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {excerptContent(note.content)}
              </p>
            </div>
            <CommandShortcut>{note.pinned ? "pin" : "note"}</CommandShortcut>
          </CommandItem>
        ))
      )}
    </CommandGroup>
  );
}
