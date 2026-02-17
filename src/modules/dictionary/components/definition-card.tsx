import { cn } from "@/lib/utils";
import type { Sense } from "../types";
import { Card, CardContent } from "@/components/ui/card";

interface SenseCardProps {
  sense: Sense;
  senseNumber: number;
  entryNumber: number;
  isSelected: boolean;
  onSynonymClick: (word: string) => void;
}

export function SenseCard({
  sense,
  senseNumber,
  entryNumber,
  isSelected,
  onSynonymClick,
}: SenseCardProps) {
  return (
    <Card
      data-selected={isSelected}
      className={cn(
        "transition-all duration-200 ease-in-out scroll-mt-20",
        isSelected
          ? "border-primary/50 bg-primary/5 shadow-sm ring-1 ring-primary/20"
          : "border-border/40 bg-muted/5 hover:bg-muted/10"
      )}
    >
      <CardContent className="p-4">
        {/* Sense Number and Definition */}
        <div className="flex items-start gap-4">
          <span className="mt-0.5 flex h-5 w-8 shrink-0 items-center justify-center rounded bg-primary/10 font-mono text-[10px] font-bold tracking-tighter text-primary">
            {entryNumber}.{senseNumber}
          </span>
          <div className="flex-1 space-y-3">
            <p className="text-sm font-medium leading-relaxed text-foreground/90">
              {sense.definition}
            </p>

            {/* Examples */}
            {sense.examples && sense.examples.length > 0 && (
              <div className="space-y-1.5 border-l-2 border-primary/20 pl-3">
                {sense.examples.map((example, idx) => (
                  <p key={idx} className="text-xs italic text-muted-foreground/80 leading-snug">
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
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                      Synonyms
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {sense.synonyms.map((synonym, idx) => (
                        <button
                          key={idx}
                          onClick={() => onSynonymClick(synonym)}
                          className="rounded-full bg-accent/50 px-2 py-0.5 text-[10px] font-medium text-accent-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                        >
                          {synonym}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {sense.antonyms.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                      Antonyms
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {sense.antonyms.map((antonym, idx) => (
                        <button
                          key={idx}
                          onClick={() => onSynonymClick(antonym)}
                          className="rounded-full bg-muted/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-foreground hover:text-background"
                        >
                          {antonym}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
