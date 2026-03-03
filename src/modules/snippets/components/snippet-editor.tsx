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
import { Switch } from "@/components/ui/switch";
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
          <label className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/45">
            Snippet Content
          </label>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-[var(--launcher-card-bg)] ring-1 ring-[var(--launcher-card-border)]">
            <textarea
              value={draft.template}
              onChange={(event) => {
                onDraftChange({
                  ...draft,
                  template: event.target.value,
                });
              }}
              placeholder="Type snippet content..."
              className={cn(
                "min-h-0 flex-1 resize-none bg-transparent p-4 text-[14px] leading-6 text-foreground/90 placeholder:text-foreground/30",
                "focus:outline-none",
              )}
            />

            <div className="flex items-center gap-1 border-t border-[var(--launcher-card-border)] px-2 py-1.5">
              {DECORATION_BUTTONS.map(({ key, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  className="flex size-7 items-center justify-center rounded-lg text-foreground/40 transition-colors hover:bg-[var(--launcher-chip-bg)] hover:text-foreground/70"
                  aria-label={key}
                >
                  <Icon className="size-3.5" />
                </button>
              ))}
            </div>
          </div>

          <p className="mt-2 text-[11px] text-foreground/35">
            Include dynamic placeholders for context values like date and copied text.
          </p>
        </div>

        {/* Right: Settings */}
        <div className="scrollbar-hidden-until-hover min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="grid gap-4">
            {/* Name */}
            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/45">
                Name
              </label>
              <input
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
                  "h-10 w-full rounded-xl bg-[var(--launcher-card-hover-bg)] px-3 text-[13px] text-foreground/90 placeholder:text-foreground/30",
                  "ring-1 ring-[var(--launcher-card-border)] transition-all duration-200",
                  "focus:outline-none focus:ring-[var(--ring)]",
                )}
              />
            </div>

            {/* Keyword */}
            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/45">
                Keyword
              </label>
              <input
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
                  "h-10 w-full rounded-xl bg-[var(--launcher-card-hover-bg)] px-3 font-mono text-[13px] text-foreground/90 placeholder:text-foreground/30",
                  "ring-1 ring-[var(--launcher-card-border)] transition-all duration-200",
                  "focus:outline-none focus:ring-[var(--ring)]",
                )}
              />
            </div>

            {/* Tags */}
            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/45">
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
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/45">
                  Content Type
                </label>
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex h-10 w-full items-center justify-between gap-2 rounded-xl bg-[var(--launcher-card-hover-bg)] px-3 text-[13px] font-medium text-foreground/70 ring-1 ring-[var(--launcher-card-border)] transition-all hover:bg-[var(--launcher-chip-bg)] hover:text-foreground/90">
                    <div className="flex items-center gap-2">
                      <currentContentType.icon className="size-3.5 text-foreground/40" />
                      <span>{currentContentType.label}</span>
                    </div>
                    <ChevronDown className="size-3.5 text-foreground/30" />
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
                          className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] font-medium text-foreground/70 transition-colors hover:bg-[var(--launcher-chip-bg)] hover:text-foreground/90 focus:bg-[var(--launcher-chip-bg)] data-[state=checked]:text-foreground"
                        >
                          <option.icon className="size-3.5 text-foreground/40" />
                          {option.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  className={cn(
                    "inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[var(--launcher-card-border)] text-[12px] font-medium transition-all duration-200",
                    "bg-[var(--launcher-card-bg)] text-foreground/60 hover:bg-[var(--launcher-chip-bg)] hover:text-foreground/80",
                  )}
                >
                  <Sparkles className="size-3.5" />
                  Placeholders
                </button>
              </div>
            </div>

            {/* Behavior Section */}
            <div className="rounded-xl bg-[var(--launcher-card-bg)] p-4 ring-1 ring-[var(--launcher-card-border)]">
              <div className="mb-3 flex items-center gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/45">
                  Behavior
                </span>
                <div className="h-px flex-1 bg-[var(--launcher-chip-bg)]" />
              </div>

              <div className="space-y-3 text-[12px]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-foreground/60">Enabled</span>
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
                  <span className="text-foreground/60">Case Sensitive</span>
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
                  <span className="text-foreground/60">Word Boundary</span>
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
                  <span className="text-foreground/60">Instant Expand</span>
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
        <button
          type="button"
          onClick={onCancel}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--launcher-card-border)] px-4 text-[12px] font-medium transition-all duration-200",
            "bg-[var(--launcher-card-bg)] text-foreground/60 hover:bg-[var(--launcher-chip-bg)] hover:text-foreground/80",
          )}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-lg px-4 text-[12px] font-medium transition-all duration-200",
            "bg-[var(--ring)]/20 text-[var(--ring)] hover:bg-[var(--ring)]/30",
            "disabled:opacity-50 disabled:pointer-events-none",
          )}
        >
          <Code2 className="size-3.5" />
          {isSubmitting ? "Saving..." : mode === "create" ? "Save Snippet" : "Update Snippet"}
        </button>
      </div>
    </section>
  );
}
