import { useCommandState } from "cmdk";
import { ArrowRightLeft, Languages } from "lucide-react";

import { CommandGroup, CommandItem, CommandShortcut } from "@/components/ui/command";

import { TranslationView } from "./translation-view";

interface TranslationCommandGroupProps {
  isOpen: boolean;
  onOpen: (query: string) => void;
  onBack: () => void;
  query?: string;
  queryOverride?: string;
}

const TRANSLATION_KEYWORDS = [
  "translate",
  "translation",
  "language",
  "convert text",
];

function matchesTranslationQuery(query: string) {
  if (query.length === 0) {
    return true;
  }

  return TRANSLATION_KEYWORDS.some(
    (keyword) => keyword.includes(query) || query.includes(keyword),
  );
}

function getInitialTextFromQuery(rawQuery: string) {
  const trimmedQuery = rawQuery.trim();
  if (!trimmedQuery) {
    return "";
  }

  const normalizedQuery = trimmedQuery.toLowerCase();
  const sortedKeywords = [...TRANSLATION_KEYWORDS].sort(
    (left, right) => right.length - left.length,
  );

  for (const keyword of sortedKeywords) {
    if (normalizedQuery === keyword) {
      return "";
    }

    if (normalizedQuery.startsWith(`${keyword} `)) {
      return trimmedQuery.slice(keyword.length).trimStart();
    }
  }

  return trimmedQuery;
}

export default function TranslationCommandGroup({
  isOpen,
  onOpen,
  onBack,
  query,
  queryOverride,
}: TranslationCommandGroupProps) {
  const searchInput = useCommandState((state) => state.search);

  if (isOpen) {
    const trimmedQuery = query?.trim() ?? "";
    return (
      <div className="absolute inset-0 z-50 bg-background">
        <TranslationView initialQuery={trimmedQuery} onBack={onBack} />
      </div>
    );
  }

  const normalizedQuery = (queryOverride ?? searchInput).trim().toLowerCase();
  if (!matchesTranslationQuery(normalizedQuery)) {
    return null;
  }

  return (
    <CommandGroup>
      <CommandItem
        value="translate translation language convert text"
        onSelect={() => onOpen(getInitialTextFromQuery(queryOverride ?? searchInput))}
      >
        <div className="flex size-6 items-center justify-center rounded-sm bg-primary/10 text-primary">
          <Languages className="size-4" />
        </div>
        <p className="truncate text-foreground capitalize">Translate text</p>
        <div className="ml-auto flex items-center gap-2">
          <ArrowRightLeft className="size-3.5 text-muted-foreground/60" />
          <CommandShortcut>translate</CommandShortcut>
        </div>
      </CommandItem>
    </CommandGroup>
  );
}
