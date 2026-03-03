import { ArrowLeft, Search } from "lucide-react";

export function DictionarySkeleton() {
  return (
    <div className="dictionary-view-enter flex h-full w-full flex-col text-foreground">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--launcher-card-border)] px-4">
        <div className="flex size-9 items-center justify-center rounded-lg bg-[var(--launcher-card-hover-bg)]">
          <ArrowLeft className="size-4 text-foreground/20" />
        </div>

        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-foreground/20" />
          <div className="h-10 w-full animate-pulse rounded-xl bg-[var(--launcher-card-hover-bg)]" />
        </div>
      </header>

      {/* Content */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5 space-y-6">
        {/* Word header skeleton */}
        <div className="flex items-end justify-between pb-3">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-8 w-32 animate-pulse rounded-lg bg-[var(--launcher-card-hover-bg)]" />
              <div className="h-5 w-12 animate-pulse rounded-full bg-[var(--launcher-card-hover-bg)]" />
            </div>
            <div className="h-4 w-24 animate-pulse rounded bg-[var(--launcher-card-hover-bg)]" />
          </div>
          <div className="h-8 w-24 animate-pulse rounded-lg bg-[var(--launcher-card-hover-bg)]" />
        </div>

        {/* Meaning sections */}
        {[1, 2].map((i) => (
          <div key={i} className="space-y-4" style={{ animationDelay: `${i * 100}ms` }}>
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-[var(--launcher-card-hover-bg)]" />
              <div className="h-3 w-16 animate-pulse rounded bg-[var(--launcher-card-hover-bg)]" />
              <div className="h-px flex-1 bg-[var(--launcher-card-hover-bg)]" />
            </div>

            {/* Senses skeletons */}
            <div className="grid gap-3">
              {[1, 2].map((j) => (
                <div
                  key={j}
                  className="rounded-xl bg-[var(--launcher-card-hover-bg)] p-4"
                  style={{ animationDelay: `${(i * 2 + j) * 50}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <div className="h-5 w-8 animate-pulse rounded bg-[var(--launcher-card-hover-bg)]" />
                    <div className="flex-1 space-y-3">
                      <div className="space-y-2">
                        <div className="h-4 w-full animate-pulse rounded bg-[var(--launcher-card-hover-bg)]" />
                        <div className="h-4 w-[85%] animate-pulse rounded bg-[var(--launcher-card-hover-bg)]" />
                      </div>
                      <div className="space-y-1.5 border-l-2 border-[var(--launcher-card-border)] pl-3">
                        <div className="h-3 w-[70%] animate-pulse rounded bg-[var(--launcher-card-hover-bg)]" />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <div className="h-5 w-14 animate-pulse rounded-full bg-[var(--launcher-card-hover-bg)]" />
                        <div className="h-5 w-16 animate-pulse rounded-full bg-[var(--launcher-card-hover-bg)]" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="flex h-12 shrink-0 items-center justify-between border-t border-[var(--launcher-card-border)] px-4">
        <div className="h-4 w-28 animate-pulse rounded bg-[var(--launcher-card-hover-bg)]" />
        <div className="flex gap-4">
          <div className="h-5 w-14 animate-pulse rounded bg-[var(--launcher-card-hover-bg)]" />
          <div className="h-5 w-14 animate-pulse rounded bg-[var(--launcher-card-hover-bg)]" />
          <div className="h-5 w-14 animate-pulse rounded bg-[var(--launcher-card-hover-bg)]" />
        </div>
      </footer>
    </div>
  );
}
