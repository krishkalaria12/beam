import {
  Bold,
  ChevronDown,
  Code2,
  FileText,
  Italic,
  Sparkles,
  Strikethrough,
  Underline,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
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

const CONTENT_TYPE_OPTIONS = [
  { value: "Text", label: "Text", icon: FileText },
  { value: "Markdown", label: "Markdown", icon: FileText },
  { value: "Code", label: "Code", icon: Code2 },
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
  const currentContentType =
    CONTENT_TYPE_OPTIONS.find((opt) => opt.value === draft.contentType) ?? CONTENT_TYPE_OPTIONS[0];

  return (
    <section className="snippet-editor-enter relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden p-4">
        {/* Left: Snippet Content Editor */}
        <div className="flex min-h-0 w-[47%] flex-col">
          <label className="mb-2 text-launcher-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Snippet Content
          </label>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-[var(--launcher-card-bg)] ring-1 ring-[var(--launcher-card-border)]">
            <Textarea
              value={draft.template}
              onChange={(event) => {
                onDraftChange({
                  ...draft,
                  template: event.target.value,
                });
              }}
              placeholder="Type snippet content..."
              className={cn(
                "min-h-0 flex-1 resize-none bg-transparent p-4 text-launcher-lg leading-6 text-foreground placeholder:text-muted-foreground",
                "focus:outline-none",
              )}
            />

            <div className="flex items-center gap-1 border-t border-[var(--launcher-card-border)] px-2 py-1.5">
              {DECORATION_BUTTONS.map(({ key, icon: Icon }) => (
                <Button
                  key={key}
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[var(--launcher-chip-bg)] hover:text-muted-foreground"
                  aria-label={key}
                >
                  <Icon className="size-3.5" />
                </Button>
              ))}
            </div>
          </div>

          <p className="mt-2 text-launcher-xs text-muted-foreground">
            Include dynamic placeholders for context values like date and copied text.
          </p>
        </div>

        {/* Right: Settings */}
        <div className="scrollbar-hidden-until-hover min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="grid gap-4">
            {/* Name */}
            <div>
              <label className="mb-2 block text-launcher-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Name
              </label>
              <Input
                type="text"
                value={draft.name}
                onChange={(event) => {
                  onDraftChange({
                    ...draft,
                    name: event.target.value,
                  });
                }}
                placeholder="Snippet name"
                className={cn(
                  "h-10 w-full rounded-xl bg-[var(--launcher-card-hover-bg)] px-3 text-launcher-md text-foreground placeholder:text-muted-foreground",
                  "ring-1 ring-[var(--launcher-card-border)] transition-all duration-200",
                  "focus:outline-none focus:ring-[var(--ring)]",
                )}
              />
            </div>

            {/* Keyword */}
            <div>
              <label className="mb-2 block text-launcher-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Keyword
              </label>
              <Input
                type="text"
                value={draft.trigger}
                onChange={(event) => {
                  onDraftChange({
                    ...draft,
                    trigger: event.target.value,
                  });
                }}
                placeholder=";keyword"
                className={cn(
                  "h-10 w-full rounded-xl bg-[var(--launcher-card-hover-bg)] px-3 font-mono text-launcher-md text-foreground placeholder:text-muted-foreground",
                  "ring-1 ring-[var(--launcher-card-border)] transition-all duration-200",
                  "focus:outline-none focus:ring-[var(--ring)]",
                )}
              />
            </div>

            {/* Tags */}
            <div>
              <label className="mb-2 block text-launcher-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Tags
              </label>
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

            {/* Content Type & Placeholders */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-2 block text-launcher-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Content Type
                </label>
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex h-10 w-full items-center justify-between gap-2 rounded-xl bg-[var(--launcher-card-hover-bg)] px-3 text-launcher-md font-medium text-muted-foreground ring-1 ring-[var(--launcher-card-border)] transition-all hover:bg-[var(--launcher-chip-bg)] hover:text-foreground">
                    <div className="flex items-center gap-2">
                      <currentContentType.icon className="size-3.5 text-muted-foreground" />
                      <span>{currentContentType.label}</span>
                    </div>
                    <ChevronDown className="size-3.5 text-muted-foreground" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="w-40 rounded-xl border border-[var(--launcher-card-border)] bg-[var(--popover)] p-1.5 shadow-xl"
                  >
                    <DropdownMenuRadioGroup
                      value={draft.contentType}
                      onValueChange={(value) => {
                        onDraftChange({
                          ...draft,
                          contentType: value as SnippetEditorDraft["contentType"],
                        });
                      }}
                    >
                      {CONTENT_TYPE_OPTIONS.map((option) => (
                        <DropdownMenuRadioItem
                          key={option.value}
                          value={option.value}
                          className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-launcher-sm font-medium text-muted-foreground transition-colors hover:bg-[var(--launcher-chip-bg)] hover:text-foreground focus:bg-[var(--launcher-chip-bg)] data-[state=checked]:text-foreground"
                        >
                          <option.icon className="size-3.5 text-muted-foreground" />
                          {option.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[var(--launcher-card-border)] text-launcher-sm font-medium transition-all duration-200",
                    "bg-[var(--launcher-card-bg)] text-muted-foreground hover:bg-[var(--launcher-chip-bg)] hover:text-muted-foreground",
                  )}
                >
                  <Sparkles className="size-3.5" />
                  Placeholders
                </Button>
              </div>
            </div>

            {/* Behavior Section */}
            <div className="rounded-xl bg-[var(--launcher-card-bg)] p-4 ring-1 ring-[var(--launcher-card-border)]">
              <div className="mb-3 flex items-center gap-3">
                <span className="text-launcher-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Behavior
                </span>
                <div className="h-px flex-1 bg-[var(--launcher-chip-bg)]" />
              </div>

              <div className="space-y-3 text-launcher-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Enabled</span>
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
                <div className="h-px bg-[var(--launcher-card-hover-bg)]" />

                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Case Sensitive</span>
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
                <div className="h-px bg-[var(--launcher-card-hover-bg)]" />

                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Word Boundary</span>
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
                <div className="h-px bg-[var(--launcher-card-hover-bg)]" />

                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Instant Expand</span>
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

      {/* Footer Actions */}
      <div className="flex h-14 shrink-0 items-center justify-end gap-2 border-t border-[var(--launcher-card-border)] px-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--launcher-card-border)] px-4 text-launcher-sm font-medium transition-all duration-200",
            "bg-[var(--launcher-card-bg)] text-muted-foreground hover:bg-[var(--launcher-chip-bg)] hover:text-muted-foreground",
          )}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onSubmit}
          disabled={isSubmitting}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-lg px-4 text-launcher-sm font-medium transition-all duration-200",
            "bg-[var(--ring)]/20 text-[var(--ring)] hover:bg-[var(--ring)]/30",
            "disabled:opacity-50 disabled:pointer-events-none",
          )}
        >
          <Code2 className="size-3.5" />
          {isSubmitting ? "Saving..." : mode === "create" ? "Save Snippet" : "Update Snippet"}
        </Button>
      </div>
    </section>
  );
}
