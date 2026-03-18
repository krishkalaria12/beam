import { ArrowLeft, CircleDot, FilePlus2, Loader2, NotebookTabs } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { ModuleFooter } from "@/components/module";
import { Button } from "@/components/ui/button";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { cn } from "@/lib/utils";
import { useLauncherPanelBackHandler } from "@/modules/launcher/lib/back-navigation";
import { SnippetEditor } from "@/modules/snippets/components/snippet-editor";
import { SnippetList } from "@/modules/snippets/components/snippet-list";
import { SnippetPreview } from "@/modules/snippets/components/snippet-preview";
import {
  useCreateSnippetMutation,
  useDeleteSnippetMutation,
  usePasteSnippetMutation,
  useSetSnippetEnabledMutation,
  useSnippetsQuery,
  useUpdateSnippetMutation,
} from "@/modules/snippets/hooks/use-snippets";
import type { Snippet, SnippetEditorDraft } from "@/modules/snippets/types";

interface SnippetsViewProps {
  onBack: () => void;
}

function buildDraftFromSnippet(snippet: Snippet): SnippetEditorDraft {
  return {
    name: snippet.name,
    trigger: snippet.trigger,
    template: snippet.template,
    tags: snippet.tags,
    contentType: snippet.content_type,
    enabled: snippet.enabled,
    caseSensitive: snippet.case_sensitive,
    wordBoundary: snippet.word_boundary,
    instantExpand: snippet.instant_expand,
  };
}

function createEmptyDraft(): SnippetEditorDraft {
  return {
    name: "",
    trigger: "",
    template: "",
    tags: [],
    contentType: "Text",
    enabled: true,
    caseSensitive: false,
    wordBoundary: true,
    instantExpand: false,
  };
}

type SnippetsMode = "view" | "create" | "edit";

function normalizeText(value: string): string {
  return value.trim();
}

function matchesSearch(snippet: Snippet, normalizedQuery: string): boolean {
  if (!normalizedQuery) {
    return true;
  }

  const haystack =
    `${snippet.name} ${snippet.trigger} ${snippet.tags.join(" ")} ${snippet.template}`.toLowerCase();

  return haystack.includes(normalizedQuery);
}

function collectAvailableTags(snippets: Snippet[]): string[] {
  const seen = new Set<string>();
  const values: string[] = [];

  for (const snippet of snippets) {
    for (const tag of snippet.tags) {
      const normalized = tag.trim();
      if (!normalized) {
        continue;
      }

      const key = normalized.toLowerCase();
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      values.push(normalized);
    }
  }

  return values.toSorted((a, b) => a.localeCompare(b));
}

function filterSnippets(snippets: Snippet[], searchValue: string, selectedTag: string): Snippet[] {
  const normalizedQuery = normalizeText(searchValue).toLowerCase();
  const normalizedSelectedTag = selectedTag.trim().toLowerCase();

  return snippets.filter((snippet) => {
    if (!matchesSearch(snippet, normalizedQuery)) {
      return false;
    }

    if (normalizedSelectedTag === "all") {
      return true;
    }

    return snippet.tags.some((tag) => tag.trim().toLowerCase() === normalizedSelectedTag);
  });
}

