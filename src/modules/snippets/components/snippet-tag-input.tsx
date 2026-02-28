import { Check, Plus, X } from "lucide-react";
import { useState, type KeyboardEvent } from "react";

import { Button } from "@/components/ui/button";
import { Command, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
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
      <div className="flex flex-wrap items-center gap-1.5">
        {value.map((tag) => (
          <Button
            key={tag}
            type="button"
            size="xs"
            variant="secondary"
            className="h-6 gap-1 rounded-full px-2"
            onClick={() => {
              removeTag(tag);
            }}
          >
            <span>{tag}</span>
            <X className="size-3" />
          </Button>
        ))}
      </div>

      <Input
        value={draftTag}
        onChange={(event) => {
          setDraftTag(event.target.value);
        }}
        onKeyDown={handleDraftTagKeyDown}
        placeholder="Add tag"
        className="h-9"
      />

      <Command className="rounded-none border border-border/60 bg-background/25">
        <CommandList className="max-h-32">
          {canCreateDraftTag ? (
            <CommandItem
              value={`create-${draftTag}`}
              onSelect={() => {
                addTag(draftTag);
              }}
              className="gap-2 px-2 py-2 text-xs"
            >
              <Plus className="size-3.5 text-muted-foreground" />
              <span className="truncate">Create: {normalizedDraftTag}</span>
            </CommandItem>
          ) : null}

          {filteredSuggestions.map((tag) => (
            <CommandItem
              key={tag}
              value={tag}
              onSelect={() => {
                addTag(tag);
              }}
              className="gap-2 px-2 py-2 text-xs"
            >
              <Check className="size-3.5 text-muted-foreground" />
              <span className="truncate">{tag}</span>
            </CommandItem>
          ))}
        </CommandList>
      </Command>
    </div>
  );
}
