import { cn } from "@/lib/utils";
import type { Sense } from "../types";

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
    <div
      data-selected={isSelected}
      className={cn(
        "dictionary-sense-card group relative rounded-xl p-4 transition-all duration-200",
        isSelected
          ? "bg-white/[0.05] ring-1 ring-white/20"
          : "bg-white/[0.02] hover:bg-white/[0.04]",
      )}
    >
      {/* Left Accent Bar */}
      <div
        className={cn(
          "absolute left-0 top-1/2 h-8 w-0.5 -translate-y-1/2 rounded-full transition-all duration-200",
          isSelected
            ? "bg-[var(--solid-accent,#4ea2ff)]"
            : "bg-transparent group-hover:bg-white/15",
        )}
      />

      {/* Content */}
      <div className="flex items-start gap-3">
        {/* Sense Number Badge */}
        <span
          className={cn(
            "mt-0.5 flex h-5 shrink-0 items-center justify-center rounded px-1.5 font-mono text-[10px] font-semibold transition-colors duration-200",
            isSelected
              ? "bg-[var(--solid-accent,#4ea2ff)]/20 text-[var(--solid-accent,#4ea2ff)]"
              : "bg-white/[0.06] text-white/40",
          )}
        >
          {entryNumber}.{senseNumber}
        </span>

        <div className="flex-1 space-y-3">
          {/* Definition */}
          <p
            className={cn(
              "text-[13px] leading-relaxed transition-colors duration-200",
              isSelected ? "text-white/90" : "text-white/70",
            )}
          >
            {sense.definition}
          </p>

          {/* Examples */}
          {sense.examples && sense.examples.length > 0 && (
            <div className="space-y-1.5 border-l-2 border-white/10 pl-3">
              {sense.examples.map((example, idx) => (
                <p key={idx} className="text-[12px] italic text-white/40 leading-snug">
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
                  <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-white/30">
                    Synonyms
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {sense.synonyms.map((synonym, idx) => (
                      <button
                        key={idx}
                        onClick={() => onSynonymClick(synonym)}
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-medium transition-all duration-200",
                          "bg-emerald-500/10 text-emerald-400/80 hover:bg-emerald-500/20 hover:text-emerald-400",
                        )}
                      >
                        {synonym}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {sense.antonyms.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-white/30">
                    Antonyms
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {sense.antonyms.map((antonym, idx) => (
                      <button
                        key={idx}
                        onClick={() => onSynonymClick(antonym)}
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-medium transition-all duration-200",
                          "bg-rose-500/10 text-rose-400/80 hover:bg-rose-500/20 hover:text-rose-400",
                        )}
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
    </div>
  );
}
