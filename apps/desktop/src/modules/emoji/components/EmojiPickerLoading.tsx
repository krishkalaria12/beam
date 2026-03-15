import { Skeleton } from "@/components/ui/skeleton";

export function EmojiPickerLoading() {
  return (
    <div className="flex h-full flex-col">
      {/* Header skeleton */}
      <div className="flex h-14 items-center gap-3 border-b border-[var(--launcher-card-border)] px-4">
        <Skeleton className="size-9 rounded-lg bg-[var(--launcher-card-hover-bg)]" />
        <Skeleton className="h-10 flex-1 rounded-xl bg-[var(--launcher-card-hover-bg)]" />
        <Skeleton className="h-10 w-[130px] rounded-xl bg-[var(--launcher-card-hover-bg)]" />
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-6">
          {/* Recent section skeleton */}
          <div>
            <div className="mb-4 flex items-center gap-4 py-1">
              <div className="h-px flex-1 bg-[var(--launcher-card-hover-bg)]" />
              <Skeleton className="h-3 w-20 rounded bg-[var(--launcher-card-hover-bg)]" />
              <div className="h-px flex-1 bg-[var(--launcher-card-hover-bg)]" />
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(3.25rem,1fr))] gap-2 px-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton
                  key={`recent-${i}`}
                  className="aspect-square rounded-xl bg-[var(--launcher-card-hover-bg)]"
                  style={{ animationDelay: `${i * 50}ms` }}
                />
              ))}
            </div>
          </div>

          {/* Category sections skeleton */}
          {Array.from({ length: 4 }).map((_, sectionIdx) => (
            <div key={sectionIdx} style={{ animationDelay: `${(sectionIdx + 1) * 100}ms` }}>
              <div className="mb-4 flex items-center gap-4 py-1">
                <div className="h-px flex-1 bg-[var(--launcher-card-hover-bg)]" />
                <Skeleton className="h-3 w-16 rounded bg-[var(--launcher-card-hover-bg)]" />
                <div className="h-px flex-1 bg-[var(--launcher-card-hover-bg)]" />
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(3.25rem,1fr))] gap-2 px-1">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton
                    key={`emoji-${sectionIdx}-${i}`}
                    className="aspect-square rounded-xl bg-[var(--launcher-card-hover-bg)]"
                    style={{ animationDelay: `${sectionIdx * 100 + i * 30}ms` }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer skeleton */}
      <div className="flex h-12 items-center justify-between border-t border-[var(--launcher-card-border)] px-4">
        <Skeleton className="h-3 w-24 rounded bg-[var(--launcher-card-hover-bg)]" />
        <div className="flex items-center gap-2">
          <Skeleton className="size-5 rounded bg-[var(--launcher-card-hover-bg)]" />
          <Skeleton className="h-3 w-12 rounded bg-[var(--launcher-card-hover-bg)]" />
        </div>
      </div>
    </div>
  );
}