export function SnippetsView({ onBack }: SnippetsViewProps) {
  const snippetsQuery = useSnippetsQuery();
  const createSnippetMutation = useCreateSnippetMutation();
  const updateSnippetMutation = useUpdateSnippetMutation();
  const deleteSnippetMutation = useDeleteSnippetMutation();
  const setSnippetEnabledMutation = useSetSnippetEnabledMutation();
  const pasteSnippetMutation = usePasteSnippetMutation();

  const [viewMode, setViewMode] = useState<SnippetsMode>("view");
  const [searchValue, setSearchValue] = useState("");
  const [selectedTag, setSelectedTag] = useState("all");
  const [selectedSnippetId, setSelectedSnippetId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SnippetEditorDraft>(createEmptyDraft);
  const viewModeRef = useRef<SnippetsMode>(viewMode);
  const selectedSnippetRef = useRef<Snippet | null>(null);

  const snippets = snippetsQuery.data ?? [];
  const availableTags = collectAvailableTags(snippets);
  const filteredSnippets = filterSnippets(snippets, searchValue, selectedTag);
  const resolvedSelectedSnippetId = filteredSnippets.some((snippet) => snippet.id === selectedSnippetId)
    ? selectedSnippetId
    : (filteredSnippets[0]?.id ?? null);
  const selectedSnippet =
    filteredSnippets.find((snippet) => snippet.id === resolvedSelectedSnippetId) ?? null;

  if (selectedSnippetId !== resolvedSelectedSnippetId) {
    setSelectedSnippetId(resolvedSelectedSnippetId);
  }

  viewModeRef.current = viewMode;
  selectedSnippetRef.current = selectedSnippet;

  useMountEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (viewModeRef.current !== "view") {
        return;
      }

      const isMeta = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName.toLowerCase();
        if (tag === "input" || tag === "textarea" || target.isContentEditable) {
          return;
        }
      }

      if (isMeta && key === "n") {
        event.preventDefault();
        setDraft(createEmptyDraft());
        setViewMode("create");
        return;
      }

      if (isMeta && key === "e" && selectedSnippetRef.current) {
        event.preventDefault();
        setDraft(buildDraftFromSnippet(selectedSnippetRef.current));
        setViewMode("edit");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  });

  useLauncherPanelBackHandler("snippets", () => {
    if (viewMode === "create" || viewMode === "edit") {
      setViewMode("view");
      return true;
    }

    onBack();
    return true;
  });

  async function handleSaveSnippet() {
    const name = normalizeText(draft.name);
    const trigger = normalizeText(draft.trigger);
    const template = normalizeText(draft.template);

    if (!name || !trigger || !template) {
      toast.error("Name, keyword, and snippet content are required.");
      return;
    }

    const normalizedTags = draft.tags.map((tag) => tag.trim()).filter(Boolean);

    try {
      if (viewMode === "create") {
        const created = await createSnippetMutation.mutateAsync({
          name,
          trigger,
          template,
          tags: normalizedTags,
          contentType: draft.contentType,
          enabled: draft.enabled,
          caseSensitive: draft.caseSensitive,
          wordBoundary: draft.wordBoundary,
          instantExpand: draft.instantExpand,
        });

        setSelectedSnippetId(created.id);
        setViewMode("view");
        toast.success("Snippet created.");
        return;
      }

      if (viewMode === "edit" && resolvedSelectedSnippetId) {
        const updated = await updateSnippetMutation.mutateAsync({
          id: resolvedSelectedSnippetId,
          name,
          trigger,
          template,
          tags: normalizedTags,
          contentType: draft.contentType,
          enabled: draft.enabled,
          caseSensitive: draft.caseSensitive,
          wordBoundary: draft.wordBoundary,
          instantExpand: draft.instantExpand,
        });

        setSelectedSnippetId(updated.id);
        setViewMode("view");
        toast.success("Snippet updated.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save snippet.");
    }
  }

  async function handleDeleteSnippet() {
    if (!resolvedSelectedSnippetId) {
      return;
    }

    try {
      await deleteSnippetMutation.mutateAsync(resolvedSelectedSnippetId);
      toast.success("Snippet deleted.");
      setSelectedSnippetId(null);
      setViewMode("view");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete snippet.");
    }
  }

  async function handleToggleEnabled() {
    if (!selectedSnippet) {
      return;
    }

    try {
      await setSnippetEnabledMutation.mutateAsync({
        id: selectedSnippet.id,
        enabled: !selectedSnippet.enabled,
      });
      toast.success(selectedSnippet.enabled ? "Snippet disabled." : "Snippet enabled.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update snippet status.");
    }
  }

  async function handlePasteSnippet() {
    if (!selectedSnippet) {
      return;
    }

    try {
      await pasteSnippetMutation.mutateAsync(selectedSnippet.id);
      toast.success("Snippet pasted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to paste snippet.");
    }
  }

  function openCreateView() {
    setDraft(createEmptyDraft());
    setViewMode("create");
  }

  function openEditView() {
    if (!selectedSnippet) {
      return;
    }

    setDraft(buildDraftFromSnippet(selectedSnippet));
    setViewMode("edit");
  }

  const isBusy =
    createSnippetMutation.isPending ||
    updateSnippetMutation.isPending ||
    deleteSnippetMutation.isPending;

  return (
    <div className="snippets-view-enter relative flex h-full w-full flex-col overflow-hidden text-foreground">
      {/* Header */}
      <header className="snippets-header-enter flex h-14 shrink-0 items-center gap-3 border-b border-[var(--launcher-card-border)] px-4">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => {
            if (viewMode === "create" || viewMode === "edit") {
              setViewMode("view");
              return;
            }
            onBack();
          }}
          className="flex size-9 items-center justify-center rounded-lg bg-[var(--launcher-card-bg)] text-muted-foreground transition-all duration-200 hover:bg-[var(--launcher-chip-bg)] hover:text-muted-foreground"
          aria-label="Back"
        >
          <ArrowLeft className="size-4" />
        </Button>

        <div className="flex flex-1 items-center gap-3">
          <div className="size-8 rounded-xl bg-[var(--launcher-card-bg)] p-1.5">
            <NotebookTabs className="size-full text-[var(--icon-orange-fg)]" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-[14px] font-semibold tracking-[-0.02em] text-foreground">
              Snippets
            </h1>
            <p className="text-[12px] tracking-[-0.01em] text-muted-foreground">
              Create, preview, and paste text snippets
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {snippetsQuery.isFetching && (
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          )}
          <span className="rounded-full bg-[var(--launcher-chip-bg)] px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            {snippets.length} {snippets.length === 1 ? "snippet" : "snippets"}
          </span>
        </div>
      </header>

      {viewMode === "create" || viewMode === "edit" ? (
        <SnippetEditor
          mode={viewMode}
          draft={draft}
          existingTags={availableTags}
          isSubmitting={isBusy}
          onDraftChange={setDraft}
          onCancel={() => {
            setViewMode("view");
          }}
          onSubmit={() => {
            void handleSaveSnippet();
          }}
        />
      ) : (
        <div className="snippets-content-enter flex min-h-0 flex-1 overflow-hidden">
          <SnippetList
            snippets={filteredSnippets}
            selectedSnippetId={resolvedSelectedSnippetId}
            isLoading={snippetsQuery.isLoading}
            searchValue={searchValue}
            selectedTag={selectedTag}
            tags={availableTags}
            onSearchValueChange={setSearchValue}
            onSelectSnippet={setSelectedSnippetId}
            onSelectedTagChange={setSelectedTag}
          />
          <SnippetPreview
            snippet={selectedSnippet}
            isCopying={pasteSnippetMutation.isPending}
            isTogglingEnabled={setSnippetEnabledMutation.isPending}
            isDeleting={deleteSnippetMutation.isPending}
            onEdit={openEditView}
            onCopyAndCount={() => {
              void handlePasteSnippet();
            }}
            onToggleEnabled={() => {
              void handleToggleEnabled();
            }}
            onDelete={() => {
              void handleDeleteSnippet();
            }}
          />
        </div>
      )}

      {viewMode === "view" && (
        <ModuleFooter
          className="snippets-footer-enter border-[var(--footer-border)]"
          leftSlot={
            <>
              <CircleDot className="size-3.5" />
              <span>{filteredSnippets.length} visible</span>
            </>
          }
          shortcuts={[
            { keys: ["Ctrl+N"], label: "New" },
            { keys: ["Ctrl+E"], label: "Edit" },
          ]}
          actions={
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={openCreateView}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12px] font-medium transition-all duration-200",
                  "bg-[var(--ring)]/20 text-[var(--ring)] hover:bg-[var(--ring)]/30",
                )}
              >
                <FilePlus2 className="size-3.5" />
                New
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  void handlePasteSnippet();
                }}
                disabled={!selectedSnippet || pasteSnippetMutation.isPending}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--launcher-card-border)] px-3 text-[12px] font-medium transition-all duration-200",
                  "bg-[var(--launcher-card-bg)] text-muted-foreground hover:bg-[var(--launcher-chip-bg)] hover:text-muted-foreground",
                  "disabled:opacity-40 disabled:pointer-events-none",
                )}
              >
                <NotebookTabs className="size-3.5" />
                Paste
              </Button>
            </>
          }
        />
      )}
    </div>
  );
}
