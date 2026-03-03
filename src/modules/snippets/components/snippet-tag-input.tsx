import { Check, Plus, X } from "lucide-react";
import { useState, type KeyboardEvent } from "react";

import { cn } from "@/lib/utils";

interface SnippetTagInputProps {
  value: string[];
  suggestions: string[];
  onChange: (nextTags: string[]) => void;
  className?: string;
}

function normalizeTag(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function includesTag(tags: string[], candidate: string): boolean {
  const normalizedCandidate = candidate.trim().toLowerCase();
  return tags.some((tag) => tag.trim().toLowerCase() === normalizedCandidate);
}

function buildNormalizedSuggestions(suggestions: string[], selectedTags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const suggestion of suggestions) {
    const normalized = normalizeTag(suggestion);
    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();
    if (seen.has(key) || includesTag(selectedTags, normalized)) {
      continue;
    }

    seen.add(key);
    result.push(normalized);
  }

  return result;
}

function filterSuggestions(normalizedSuggestions: string[], draftTag: string): string[] {
  const normalizedQuery = draftTag.trim().toLowerCase();
  if (!normalizedQuery) {
    return normalizedSuggestions.slice(0, 8);
  }

  return normalizedSuggestions
    .filter((tag) => tag.toLowerCase().includes(normalizedQuery))
    .slice(0, 8);
}

export function SnippetTagInput({ value, suggestions, onChange, className }: SnippetTagInputProps) {
  const [draftTag, setDraftTag] = useState("");

  const normalizedSuggestions = buildNormalizedSuggestions(suggestions, value);
  const filteredSuggestions = filterSuggestions(normalizedSuggestions, draftTag);
  const normalizedDraftTag = normalizeTag(draftTag);
  const canCreateDraftTag =
    normalizedDraftTag.length > 0 && !includesTag(value, normalizedDraftTag);

  function addTag(rawTag: string) {
    const normalized = normalizeTag(rawTag);
    if (!normalized || includesTag(value, normalized)) {
      setDraftTag("");
      return;
    }

    onChange([...value, normalized]);
    setDraftTag("");
  }

  function removeTag(tagToRemove: string) {
    const normalized = tagToRemove.trim().toLowerCase();
    onChange(value.filter((tag) => tag.trim().toLowerCase() !== normalized));
  }

  function handleDraftTagKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      if (canCreateDraftTag) {
        addTag(draftTag);
      }
    }

    if (event.key === "Backspace" && !draftTag.trim() && value.length > 0) {
      event.preventDefault();
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Selected Tags */}
      {value.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {value.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => removeTag(tag)}
              className="group inline-flex h-6 items-center gap-1 rounded-full bg-[var(--launcher-chip-bg)] px-2 text-[11px] font-medium text-foreground/70 transition-all hover:bg-[var(--launcher-card-selected-bg)] hover:text-foreground/90"
            >
              <span>{tag}</span>
              <X className="size-3 text-foreground/40 transition-colors group-hover:text-foreground/70" />
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <input
        type="text"
        value={draftTag}
        onChange={(event) => setDraftTag(event.target.value)}
        onKeyDown={handleDraftTagKeyDown}
        placeholder="Add tag"
        className={cn(
          "h-10 w-full rounded-xl bg-[var(--launcher-card-hover-bg)] px-3 text-[13px] text-foreground/90 placeholder:text-foreground/30",
          "ring-1 ring-[var(--launcher-card-border)] transition-all duration-200",
          "focus:outline-none focus:ring-[var(--ring)]",
        )}
      />

      {/* Suggestions */}
      {(canCreateDraftTag || filteredSuggestions.length > 0) && (
        <div className="rounded-xl bg-[var(--launcher-card-bg)] ring-1 ring-[var(--launcher-card-border)]">
          {canCreateDraftTag && (
            <button
              type="button"
              onClick={() => addTag(draftTag)}
              className="flex w-full items-center gap-2 rounded-t-xl px-3 py-2 text-[12px] text-foreground/70 transition-colors hover:bg-[var(--launcher-card-hover-bg)] hover:text-foreground/90"
            >
              <Plus className="size-3.5 text-foreground/40" />
              <span className="truncate">Create: {normalizedDraftTag}</span>
            </button>
          )}

          {filteredSuggestions.map((tag, index) => (
            <button
              key={tag}
              type="button"
              onClick={() => addTag(tag)}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-[12px] text-foreground/70 transition-colors hover:bg-[var(--launcher-card-hover-bg)] hover:text-foreground/90",
                index === filteredSuggestions.length - 1 && !canCreateDraftTag && "rounded-b-xl",
                index === 0 && !canCreateDraftTag && "rounded-t-xl",
              )}
            >
              <Check className="size-3.5 text-foreground/40" />
              <span className="truncate">{tag}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
