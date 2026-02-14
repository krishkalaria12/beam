import { Skeleton } from "@/components/ui/skeleton";

export function EmojiPickerLoading() {
  return (
    <div className="flex h-full flex-col">
      {/* Header - matches SearchBar height */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-accent px-3 py-2">
        <Skeleton className="size-8 rounded-md" />
        <Skeleton className="h-9 flex-1 rounded-md" />
        <Skeleton className="h-9 w-[100px] rounded-md" />
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto bg-background p-3">
        <div className="space-y-5">
          {/* Recent section */}
          <div>
            <div className="mb-2 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <Skeleton className="h-3 w-16 rounded" />
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="grid grid-cols-8 gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={`recent-${i}`} className="aspect-square rounded-xl" />
              ))}
            </div>
          </div>

          {/* Category sections - matching actual emoji grid */}
          {Array.from({ length: 5 }).map((_, sectionIdx) => (
            <div key={sectionIdx}>
              <div className="mb-2 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <Skeleton className="h-3 w-14 rounded" />
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid grid-cols-8 gap-2">
                {Array.from({ length: 16 }).map((_, i) => (
                  <Skeleton key={`emoji-${sectionIdx}-${i}`} className="aspect-square rounded-xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
