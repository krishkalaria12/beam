import { CircleDot, FilePlus2, Loader2, NotebookTabs } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { CommandFooterBar } from "@/components/command/command-footer-bar";
import { CommandKeyHint } from "@/components/command/command-key-hint";
import {
  CommandPanelBackButton,
  CommandPanelHeader,
  CommandPanelTitleBlock,
} from "@/components/command/command-panel-header";
import { CommandStatusChip } from "@/components/command/command-status-chip";
import { Button } from "@/components/ui/button";
import { useLauncherPanelBackHandler } from "@/modules/launcher/lib/back-navigation";
import { SnippetEditor } from "@/modules/snippets/components/snippet-editor";
import { SnippetList } from "@/modules/snippets/components/snippet-list";
import { SnippetPreview } from "@/modules/snippets/components/snippet-preview";
import {
  useCreateSnippetMutation,
  useDeleteSnippetMutation,
  useIncrementSnippetCopiedCountMutation,
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
    instantExpand: false,
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
  const incrementCopiedCountMutation = useIncrementSnippetCopiedCountMutation();

  const [viewMode, setViewMode] = useState<SnippetsMode>("view");
  const [searchValue, setSearchValue] = useState("");
  const [selectedTag, setSelectedTag] = useState("all");
  const [selectedSnippetId, setSelectedSnippetId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SnippetEditorDraft>(createEmptyDraft);

  const snippets = snippetsQuery.data ?? [];
  const availableTags = collectAvailableTags(snippets);
  const filteredSnippets = filterSnippets(snippets, searchValue, selectedTag);
  const selectedSnippet =
    filteredSnippets.find((snippet) => snippet.id === selectedSnippetId) ?? null;

  useEffect(() => {
    if (filteredSnippets.length === 0) {
      setSelectedSnippetId(null);
      return;
    }

    if (
      !selectedSnippetId ||
      !filteredSnippets.some((snippet) => snippet.id === selectedSnippetId)
    ) {
      setSelectedSnippetId(filteredSnippets[0]?.id ?? null);
    }
  }, [filteredSnippets, selectedSnippetId]);

  useEffect(() => {
    if (viewMode !== "view") {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
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

      if (isMeta && key === "e" && selectedSnippet) {
        event.preventDefault();
        setDraft(buildDraftFromSnippet(selectedSnippet));
        setViewMode("edit");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedSnippet, viewMode]);

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

      if (viewMode === "edit" && selectedSnippetId) {
        const updated = await updateSnippetMutation.mutateAsync({
          id: selectedSnippetId,
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
    if (!selectedSnippetId) {
      return;
    }

    try {
      await deleteSnippetMutation.mutateAsync(selectedSnippetId);
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

  async function handleCopyAndCount() {
    if (!selectedSnippet) {
      return;
    }

    try {
      await navigator.clipboard.writeText(selectedSnippet.template);
      await incrementCopiedCountMutation.mutateAsync(selectedSnippet.id);
      toast.success("Snippet copied.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to copy snippet.");
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
    <div className="glass-effect relative flex h-full w-full flex-col overflow-hidden text-foreground">
      <CommandPanelHeader>
        <CommandPanelBackButton
          onClick={() => {
            if (viewMode === "create" || viewMode === "edit") {
              setViewMode("view");
              return;
            }
            onBack();
          }}
          aria-label="Back"
        />
        <CommandPanelTitleBlock
          title="Snippets"
          subtitle="Create, preview, and paste text snippets"
          className="flex-1"
        />
        <CommandStatusChip
          tone="neutral"
          label={snippets.length > 0 ? `${snippets.length} snippets` : "No snippets"}
        />
      </CommandPanelHeader>

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
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <SnippetList
            snippets={filteredSnippets}
            selectedSnippetId={selectedSnippetId}
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
            isCopying={incrementCopiedCountMutation.isPending}
            isTogglingEnabled={setSnippetEnabledMutation.isPending}
            isDeleting={deleteSnippetMutation.isPending}
            onEdit={openEditView}
            onCopyAndCount={() => {
              void handleCopyAndCount();
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

      {viewMode === "view" ? (
        <CommandFooterBar
          leftSlot={
            <div className="inline-flex items-center gap-2">
              {snippetsQuery.isFetching ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <CircleDot className="size-3.5" />
              )}
              <span>{filteredSnippets.length} visible</span>
            </div>
          }
          rightSlot={
            <>
              <CommandKeyHint keyLabel="CMD/CTRL + N" label="New Snippet" />
              <CommandKeyHint keyLabel="CMD/CTRL + E" label="Edit" />
              <Button type="button" size="sm" onClick={openCreateView} className="h-7 px-2.5">
                <FilePlus2 className="size-3.5" />
                New
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 px-2.5"
                onClick={() => {
                  void handleCopyAndCount();
                }}
                disabled={!selectedSnippet || incrementCopiedCountMutation.isPending}
              >
                <NotebookTabs className="size-3.5" />
                Paste
              </Button>
            </>
          }
        />
      ) : null}
    </div>
  );
}
