import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Sense } from "../types";

interface SenseCardProps {
  sense: Sense;
  senseNumber: number;
  entryNumber: number;
  isSelected: boolean;
  onSelect: () => void;
  onSynonymClick: (word: string) => void;
}

export function SenseCard({
  sense,
  senseNumber,
  entryNumber,
  isSelected,
  onSelect,
  onSynonymClick,
}: SenseCardProps) {
  return (
    <div
      data-selected={isSelected}
      onClick={onSelect}
      className={cn(
        "dictionary-sense-card group relative cursor-pointer rounded-xl p-4 transition-all duration-200",
        isSelected
          ? "bg-[var(--launcher-card-selected-bg)] ring-1 ring-[var(--launcher-card-selected-border)]"
          : "bg-[var(--launcher-card-bg)] hover:bg-[var(--launcher-card-hover-bg)]",
      )}
    >
      {/* Left Accent Bar */}
      <div
        className={cn(
          "absolute left-0 top-1/2 h-8 w-0.5 -translate-y-1/2 rounded-full transition-all duration-200",
          isSelected ? "bg-[var(--ring)]" : "bg-transparent",
        )}
      />

      {/* Content */}
      <div className="flex items-start gap-3">
        {/* Sense Number Badge */}
        <span
          className={cn(
            "mt-0.5 flex h-5 shrink-0 items-center justify-center rounded px-1.5 font-mono text-[10px] font-semibold transition-colors duration-200",
            isSelected
              ? "bg-[var(--ring)]/20 text-[var(--ring)]"
              : "bg-[var(--launcher-chip-bg)] text-muted-foreground",
          )}
        >
          {entryNumber}.{senseNumber}
        </span>

        <div className="flex-1 space-y-3">
          {/* Definition */}
          <p
            className={cn(
              "text-[13px] leading-relaxed transition-colors duration-200",
              isSelected ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {sense.definition}
          </p>

          {/* Examples */}
          {sense.examples && sense.examples.length > 0 && (
            <div className="space-y-1.5 border-l-2 border-[var(--launcher-card-border)] pl-3">
              {sense.examples.map((example, idx) => (
                <p key={idx} className="text-[12px] italic text-muted-foreground leading-snug">
                  "{example}"
                </p>
              ))}
            </div>
          )}

          {/* Synonyms & Antonyms */}
          {(sense.synonyms.length > 0 || sense.antonyms.length > 0) && (
            <div className="flex flex-wrap gap-4 pt-1">
              {sense.synonyms.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                    Synonyms
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {sense.synonyms.map((synonym, idx) => (
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        key={idx}
                        onClick={(event) => {
                          event.stopPropagation();
                          onSynonymClick(synonym);
                        }}
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-medium transition-all duration-200",
                          "bg-[var(--icon-green-bg)] text-[var(--icon-green-fg)]",
                          "hover:brightness-110",
                        )}
                      >
                        {synonym}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {sense.antonyms.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                    Antonyms
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {sense.antonyms.map((antonym, idx) => (
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        key={idx}
                        onClick={(event) => {
                          event.stopPropagation();
                          onSynonymClick(antonym);
                        }}
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-medium transition-all duration-200",
                          "bg-[var(--icon-red-bg)] text-[var(--icon-red-fg)]",
                          "hover:brightness-110",
                        )}
                      >
                        {antonym}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
