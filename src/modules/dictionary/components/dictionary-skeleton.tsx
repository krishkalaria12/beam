import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function DictionarySkeleton() {
  return (
    <div className="flex h-full w-full flex-col bg-background">
      {/* Header - matching new style */}
      <div className="flex h-14 items-center gap-3 border-b border-border/40 px-4">
        <Skeleton className="size-8 rounded-full" />
        <Skeleton className="h-9 flex-1 rounded-full" />
      </div>

      {/* Content */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6 space-y-8">
        {/* Word header skeleton */}
        <div className="flex items-end justify-between border-b border-border/40 pb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-48 rounded-md" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>

        {/* Meaning sections */}
        {[1, 2].map((i) => (
          <div key={i} className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-border/40" />
              <Skeleton className="h-3 w-20" />
              <div className="h-px flex-1 bg-border/40" />
            </div>

            {/* Senses skeletons as cards */}
            <div className="grid gap-4">
              {[1, 2].map((j) => (
                <Card key={j} className="border-border/40 bg-muted/5">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Skeleton className="h-5 w-8 rounded" />
                      <div className="flex-1 space-y-3">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-[90%]" />
                        </div>
                        <div className="space-y-1.5 border-l-2 border-primary/10 pl-3">
                          <Skeleton className="h-3 w-[80%] italic" />
                        </div>
                        <div className="flex gap-2">
                          <Skeleton className="h-5 w-16 rounded-full" />
                          <Skeleton className="h-5 w-16 rounded-full" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer - matching new style */}
      <div className="flex h-10 items-center justify-between border-t border-border/40 bg-muted/10 px-4">
        <Skeleton className="h-3 w-32" />
        <div className="flex gap-4">
          <Skeleton className="h-5 w-16 rounded" />
          <Skeleton className="h-5 w-16 rounded" />
          <Skeleton className="h-5 w-16 rounded" />
        </div>
      </div>
    </div>
  );
}
