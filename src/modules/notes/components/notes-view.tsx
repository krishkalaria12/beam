import { useDeferredValue, useEffect, useState } from "react";
import { ArrowLeft, Book, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { ModuleFooter } from "@/components/module";
import { Button } from "@/components/ui/button";
import { useLauncherPanelBackHandler } from "@/modules/launcher/lib/back-navigation";
import { NoteEditor } from "@/modules/notes/components/note-editor";
import { NotesList } from "@/modules/notes/components/notes-list";
import { NotePreview } from "@/modules/notes/components/note-preview";
import {
  useCreateNoteMutation,
  useDeleteNoteMutation,
  useNotesQuery,
  useUpdateNoteMutation,
} from "@/modules/notes/hooks/use-notes";
import type { Note, NoteEditorDraft } from "@/modules/notes/types";

interface NotesViewProps {
  onBack: () => void;
}

type NotesMode = "view" | "create" | "edit";

function createEmptyDraft(): NoteEditorDraft {
  return {
    title: "",
    content: "",
    pinned: false,
  };
}

function buildDraftFromNote(note: Note): NoteEditorDraft {
  return {
    title: note.title,
    content: note.content,
    pinned: note.pinned,
  };
}

function normalizeTitle(value: string): string {
  return value.trim();
}

function filterNotes(notes: Note[], searchValue: string): Note[] {
  const query = searchValue.trim().toLowerCase();
  if (!query) {
    return notes;
  }

  return notes.filter((note) => {
    const haystack = `${note.title} ${note.content}`.toLowerCase();
    return haystack.includes(query);
  });
}

export function NotesView({ onBack }: NotesViewProps) {
  const notesQuery = useNotesQuery();
  const createNoteMutation = useCreateNoteMutation();
  const updateNoteMutation = useUpdateNoteMutation();
  const deleteNoteMutation = useDeleteNoteMutation();

  const [viewMode, setViewMode] = useState<NotesMode>("view");
  const [searchValue, setSearchValue] = useState("");
  const deferredSearchValue = useDeferredValue(searchValue);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [draft, setDraft] = useState<NoteEditorDraft>(createEmptyDraft);

  const notes = notesQuery.data ?? [];
  const filteredNotes = filterNotes(notes, deferredSearchValue);
  const selectedNote = filteredNotes.find((note) => note.id === selectedNoteId) ?? null;
  const isSubmitting =
    createNoteMutation.isPending || updateNoteMutation.isPending || deleteNoteMutation.isPending;

  useEffect(() => {
    if (filteredNotes.length === 0) {
      setSelectedNoteId(null);
      return;
    }

    if (!selectedNoteId || !filteredNotes.some((note) => note.id === selectedNoteId)) {
      setSelectedNoteId(filteredNotes[0]?.id ?? null);
    }
  }, [filteredNotes, selectedNoteId]);

  useLauncherPanelBackHandler("notes", () => {
    if (viewMode === "create" || viewMode === "edit") {
      setViewMode("view");
      return true;
    }

    onBack();
    return true;
  });

  function handleCreateMode() {
    setDraft(createEmptyDraft());
    setSearchValue("");
    setViewMode("create");
  }

  function handleEditMode() {
    if (!selectedNote) {
      return;
    }

    setDraft(buildDraftFromNote(selectedNote));
    setViewMode("edit");
  }

  function handleCancelEdit() {
    setViewMode("view");
    if (selectedNote) {
      setDraft(buildDraftFromNote(selectedNote));
      return;
    }

    setDraft(createEmptyDraft());
  }

  async function handleSaveNote() {
    const title = normalizeTitle(draft.title);
    if (!title) {
      toast.error("Note title is required.");
      return;
    }

    try {
      if (viewMode === "create") {
        const created = await createNoteMutation.mutateAsync({
          title,
          content: draft.content,
          pinned: draft.pinned,
        });
        setSelectedNoteId(created.id);
        setSearchValue("");
        setViewMode("view");
        toast.success("Note created.");
        return;
      }

      if (viewMode === "edit" && selectedNoteId) {
        const updated = await updateNoteMutation.mutateAsync({
          id: selectedNoteId,
          title,
          content: draft.content,
          pinned: draft.pinned,
        });
        setSelectedNoteId(updated.id);
        setViewMode("view");
        toast.success("Note updated.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save note.");
    }
  }

  async function handleDeleteNote() {
    if (!selectedNoteId) {
      return;
    }

    try {
      await deleteNoteMutation.mutateAsync(selectedNoteId);
      setSelectedNoteId(null);
      setViewMode("view");
      toast.success("Note deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete note.");
    }
  }

  async function handleTogglePinned() {
    if (!selectedNote) {
      return;
    }

    try {
      const updated = await updateNoteMutation.mutateAsync({
        id: selectedNote.id,
        pinned: !selectedNote.pinned,
      });
      setSelectedNoteId(updated.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update note.");
    }
  }

  return (
    <div className="notes-view-enter relative flex h-full w-full flex-col overflow-hidden text-foreground">
      <header className="notes-header-enter flex h-14 shrink-0 items-center gap-3 border-b border-[var(--launcher-card-border)] px-4">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => {
            if (viewMode === "create" || viewMode === "edit") {
              handleCancelEdit();
              return;
            }

            onBack();
          }}
          className="rounded-lg border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] text-muted-foreground hover:bg-[var(--launcher-chip-bg)] hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
        </Button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Book className="size-4 text-[var(--icon-primary-fg)]" />
            <h2 className="truncate text-[14px] font-semibold tracking-[-0.02em] text-foreground">
              Notes
            </h2>
          </div>
          <p className="truncate text-[11px] text-muted-foreground">Quick notes and drafts</p>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleCreateMode}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-3 text-[12px] text-muted-foreground hover:bg-[var(--launcher-chip-bg)] hover:text-foreground"
        >
          <Plus className="size-3.5" />
          New note
        </Button>
      </header>

      <div className="notes-content-enter flex min-h-0 flex-1 overflow-hidden">
        <NotesList
          notes={filteredNotes}
          selectedNoteId={selectedNoteId}
          isLoading={notesQuery.isLoading}
          searchValue={searchValue}
          onSearchValueChange={setSearchValue}
          onSelectNote={setSelectedNoteId}
          onCreateNote={handleCreateMode}
        />

        {notesQuery.isLoading && notes.length === 0 ? (
          <section className="flex min-h-0 flex-1 items-center justify-center">
            <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading notes...
            </div>
          </section>
        ) : viewMode === "create" || viewMode === "edit" ? (
          <NoteEditor
            mode={viewMode}
            draft={draft}
            isSubmitting={isSubmitting}
            onDraftChange={setDraft}
            onCancel={handleCancelEdit}
            onSubmit={() => {
              void handleSaveNote();
            }}
          />
        ) : (
          <NotePreview
            note={selectedNote}
            isDeleting={deleteNoteMutation.isPending}
            isTogglingPinned={updateNoteMutation.isPending}
            onEdit={handleEditMode}
            onTogglePinned={() => {
              void handleTogglePinned();
            }}
            onDelete={() => {
              void handleDeleteNote();
            }}
          />
        )}
      </div>

      {viewMode === "view" ? (
        <ModuleFooter
          className="notes-footer-enter"
          leftSlot={
            <span>
              {filteredNotes.length} visible of {notes.length}
            </span>
          }
          shortcuts={[{ keys: ["Esc"], label: "Back" }]}
        />
      ) : null}
    </div>
  );
}
