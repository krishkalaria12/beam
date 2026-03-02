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
          <label className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/45">
            Snippet Content
          </label>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-white/[0.03] ring-1 ring-white/[0.06]">
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
                "min-h-0 flex-1 resize-none bg-transparent p-4 text-[14px] leading-6 text-white/90 placeholder:text-white/30",
                "focus:outline-none",
              )}
            />

            <div className="flex items-center gap-1 border-t border-white/[0.06] px-2 py-1.5">
              {DECORATION_BUTTONS.map(({ key, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  className="flex size-7 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/70"
                  aria-label={key}
                >
                  <Icon className="size-3.5" />
                </button>
              ))}
            </div>
          </div>

          <p className="mt-2 text-[11px] text-white/35">
            Include dynamic placeholders for context values like date and copied text.
          </p>
        </div>

        {/* Right: Settings */}
        <div className="scrollbar-hidden-until-hover min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="grid gap-4">
            {/* Name */}
            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.08em] text-white/45">
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
                  "h-10 w-full rounded-xl bg-white/[0.04] px-3 text-[13px] text-white/90 placeholder:text-white/30",
                  "ring-1 ring-white/[0.06] transition-all duration-200",
                  "focus:outline-none focus:ring-[var(--solid-accent,#4ea2ff)]",
                )}
              />
            </div>

            {/* Keyword */}
            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.08em] text-white/45">
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
                  "h-10 w-full rounded-xl bg-white/[0.04] px-3 font-mono text-[13px] text-white/90 placeholder:text-white/30",
                  "ring-1 ring-white/[0.06] transition-all duration-200",
                  "focus:outline-none focus:ring-[var(--solid-accent,#4ea2ff)]",
                )}
              />
            </div>

            {/* Tags */}
            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.08em] text-white/45">
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
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.08em] text-white/45">
                  Content Type
                </label>
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex h-10 w-full items-center justify-between gap-2 rounded-xl bg-white/[0.04] px-3 text-[13px] font-medium text-white/70 ring-1 ring-white/[0.06] transition-all hover:bg-white/[0.06] hover:text-white/90">
                    <div className="flex items-center gap-2">
                      <currentContentType.icon className="size-3.5 text-white/40" />
                      <span>{currentContentType.label}</span>
                    </div>
                    <ChevronDown className="size-3.5 text-white/30" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="w-40 rounded-xl border border-white/[0.08] bg-[#2c2c2c] p-1.5 shadow-xl"
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
                          className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] font-medium text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white/90 focus:bg-white/[0.06] data-[state=checked]:text-white"
                        >
                          <option.icon className="size-3.5 text-white/40" />
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
                    "inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] text-[12px] font-medium transition-all duration-200",
                    "bg-white/[0.03] text-white/60 hover:bg-white/[0.06] hover:text-white/80",
                  )}
                >
                  <Sparkles className="size-3.5" />
                  Placeholders
                </button>
              </div>
            </div>

            {/* Behavior Section */}
            <div className="rounded-xl bg-white/[0.02] p-4 ring-1 ring-white/[0.04]">
              <div className="mb-3 flex items-center gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/45">
                  Behavior
                </span>
                <div className="h-px flex-1 bg-white/[0.06]" />
              </div>

              <div className="space-y-3 text-[12px]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-white/60">Enabled</span>
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
                <div className="h-px bg-white/[0.04]" />

                <div className="flex items-center justify-between gap-3">
                  <span className="text-white/60">Case Sensitive</span>
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
                <div className="h-px bg-white/[0.04]" />

                <div className="flex items-center justify-between gap-3">
                  <span className="text-white/60">Word Boundary</span>
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
                <div className="h-px bg-white/[0.04]" />

                <div className="flex items-center justify-between gap-3">
                  <span className="text-white/60">Instant Expand</span>
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
      <div className="flex h-14 shrink-0 items-center justify-end gap-2 border-t border-white/[0.06] px-4">
        <button
          type="button"
          onClick={onCancel}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.08] px-4 text-[12px] font-medium transition-all duration-200",
            "bg-white/[0.03] text-white/60 hover:bg-white/[0.06] hover:text-white/80",
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
            "bg-[var(--solid-accent,#4ea2ff)]/20 text-[var(--solid-accent,#4ea2ff)] hover:bg-[var(--solid-accent,#4ea2ff)]/30",
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
