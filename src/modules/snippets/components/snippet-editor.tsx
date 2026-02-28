import { Bold, Camera, Code2, Italic, Sparkles, Strikethrough, Underline } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SnippetTagInput } from "@/modules/snippets/components/snippet-tag-input";
import type { SnippetEditorDraft } from "@/modules/snippets/types";

interface SnippetEditorProps {
  mode: "create" | "edit";
  draft: SnippetEditorDraft;
  existingTags: string[];
  isSubmitting: boolean;
  onDraftChange: (nextDraft: SnippetEditorDraft) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

const DECORATION_BUTTONS = [
  { key: "bold", icon: Bold },
  { key: "italic", icon: Italic },
  { key: "underline", icon: Underline },
  { key: "strike", icon: Strikethrough },
] as const;

export function SnippetEditor({
  mode,
  draft,
  existingTags,
  isSubmitting,
  onDraftChange,
  onCancel,
  onSubmit,
}: SnippetEditorProps) {
  return (
    <section className="flex min-h-0 flex-1 overflow-hidden px-4 py-3">
      <div className="flex min-h-0 w-full gap-4">
        <div className="flex min-h-0 w-[47%] flex-col">
          <Label className="mb-1.5 text-xs text-muted-foreground/80">Snippet</Label>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/60 bg-background/20">
            <Textarea
              value={draft.template}
              onChange={(event) => {
                onDraftChange({
                  ...draft,
                  template: event.target.value,
                });
              }}
              placeholder="Type snippet content..."
              className="min-h-0 flex-1 resize-none border-0 bg-transparent p-3 text-[15px] leading-6"
            />

            <div className="flex items-center gap-1 border-t border-border/50 px-2 py-1.5">
              {DECORATION_BUTTONS.map(({ key, icon: Icon }) => (
                <Button
                  key={key}
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="size-6"
                  aria-label={key}
                >
                  <Icon className="size-3.5" />
                </Button>
              ))}
            </div>
          </div>

          <p className="mt-2 text-[11px] text-muted-foreground/70">
            Include dynamic placeholders for context values like date and copied text.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid gap-3">
            <div>
              <Label htmlFor="snippet-name" className="text-xs text-muted-foreground/80">
                Name & Icon
              </Label>
              <div className="mt-1.5 flex gap-2">
                <Input
                  id="snippet-name"
                  value={draft.name}
                  onChange={(event) => {
                    onDraftChange({
                      ...draft,
                      name: event.target.value,
                    });
                  }}
                  placeholder="Snippet name"
                  className="h-9"
                />

                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button type="button" variant="outline" size="icon" className="size-9" />
                    }
                  >
                    <Camera className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem>Default Icon</DropdownMenuItem>
                    <DropdownMenuItem>Document Icon</DropdownMenuItem>
                    <DropdownMenuItem>Code Icon</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div>
              <Label htmlFor="snippet-trigger" className="text-xs text-muted-foreground/80">
                Keyword
              </Label>
              <Input
                id="snippet-trigger"
                value={draft.trigger}
                onChange={(event) => {
                  onDraftChange({
                    ...draft,
                    trigger: event.target.value,
                  });
                }}
                placeholder=";keyword"
                className="mt-1.5 h-9"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground/80">Tags</Label>
              <div className="mt-1.5">
                <SnippetTagInput
                  value={draft.tags}
                  suggestions={existingTags}
                  onChange={(nextTags) => {
                    onDraftChange({
                      ...draft,
                      tags: nextTags,
                    });
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground/80">Content Type</Label>
                <Select
                  value={draft.contentType}
                  onValueChange={(nextValue) => {
                    onDraftChange({
                      ...draft,
                      contentType: nextValue as SnippetEditorDraft["contentType"],
                    });
                  }}
                >
                  <SelectTrigger className="mt-1.5 h-9 w-full">
                    <SelectValue placeholder="Content type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Text">Text</SelectItem>
                    <SelectItem value="Markdown">Markdown</SelectItem>
                    <SelectItem value="Code">Code</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button type="button" variant="outline" className="h-9 w-full">
                  <Sparkles className="size-3.5" />
                  Dynamic Placeholders
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-background/15 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground/65">
                Behavior
              </p>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground/80">Enabled</span>
                  <Switch
                    checked={draft.enabled}
                    onCheckedChange={(checked) => {
                      onDraftChange({
                        ...draft,
                        enabled: checked,
                      });
                    }}
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground/80">Case Sensitive</span>
                  <Switch
                    checked={draft.caseSensitive}
                    onCheckedChange={(checked) => {
                      onDraftChange({
                        ...draft,
                        caseSensitive: checked,
                      });
                    }}
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground/80">Word Boundary</span>
                  <Switch
                    checked={draft.wordBoundary}
                    onCheckedChange={(checked) => {
                      onDraftChange({
                        ...draft,
                        wordBoundary: checked,
                      });
                    }}
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground/80">Instant Expand</span>
                  <Switch
                    checked={draft.instantExpand}
                    onCheckedChange={(checked) => {
                      onDraftChange({
                        ...draft,
                        instantExpand: checked,
                      });
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-3 right-4 flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="pointer-events-auto h-7"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="button"
          className="pointer-events-auto h-7"
          onClick={onSubmit}
          disabled={isSubmitting}
        >
          <Code2 className="size-3.5" />
          {isSubmitting ? "Saving" : mode === "create" ? "Save Snippet" : "Update Snippet"}
        </Button>
      </div>
    </section>
  );
}
