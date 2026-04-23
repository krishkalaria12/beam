import { CommandLoadingState } from "@/components/command/command-loading-state";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowUpRight,
  Loader2,
  FileText,
  ImageIcon,
  Link,
  Clipboard,
} from "lucide-react";
import { useState } from "react";

import { ClipboardContentType, type ClipboardHistoryEntry } from "../types";
import { isPreviewableImageValue } from "../lib/preview";

interface ClipboardDetailsProps {
  entry: ClipboardHistoryEntry | null;
  copyError: string | null;
  isLoading?: boolean;
}

const getEntryIconConfig = (type: ClipboardContentType) => {
  switch (type) {
    case ClipboardContentType.Image:
      return {
        icon: <ImageIcon className="size-4" />,
        gradient: "bg-[var(--icon-orange-bg)]",
      };
    case ClipboardContentType.Link:
      return {
        icon: <Link className="size-4" />,
        gradient: "bg-[var(--icon-green-bg)]",
      };
    default:
      return {
        icon: <FileText className="size-4" />,
        gradient: "bg-[var(--icon-primary-bg)]",
      };
  }
};

export function ClipboardDetails({
  entry,
  copyError,
  isLoading = false,
}: ClipboardDetailsProps) {
  const previewUrl = entry && isPreviewableImageValue(entry.value) ? entry.value : null;
  const showsImagePreview = previewUrl !== null;

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center border-l border-[var(--launcher-card-border)]">
        <CommandLoadingState label="Loading details..." withSpinner />
      </div>
    );
  }

  if (entry === null) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-[var(--launcher-card-bg)] ring-1 ring-[var(--launcher-card-border)]">
          <Clipboard className="size-7 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="text-launcher-md font-medium tracking-[-0.01em] text-muted-foreground">
            Select an entry
          </p>
          <p className="mt-1 text-launcher-xs text-muted-foreground">
            View details and copy to clipboard
          </p>
        </div>
      </div>
    );
  }

  const copiedAtLabel = formatDistanceToNow(new Date(entry.copied_at), { addSuffix: true });

  const iconConfig = getEntryIconConfig(entry.content_type);

  return (
    <div className="clipboard-details-panel flex min-w-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto p-4 [content-visibility:auto]">
        {showsImagePreview ? (
          <div className="flex h-full w-full items-center justify-center">
            <ClipboardImagePreview key={previewUrl} previewUrl={previewUrl} />
          </div>
        ) : (
          <pre className="w-full self-start whitespace-pre-wrap break-words font-mono text-launcher-sm leading-6 text-foreground">
            {entry.value}
          </pre>
        )}
      </div>

      <div className="shrink-0 border-t border-[var(--ui-divider)] px-5 pt-3 pb-4">
        {copyError && (
          <div className="mb-3 text-launcher-sm font-medium text-[var(--icon-red-fg)]">
            {copyError}
          </div>
        )}

        <div className="grid grid-cols-[104px_minmax(0,1fr)] items-center gap-3 text-launcher-sm">
          <span className="text-muted-foreground">Type</span>
          <span className="flex items-center justify-end gap-2 text-foreground">
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-md bg-[var(--launcher-card-bg)] text-muted-foreground",
                iconConfig.gradient,
              )}
            >
              {iconConfig.icon}
            </span>
            <span className="capitalize">{entry.content_type}</span>
          </span>
        </div>
        <div className="mt-2 grid grid-cols-[104px_minmax(0,1fr)] items-center gap-3 text-launcher-sm">
          <span className="text-muted-foreground">Copied</span>
          <span className="truncate text-right text-foreground">{copiedAtLabel}</span>
        </div>
        {entry.content_type !== ClipboardContentType.Image ? (
          <>
            <div className="mt-2 grid grid-cols-[104px_minmax(0,1fr)] items-center gap-3 text-launcher-sm">
              <span className="text-muted-foreground">Characters</span>
              <span className="truncate text-right text-foreground">
                {entry.character_count.toLocaleString()}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-[104px_minmax(0,1fr)] items-center gap-3 text-launcher-sm">
              <span className="text-muted-foreground">Words</span>
              <span className="truncate text-right text-foreground">
                {entry.word_count.toLocaleString()}
              </span>
            </div>
          </>
        ) : null}
        {entry.content_type === ClipboardContentType.Link ? (
          <div className="mt-2 grid grid-cols-[104px_minmax(0,1fr)] items-center gap-3 text-launcher-sm">
            <span className="text-muted-foreground">Action</span>
            <a
              href={entry.value}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-end gap-1.5 text-[var(--ring)] transition-colors hover:underline"
            >
              Open Link
              <ArrowUpRight className="size-3" />
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ClipboardImagePreview({ previewUrl }: { previewUrl: string }) {
  const [previewStatus, setPreviewStatus] = useState<"idle" | "loaded" | "error">("idle");

  if (previewStatus === "error") {
    return null;
  }

  return (
    <div className="relative max-w-full overflow-hidden rounded-xl ring-1 ring-[var(--launcher-card-border)] shadow-2xl">
      {previewStatus === "idle" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--launcher-card-bg)]/75">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}
      <img
        src={previewUrl}
        alt="Preview"
        loading="lazy"
        decoding="async"
        onLoad={() => setPreviewStatus("loaded")}
        onError={() => setPreviewStatus("error")}
        className={cn(
          "block h-auto max-w-full object-contain transition-opacity duration-150",
          previewStatus === "loaded" ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}
