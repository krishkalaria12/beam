import { useCommandState } from "cmdk";
import { ArrowRightLeft } from "lucide-react";

import { BaseCommandRow } from "@/components/command/base-command-row";
import { CommandIcon } from "@/components/icons/command-icon";
import { CommandGroup, CommandShortcut } from "@/components/ui/command";
import { LauncherTakeoverSurface } from "@/modules/launcher/components/launcher-takeover-surface";
import {
  extractCommandKeywordRemainder,
  matchesCommandKeywords,
  normalizeCommandQuery,
} from "@/modules/launcher/lib/command-query";

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
] as const;

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
      <LauncherTakeoverSurface>
        <TranslationView initialQuery={trimmedQuery} onBack={onBack} />
      </LauncherTakeoverSurface>
    );
  }

  const normalizedQuery = normalizeCommandQuery(queryOverride ?? searchInput);
  if (!matchesCommandKeywords(normalizedQuery, TRANSLATION_KEYWORDS)) {
    return null;
  }

  return (
    <CommandGroup>
      <BaseCommandRow
        value="translate translation language convert text"
        onSelect={() => onOpen(extractCommandKeywordRemainder(queryOverride ?? searchInput, TRANSLATION_KEYWORDS))}
        icon={<CommandIcon icon="translation" />}
        title="Translate text"
        titleClassName="truncate text-foreground capitalize"
        endSlot={(
          <div className="ml-auto flex items-center gap-2">
            <ArrowRightLeft className="size-3.5 text-muted-foreground/60" />
            <CommandShortcut>translate</CommandShortcut>
          </div>
        )}
      />
    </CommandGroup>
  );
}
