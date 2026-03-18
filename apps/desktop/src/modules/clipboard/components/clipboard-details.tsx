import { CommandLoadingState } from "@/components/command/command-loading-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowUpRight,
  Loader2,
  Check,
  Clock,
  Copy,
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
  isCopied: boolean;
  copyError: string | null;
  onCopy: () => void;
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
  isCopied,
  copyError,
  onCopy,
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
          <p className="text-[13px] font-medium tracking-[-0.01em] text-muted-foreground">
            Select an entry
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            View details and copy to clipboard
          </p>
        </div>
      </div>
    );
  }

  const isImageEntry = entry.content_type === ClipboardContentType.Image;
  const copiedAtLabel = formatDistanceToNow(new Date(entry.copied_at), { addSuffix: true });

  const iconConfig = getEntryIconConfig(entry.content_type);

  return (
    <div className="clipboard-details-panel flex flex-1 flex-col min-w-0 h-full">
      {/* Content Preview - Scrollable */}
      <div className="flex-1 overflow-y-auto p-6 [content-visibility:auto]">
        {showsImagePreview ? (
          <div className="flex w-full justify-center">
            <ClipboardImagePreview key={previewUrl} previewUrl={previewUrl} />
          </div>
        ) : (
          <div className="w-full text-[14px] font-normal leading-relaxed tracking-[-0.01em] text-muted-foreground whitespace-pre-wrap break-words">
            {entry.value}
          </div>
        )}
      </div>

      {/* Info Section - Fixed at bottom */}
      <div className="shrink-0 border-t border-[var(--launcher-card-border)] bg-[var(--launcher-card-hover-bg)] p-5">
        {/* Copy Button & Status */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex size-8 items-center justify-center rounded-lg bg-[var(--launcher-card-bg)] text-muted-foreground",
                iconConfig.gradient,
              )}
            >
              {iconConfig.icon}
            </div>
            <div>
              <p className="text-[12px] font-semibold text-muted-foreground capitalize">
                {entry.content_type}
              </p>
              <p className="text-[11px] text-muted-foreground">{copiedAtLabel}</p>
            </div>
          </div>

          <Button
            onClick={onCopy}
            variant="ghost"
            size="sm"
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium transition-all duration-200",
              isCopied
                ? "bg-[var(--icon-green-bg)] text-[var(--icon-green-fg)] ring-1 ring-[var(--icon-green-bg)]"
                : "bg-[var(--ring)]/15 text-[var(--ring)] ring-1 ring-[var(--ring)]/20 hover:bg-[var(--ring)]/25",
            )}
          >
            {isCopied ? (
              <>
                <Check className="size-3.5" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                <span>Copy</span>
              </>
            )}
          </Button>
        </div>

        {/* Status Messages */}
        {copyError && (
          <div className="mb-4 rounded-lg bg-[var(--icon-red-bg)] px-3 py-2 text-[11px] font-medium text-[var(--icon-red-fg)] ring-1 ring-[var(--icon-red-bg)]">
            {copyError}
          </div>
        )}

        {/* Metadata Grid */}
        <div className="space-y-3">
          {/* Divider with label */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Details
            </span>
            <div className="h-px flex-1 bg-[var(--launcher-card-hover-bg)]" />
          </div>

          {/* Metadata rows */}
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-muted-foreground">Copied</span>
              <span className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
                <Clock className="size-3 text-muted-foreground" />
                {copiedAtLabel}
              </span>
            </div>

            {entry.content_type !== ClipboardContentType.Image && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-muted-foreground">Characters</span>
                  <span className="text-[12px] font-mono font-medium text-muted-foreground">
                    {entry.character_count.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-muted-foreground">Words</span>
                  <span className="text-[12px] font-mono font-medium text-muted-foreground">
                    {entry.word_count.toLocaleString()}
                  </span>
                </div>
              </>
            )}

            {entry.content_type === ClipboardContentType.Link && (
              <div className="flex items-center justify-between pt-2 border-t border-[var(--launcher-card-border)]">
                <span className="text-[12px] text-muted-foreground">Action</span>
                <a
                  href={entry.value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--ring)] hover:underline transition-colors"
                >
                  Open Link
                  <ArrowUpRight className="size-3" />
                </a>
              </div>
            )}
          </div>
        </div>
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
